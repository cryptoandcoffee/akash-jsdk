import WebSocket from 'isomorphic-ws'
import {
  AkashEvent,
  EventCallback,
  EventSubscription,
  EventFilter,
  TendermintEvent,
  WebSocketMessage,
  ConnectionState,
  EventStreamConfig,
  DeploymentEvent,
  OrderEvent,
  BidEvent,
  LeaseEvent,
  Logger
} from './types'
import { NetworkError, EventStreamError } from '../errors'
import { getEventAttributes } from '../utils/event-parsing'
import { createDefaultLogger } from '../utils/logger'
import {
  validateWebSocketUrl,
  validateTendermintQuery,
  validateCallback
} from'../utils/validation'
import {
  DEFAULT_MAX_RECONNECT_ATTEMPTS,
  DEFAULT_RECONNECT_BASE_DELAY,
  DEFAULT_MAX_RECONNECT_DELAY,
  DEFAULT_HEARTBEAT_INTERVAL,
  DEFAULT_HEARTBEAT_TIMEOUT,
  EXPONENTIAL_BACKOFF_BASE,
  JSONRPC_VERSION,
  WEBSOCKET_PATH_SUFFIX,
  DECIMAL_RADIX,
  SUBSCRIPTION_ID_RANDOM_LENGTH,
  RANDOM_ID_BASE,
  RANDOM_ID_SUBSTRING_START
} from './constants'

export class EventStreamManager {
  private ws: WebSocket | null = null
  private subscriptions = new Map<string, EventSubscription>()
  private reconnectAttempts = 0
  private maxReconnectAttempts: number
  private reconnectBaseDelay: number
  private maxReconnectDelay: number
  private heartbeatInterval: number
  private heartbeatTimeout: number
  private heartbeatTimer: NodeJS.Timeout | null = null
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED
  private rpcEndpoint: string
  private pendingPings = new Set<string>()
  private reconnectTimer: NodeJS.Timeout | null = null
  private config: EventStreamConfig
  private logger: Logger
  private maxSubscriptions: number

  // Event handler references for proper cleanup
  private wsOpenHandler: ((event: any) => void) | null = null
  private wsMessageHandler: ((event: any) => void) | null = null
  private wsCloseHandler: ((event: any) => void) | null = null
  private wsErrorHandler: ((event: any) => void) | null = null

  constructor(config: EventStreamConfig) {
    this.config = config
    this.rpcEndpoint = config.rpcEndpoint
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS
    this.reconnectBaseDelay = config.reconnectBaseDelay ?? DEFAULT_RECONNECT_BASE_DELAY
    this.maxReconnectDelay = config.maxReconnectDelay ?? DEFAULT_MAX_RECONNECT_DELAY
    this.heartbeatInterval = config.heartbeatInterval ?? DEFAULT_HEARTBEAT_INTERVAL
    this.heartbeatTimeout = config.heartbeatTimeout ?? DEFAULT_HEARTBEAT_TIMEOUT
    this.maxSubscriptions = config.maxSubscriptions ?? 100
    this.logger = config.logger ?? createDefaultLogger()
  }

  /**
   * Connect to Tendermint WebSocket endpoint
   */
  async connect(): Promise<void> {
    if (this.connectionState === ConnectionState.CONNECTED) {
    validateWebSocketUrl(this.rpcEndpoint)

      return
    }

    this.connectionState = ConnectionState.CONNECTING
    this.config.onConnectionStateChange?.(ConnectionState.CONNECTING)
    const wsUrl = this.rpcEndpoint.replace(/^http/, 'ws') + WEBSOCKET_PATH_SUFFIX

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl)
        this.setupWebSocketHandlers()

        this.wsOpenHandler = () => {
          this.connectionState = ConnectionState.CONNECTED
          this.config.onConnectionStateChange?.(ConnectionState.CONNECTED)
          this.reconnectAttempts = 0
          this.startHeartbeat()

          // Resubscribe to all existing subscriptions
          this.resubscribeAll()

          resolve()
        }

        this.wsMessageHandler = (event: any) => {
          this.handleMessage(event.data)
        }

        this.wsCloseHandler = () => {
          this.handleClose()
        }

        this.wsErrorHandler = (error: any) => {
          this.logger.error('WebSocket error', { error })
          if (this.connectionState === ConnectionState.CONNECTING) {
            this.connectionState = ConnectionState.DISCONNECTED
            this.config.onConnectionStateChange?.(ConnectionState.DISCONNECTED)
            reject(new NetworkError('Failed to connect to WebSocket', { error }))
          }
        }

