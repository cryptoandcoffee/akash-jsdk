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

export interface TendermintEvent {
  query: string
  data: {
    type: string
    value: {
      TxResult?: {
        height: string
        tx: string
        result: {
          events: Array<{
            type: string
            attributes: Array<{
              key: string
              value: string
            }>
          }>
        }
      }
    }
  }
}

export interface WebSocketMessage {
  jsonrpc: string
  id?: string
  method?: string
  params?: any
  result?: any
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

export interface EventStreamConfig {
  rpcEndpoint: string
  maxReconnectAttempts?: number
  reconnectBaseDelay?: number
  maxReconnectDelay?: number
  heartbeatInterval?: number
  heartbeatTimeout?: number
}
