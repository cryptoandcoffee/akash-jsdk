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
  LeaseEvent
} from './types'
import { NetworkError } from '../errors'

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

  constructor(config: EventStreamConfig) {
    this.rpcEndpoint = config.rpcEndpoint
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? 5
    this.reconnectBaseDelay = config.reconnectBaseDelay ?? 1000
    this.maxReconnectDelay = config.maxReconnectDelay ?? 30000
    this.heartbeatInterval = config.heartbeatInterval ?? 30000
    this.heartbeatTimeout = config.heartbeatTimeout ?? 10000
  }

  /**
   * Connect to Tendermint WebSocket endpoint
   */
  async connect(): Promise<void> {
    if (this.connectionState === ConnectionState.CONNECTED) {
      return
    }

    this.connectionState = ConnectionState.CONNECTING
    const wsUrl = this.rpcEndpoint.replace(/^http/, 'ws') + '/websocket'

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          this.connectionState = ConnectionState.CONNECTED
          this.reconnectAttempts = 0
          this.startHeartbeat()

          // Resubscribe to all existing subscriptions
          this.resubscribeAll()

          resolve()
        }

        this.ws.onmessage = (event: any) => {
          this.handleMessage(event.data)
        }

        this.ws.onclose = () => {
          this.handleClose()
        }

        this.ws.onerror = (error: any) => {
          console.error('WebSocket error:', error)
          if (this.connectionState === ConnectionState.CONNECTING) {
            this.connectionState = ConnectionState.DISCONNECTED
            reject(new NetworkError('Failed to connect to WebSocket', { error }))
          }
        }
      } catch (error) {
        this.connectionState = ConnectionState.FAILED
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
    const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

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
        jsonrpc: '2.0',
        method: 'unsubscribe',
        id: subscriptionId,
        params: { query: subscription.query }
      }

      this.ws.send(JSON.stringify(unsubscribeMsg))
    }

    this.subscriptions.delete(subscriptionId)
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.stopHeartbeat()

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      // Unsubscribe from all subscriptions
      for (const [id] of this.subscriptions) {
        this.unsubscribe(id)
      }

      this.ws.close()
      this.ws = null
    }

    this.subscriptions.clear()
    this.connectionState = ConnectionState.DISCONNECTED
    this.reconnectAttempts = 0
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
      jsonrpc: '2.0',
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
      console.error('Failed to parse WebSocket message:', error)
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
          console.error('Error in event callback:', error)
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

      const height = parseInt(txResult.height, 10)
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
      console.error('Failed to parse event:', error)
      return null
    }
  }

  private parseDeploymentEvent(event: any, action: string, height: number): DeploymentEvent | null {
    const getAttr = (key: string): string | undefined => {
      const attr = event.attributes.find((a: any) =>
        Buffer.from(a.key, 'base64').toString() === key
      )
      return attr ? Buffer.from(attr.value, 'base64').toString() : undefined
    }

    const owner = getAttr('owner')
    const dseq = getAttr('dseq')

    if (!owner || !dseq) {
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
      owner,
      dseq,
      version: getAttr('version'),
      state: getAttr('state') as any,
      timestamp: Date.now()
    }
  }

  private parseOrderEvent(event: any, action: string, height: number): OrderEvent | null {
    const getAttr = (key: string): string | undefined => {
      const attr = event.attributes.find((a: any) =>
        Buffer.from(a.key, 'base64').toString() === key
      )
      return attr ? Buffer.from(attr.value, 'base64').toString() : undefined
    }

    const owner = getAttr('owner')
    const dseq = getAttr('dseq')
    const gseq = getAttr('gseq')
    const oseq = getAttr('oseq')

    if (!owner || !dseq || !gseq || !oseq) {
      return null
    }

    const type: OrderEvent['type'] = action.includes('close') ? 'order.closed' : 'order.created'

    return {
      type,
      height,
      owner,
      dseq,
      gseq: parseInt(gseq, 10),
      oseq: parseInt(oseq, 10),
      state: getAttr('state') as any,
      timestamp: Date.now()
    }
  }

  private parseBidEvent(event: any, action: string, height: number): BidEvent | null {
    const getAttr = (key: string): string | undefined => {
      const attr = event.attributes.find((a: any) =>
        Buffer.from(a.key, 'base64').toString() === key
      )
      return attr ? Buffer.from(attr.value, 'base64').toString() : undefined
    }

    const owner = getAttr('owner')
    const dseq = getAttr('dseq')
    const gseq = getAttr('gseq')
    const oseq = getAttr('oseq')
    const provider = getAttr('provider')

    if (!owner || !dseq || !gseq || !oseq || !provider) {
      return null
    }

    const type: BidEvent['type'] = action.includes('close') ? 'bid.closed' : 'bid.created'

    const priceAmount = getAttr('price-amount')
    const priceDenom = getAttr('price-denom')

    return {
      type,
      height,
      owner,
      dseq,
      gseq: parseInt(gseq, 10),
      oseq: parseInt(oseq, 10),
      provider,
      price: priceAmount && priceDenom ? { amount: priceAmount, denom: priceDenom } : undefined,
      state: getAttr('state') as any,
      timestamp: Date.now()
    }
  }

  private parseLeaseEvent(event: any, action: string, height: number): LeaseEvent | null {
    const getAttr = (key: string): string | undefined => {
      const attr = event.attributes.find((a: any) =>
        Buffer.from(a.key, 'base64').toString() === key
      )
      return attr ? Buffer.from(attr.value, 'base64').toString() : undefined
    }

    const owner = getAttr('owner')
    const dseq = getAttr('dseq')
    const gseq = getAttr('gseq')
    const oseq = getAttr('oseq')
    const provider = getAttr('provider')

    if (!owner || !dseq || !gseq || !oseq || !provider) {
      return null
    }

    const type: LeaseEvent['type'] = action.includes('close') ? 'lease.closed' : 'lease.created'

    const priceAmount = getAttr('price-amount')
    const priceDenom = getAttr('price-denom')

    return {
      type,
      height,
      owner,
      dseq,
      gseq: parseInt(gseq, 10),
      oseq: parseInt(oseq, 10),
      provider,
      price: priceAmount && priceDenom ? { amount: priceAmount, denom: priceDenom } : undefined,
      state: getAttr('state') as any,
      closeReason: getAttr('close-reason'),
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

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.connectionState = ConnectionState.FAILED
      console.error('Max reconnection attempts reached')
      return
    }

    const delay = Math.min(
      this.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    )

    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection attempt failed:', error)
        this.handleReconnect()
      })
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
      jsonrpc: '2.0',
      method: 'ping',
      id: pingId
    }

    this.ws.send(JSON.stringify(pingMsg))

    // Set timeout for pong response
    this.heartbeatTimeoutTimer = setTimeout(() => {
      if (this.pendingPings.has(pingId)) {
        console.error('Heartbeat timeout - connection may be dead')
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
}