        if (this.ws) {
          this.ws.onopen = this.wsOpenHandler
          this.ws.onmessage = this.wsMessageHandler
          this.ws.onclose = this.wsCloseHandler
          this.ws.onerror = this.wsErrorHandler
        }
      } catch (error) {
        this.connectionState = ConnectionState.FAILED
        this.config.onConnectionStateChange?.(ConnectionState.FAILED)
        reject(new NetworkError('Failed to create WebSocket connection', { error }))
      }
    })
  }

  /**
   * Subscribe to blockchain events
   * @param query Tendermint query string (e.g., "tm.event='Tx' AND message.module='deployment'")
   * @param callback Function to call when events are received
   * @param filter Optional filter to apply to events
   * @returns Subscription ID
   */
  subscribe(query: string, callback: EventCallback, filter?: EventFilter): string {
    validateTendermintQuery(query)
    validateCallback(callback, 'Callback function')

    // Validate subscription limit
    if (this.subscriptions.size >= this.maxSubscriptions) {
      throw new EventStreamError(
        `Maximum subscriptions reached: ${this.maxSubscriptions}`,
        { currentCount: this.subscriptions.size }
      )
    }

    const id = `sub_${Date.now()}_${Math.random().toString(RANDOM_ID_BASE).substring(RANDOM_ID_SUBSTRING_START, RANDOM_ID_SUBSTRING_START + SUBSCRIPTION_ID_RANDOM_LENGTH)}`

    const subscription: EventSubscription = {
      id,
      query,
      callback,
      filter
    }

    this.subscriptions.set(id, subscription)

    // Send subscription message if connected
    if (this.connectionState === ConnectionState.CONNECTED && this.ws) {
      this.sendSubscription(subscription)
    }

    return id
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) {
      return
    }

    // Send unsubscribe message if connected
    if (this.connectionState === ConnectionState.CONNECTED && this.ws) {
      const unsubscribeMsg: WebSocketMessage = {
        jsonrpc: JSONRPC_VERSION,
        method: 'unsubscribe',
        id: subscriptionId,
        params: { query: subscription.query }
      }

      this.ws.send(JSON.stringify(unsubscribeMsg))
    }

    this.subscriptions.delete(subscriptionId)
  }

  /**
   * Disconnect from WebSocket and clean up all resources
   */
  disconnect(): void {
    this.logger.debug('Disconnecting event stream')

    // Stop heartbeat first
    this.stopHeartbeat()

    // Clear reconnection timer
    this.clearReconnectTimer()

    // Clear all pending operations
    this.pendingPings.clear()

    // Clean up WebSocket
    if (this.ws) {
      // Remove all event handlers before closing
      this.removeWebSocketHandlers()

      // Close if still open
      if (this.ws.readyState === WebSocket.OPEN ||
          this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close()
      }

      this.ws = null
    }

    // Clear subscriptions
    this.subscriptions.clear()

    // Update state
    this.connectionState = ConnectionState.DISCONNECTED
    this.config.onConnectionStateChange?.(ConnectionState.DISCONNECTED)

    // Reset reconnection state
    this.reconnectAttempts = 0

    this.logger.debug('Event stream disconnected and cleaned up')
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * Get number of active subscriptions
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED
  }

  private sendSubscription(subscription: EventSubscription): void {
    if (!this.ws) {
      return
    }

    const subscribeMsg: WebSocketMessage = {
      jsonrpc: JSONRPC_VERSION,
      method: 'subscribe',
      id: subscription.id,
      params: { query: subscription.query }
    }

    this.ws.send(JSON.stringify(subscribeMsg))
  }

  private resubscribeAll(): void {
    for (const subscription of this.subscriptions.values()) {
      this.sendSubscription(subscription)
    }
  }

  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data)

      // Handle pong responses
      if (message.id && this.pendingPings.has(message.id)) {
        this.pendingPings.delete(message.id)
        this.resetHeartbeatTimeout()
        return
      }

      // Handle subscription responses
      if (message.result !== undefined) {
        return
      }

      // Handle event notifications
      if (message.params) {
        this.handleEvent(message.params as any)
      }
    } catch (error) {
      this.logger.error('Failed to parse WebSocket message', { error })
    }
  }

  private handleEvent(tmEvent: TendermintEvent): void {
    // Parse Tendermint event into Akash event
    const akashEvent = this.parseEvent(tmEvent)
    if (!akashEvent) {
      return
    }

    // Dispatch to matching subscriptions
    for (const subscription of this.subscriptions.values()) {
      if (this.matchesFilter(akashEvent, subscription.filter)) {
        try {
          subscription.callback(akashEvent)
        } catch (error) {
          this.logger.error('Error in event callback', { error })
        }
      }
    }
  }

  private parseEvent(tmEvent: TendermintEvent): AkashEvent | null {
    try {
      const txResult = tmEvent.data?.value?.TxResult
      if (!txResult) {
        return null
      }

      const height = parseInt(txResult.height, DECIMAL_RADIX)
      const events = txResult.result?.events || []

      // Find message events
      const messageEvent = events.find(e => e.type === 'message')
      if (!messageEvent) {
        return null
      }

      const getAttr = (attrs: any[], key: string): string | undefined => {
        const attr = attrs.find(a => Buffer.from(a.key, 'base64').toString() === key)
        return attr ? Buffer.from(attr.value, 'base64').toString() : undefined
      }

      const module = getAttr(messageEvent.attributes, 'module')
      const action = getAttr(messageEvent.attributes, 'action')

      if (!module || !action) {
        return null
      }

      // Parse deployment events
      if (module === 'deployment') {
        const deploymentEvent = events.find(e => e.type.includes('deployment'))
        if (deploymentEvent) {
          return this.parseDeploymentEvent(deploymentEvent, action, height)
        }
      }

      // Parse order events
      if (module === 'market' && action.includes('order')) {
        const orderEvent = events.find(e => e.type.includes('order'))
        if (orderEvent) {
          return this.parseOrderEvent(orderEvent, action, height)
        }
      }

      // Parse bid events
      if (module === 'market' && action.includes('bid')) {
        const bidEvent = events.find(e => e.type.includes('bid'))
        if (bidEvent) {
          return this.parseBidEvent(bidEvent, action, height)
        }
      }

      // Parse lease events
      if (module === 'market' && action.includes('lease')) {
        const leaseEvent = events.find(e => e.type.includes('lease'))
        if (leaseEvent) {
          return this.parseLeaseEvent(leaseEvent, action, height)
        }
      }

      return null
    } catch (error) {
      this.logger.error('Failed to parse event', { error })
      return null
    }
  }

  private parseDeploymentEvent(event: any, action: string, height: number): DeploymentEvent | null {
    const attrs = getEventAttributes(event, ['owner', 'dseq', 'version', 'state'])

    if (!attrs.owner || !attrs.dseq) {
      return null
    }

    let type: DeploymentEvent['type'] = 'deployment.created'
    if (action.includes('update')) {
      type = 'deployment.updated'
    } else if (action.includes('close')) {
      type = 'deployment.closed'
    }

    return {
      type,
      height,
      owner: attrs.owner,
      dseq: attrs.dseq,
      version: attrs.version || undefined,
      state: attrs.state as any,
      timestamp: Date.now()
    }
  }

  private parseOrderEvent(event: any, action: string, height: number): OrderEvent | null {
    const attrs = getEventAttributes(event, ['owner', 'dseq', 'gseq', 'oseq', 'state'])

    if (!attrs.owner || !attrs.dseq || !attrs.gseq || !attrs.oseq) {
      return null
    }

    const type: OrderEvent['type'] = action.includes('close') ? 'order.closed' : 'order.created'

    return {
      type,
      height,
      owner: attrs.owner,
      dseq: attrs.dseq,
      gseq: parseInt(attrs.gseq, DECIMAL_RADIX),
      oseq: parseInt(attrs.oseq, DECIMAL_RADIX),
      state: attrs.state as any,
      timestamp: Date.now()
    }
  }

  private parseBidEvent(event: any, action: string, height: number): BidEvent | null {
    const attrs = getEventAttributes(event, ['owner', 'dseq', 'gseq', 'oseq', 'provider', 'price-amount', 'price-denom', 'state'])

    if (!attrs.owner || !attrs.dseq || !attrs.gseq || !attrs.oseq || !attrs.provider) {
      return null
    }

    const type: BidEvent['type'] = action.includes('close') ? 'bid.closed' : 'bid.created'

    return {
      type,
      height,
      owner: attrs.owner,
      dseq: attrs.dseq,
      gseq: parseInt(attrs.gseq, DECIMAL_RADIX),
      oseq: parseInt(attrs.oseq, DECIMAL_RADIX),
      provider: attrs.provider,
      price: attrs['price-amount'] && attrs['price-denom'] ? { amount: attrs['price-amount'], denom: attrs['price-denom'] } : undefined,
      state: attrs.state as any,
      timestamp: Date.now()
    }
  }

  private parseLeaseEvent(event: any, action: string, height: number): LeaseEvent | null {
    const attrs = getEventAttributes(event, ['owner', 'dseq', 'gseq', 'oseq', 'provider', 'price-amount', 'price-denom', 'state', 'close-reason'])

    if (!attrs.owner || !attrs.dseq || !attrs.gseq || !attrs.oseq || !attrs.provider) {
      return null
    }

    const type: LeaseEvent['type'] = action.includes('close') ? 'lease.closed' : 'lease.created'

    return {
      type,
      height,
      owner: attrs.owner,
      dseq: attrs.dseq,
      gseq: parseInt(attrs.gseq, DECIMAL_RADIX),
      oseq: parseInt(attrs.oseq, DECIMAL_RADIX),
      provider: attrs.provider,
      price: attrs['price-amount'] && attrs['price-denom'] ? { amount: attrs['price-amount'], denom: attrs['price-denom'] } : undefined,
      state: attrs.state as any,
      closeReason: attrs['close-reason'] || undefined,
      timestamp: Date.now()
    }
  }

  private matchesFilter(event: AkashEvent, filter?: EventFilter): boolean {
    if (!filter) {
      return true
    }

    if (filter.types && !filter.types.includes(event.type)) {
      return false
    }

    if (filter.owner && 'owner' in event && event.owner !== filter.owner) {
      return false
    }

    if (filter.provider && 'provider' in event && event.provider !== filter.provider) {
      return false
    }

    if (filter.dseq && 'dseq' in event && event.dseq !== filter.dseq) {
      return false
    }

    return true
  }

  private handleClose(): void {
    this.stopHeartbeat()

    if (this.connectionState === ConnectionState.DISCONNECTED) {
      return
    }

    this.connectionState = ConnectionState.RECONNECTING
    this.handleReconnect()
  }

  private async handleReconnect(): Promise<void> {
    // Clear any existing reconnect timer
    this.clearReconnectTimer()

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.connectionState = ConnectionState.FAILED
      this.config.onConnectionStateChange?.(ConnectionState.FAILED)
      this.logger.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    this.connectionState = ConnectionState.RECONNECTING
    this.config.onConnectionStateChange?.(ConnectionState.RECONNECTING)

    const delay = Math.min(
      this.reconnectBaseDelay * Math.pow(EXPONENTIAL_BACKOFF_BASE, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    )

    this.logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    this.reconnectTimer = setTimeout(async () => {
      try {
        // Clean up old connection completely before reconnecting
        if (this.ws) {
          this.removeWebSocketHandlers()
          if (this.ws.readyState === WebSocket.OPEN ||
              this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close()
          }
          this.ws = null
        }

        await this.connect()
      } catch (error) {
        this.logger.error('Reconnection attempt failed', { error })
        this.handleReconnect()
      }
    }, delay)
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()

    this.heartbeatTimer = setInterval(() => {
      this.sendPing()
    }, this.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }

    this.pendingPings.clear()
  }

  private sendPing(): void {
    if (!this.ws || this.connectionState !== ConnectionState.CONNECTED) {
      return
    }

    const pingId = `ping_${Date.now()}`
    this.pendingPings.add(pingId)

    const pingMsg: WebSocketMessage = {
      jsonrpc: JSONRPC_VERSION,
      method: 'ping',
      id: pingId
    }

    this.ws.send(JSON.stringify(pingMsg))

    // Set timeout for pong response
    this.heartbeatTimeoutTimer = setTimeout(() => {
      if (this.pendingPings.has(pingId)) {
        this.logger.warn('Heartbeat timeout - connection may be dead')
        this.ws?.close()
      }
    }, this.heartbeatTimeout)
  }

  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  /**
   * Setup WebSocket event handlers
   * @private
   */
  private setupWebSocketHandlers(): void {
    // Handlers are set up in connect() method
    // This method can be used for additional setup if needed
  }

  /**
   * Remove all WebSocket event handlers
   * @private
   */
  private removeWebSocketHandlers(): void {
    if (!this.ws) {
      return
    }

    // Remove event handlers to prevent memory leaks
    this.ws.onopen = null
    this.ws.onmessage = null
    this.ws.onclose = null
    this.ws.onerror = null

    // Clear handler references
    this.wsOpenHandler = null
    this.wsMessageHandler = null
    this.wsCloseHandler = null
    this.wsErrorHandler = null
  }

  /**
   * Clears reconnection timer
   * @private
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}
