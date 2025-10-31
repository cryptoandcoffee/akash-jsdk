/**
 * Type definitions for Tendermint/CometBFT structures
 * These types provide strong typing for blockchain event data
 */

/**
 * Tendermint event attribute
 */
export interface TendermintAttribute {
  key: string  // base64 encoded
  value: string  // base64 encoded
  index?: boolean
}

/**
 * Tendermint event structure
 */
export interface TendermintEvent {
  type: string
  attributes: TendermintAttribute[]
}

/**
 * Tendermint transaction result
 */
export interface TendermintTxResult {
  code: number
  data?: string
  log: string
  info: string
  gas_wanted: string
  gas_used: string
  events: TendermintEvent[]
  codespace: string
}

/**
 * Transaction result data from Tendermint WebSocket
 */
export interface TendermintTxResultData {
  height: string
  tx: string
  result: {
    events: TendermintEvent[]
    log?: string
    data?: string
    code?: number
    codespace?: string
    gas_wanted?: string
    gas_used?: string
  }
}

/**
 * WebSocket event data structure
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
 * WebSocket message result structure
 */
export interface TendermintMessageResult {
  query?: string
  data?: TendermintEventData
  events?: Record<string, unknown>
}

/**
 * WebSocket error structure
 */
export interface TendermintError {
  code: number
  message: string
  data?: string
}

/**
 * WebSocket message from Tendermint
 */
export interface TendermintWebSocketMessage {
  jsonrpc: string
  id?: string | number
  method?: string
  params?: TendermintSubscriptionParams
  result?: TendermintMessageResult
  error?: TendermintError
}

/**
 * Block header information
 */
export interface TendermintBlockHeader {
  version: {
    block: string
    app: string
  }
  chain_id: string
  height: string
  time: string
  last_block_id: {
    hash: string
    parts: {
      total: number
      hash: string
    }
  }
  last_commit_hash: string
  data_hash: string
  validators_hash: string
  next_validators_hash: string
  consensus_hash: string
  app_hash: string
  last_results_hash: string
  evidence_hash: string
  proposer_address: string
}

/**
 * Block data structure
 */
export interface TendermintBlock {
  header: TendermintBlockHeader
  data: {
    txs: string[]
  }
  evidence: {
    evidence: unknown[]
  }
  last_commit: {
    height: string
    round: number
    block_id: {
      hash: string
      parts: {
        total: number
        hash: string
      }
    }
    signatures: unknown[]
  }
}

/**
 * Node info structure
 */
export interface TendermintNodeInfo {
  protocol_version: {
    p2p: string
    block: string
    app: string
  }
  id: string
  listen_addr: string
  network: string
  version: string
  channels: string
  moniker: string
  other: {
    tx_index: string
    rpc_address: string
  }
}

/**
 * Sync info structure
 */
export interface TendermintSyncInfo {
  latest_block_hash: string
  latest_app_hash: string
  latest_block_height: string
  latest_block_time: string
  earliest_block_hash: string
  earliest_app_hash: string
  earliest_block_height: string
  earliest_block_time: string
  catching_up: boolean
}

/**
 * Status response structure
 */
export interface TendermintStatus {
  node_info: TendermintNodeInfo
  sync_info: TendermintSyncInfo
  validator_info: {
    address: string
    pub_key: {
      type: string
      value: string
    }
    voting_power: string
  }
}
