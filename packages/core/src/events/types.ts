/**
 * Event types for Akash Network blockchain events
 */

export interface BaseEvent {
  type: string
  height: number
  txHash?: string
  timestamp?: number
}

export interface DeploymentEvent extends BaseEvent {
  type: 'deployment.created' | 'deployment.updated' | 'deployment.closed'
  owner: string
  dseq: string
  version?: string
  state?: 'active' | 'closed'
}

export interface OrderEvent extends BaseEvent {
  type: 'order.created' | 'order.closed'
  owner: string
  dseq: string
  gseq: number
  oseq: number
  state?: 'open' | 'active' | 'closed'
}

export interface BidEvent extends BaseEvent {
  type: 'bid.created' | 'bid.closed'
  owner: string
  dseq: string
  gseq: number
  oseq: number
  provider: string
  price?: {
    denom: string
    amount: string
  }
  state?: 'open' | 'active' | 'closed'
}

export interface LeaseEvent extends BaseEvent {
  type: 'lease.created' | 'lease.closed'
  owner: string
  dseq: string
  gseq: number
  oseq: number
  provider: string
  price?: {
    denom: string
    amount: string
  }
  state?: 'active' | 'closed' | 'insufficient_funds'
  closeReason?: string
}

export type AkashEvent = DeploymentEvent | OrderEvent | BidEvent | LeaseEvent

export type EventCallback = (event: AkashEvent) => void

export interface EventFilter {
  types?: string[]
  owner?: string
  provider?: string
  dseq?: string
}

export interface EventSubscription {
  id: string
  query: string
  callback: EventCallback
  filter?: EventFilter
}

/**
 * Tendermint event attribute
 */
export interface TendermintAttribute {
  key: string
  value: string
  index?: boolean
}

/**
 * Tendermint blockchain event
 */
export interface TendermintBlockchainEvent {
  type: string
  attributes: TendermintAttribute[]
}

/**
 * Transaction result from Tendermint
 */
export interface TendermintTxResultData {
  height: string
  tx: string
  result: {
    events: TendermintBlockchainEvent[]
    log?: string
    data?: string
    code?: number
  }
}

/**
 * Event data structure
 */
export interface TendermintEventData {
  type: string
  value: {
    TxResult?: TendermintTxResultData
    [key: string]: unknown
  }
}

/**
 * WebSocket subscription parameters
 */
export interface TendermintSubscriptionParams {
  query: string
  data?: TendermintEventData
}

/**
 * Tendermint event from WebSocket params
 */
export interface TendermintEvent {
  query: string
  data: TendermintEventData
}

/**
 * WebSocket message result
 */
export interface WebSocketMessageResult {
  query?: string
  data?: TendermintEventData
  [key: string]: unknown
}

/**
 * WebSocket message structure
 */
export interface WebSocketMessage {
  jsonrpc: string
  id?: string
  method?: string
  params?: TendermintSubscriptionParams | TendermintEvent
  result?: WebSocketMessageResult
  error?: {
    code: number
    message: string
    data?: string
  }
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

// Import Logger from utils to avoid duplication
import type { Logger } from '../utils/logger'

export interface EventStreamConfig {
  rpcEndpoint: string
  maxReconnectAttempts?: number
  reconnectBaseDelay?: number
  maxReconnectDelay?: number
  heartbeatInterval?: number
  heartbeatTimeout?: number
  logger?: Logger
  onConnectionStateChange?: (state: ConnectionState) => void

  /**
   * Maximum number of concurrent subscriptions (default: 100)
   */
  maxSubscriptions?: number
}

// Re-export Logger for backward compatibility
export type { Logger }
