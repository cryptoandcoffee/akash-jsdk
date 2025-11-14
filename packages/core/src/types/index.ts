export interface AkashConfig {
  rpcEndpoint: string
  apiEndpoint?: string
  chainId: string
  gasPrice?: string
  gasAdjustment?: number
  prefix?: string
}

export interface DeploymentConfig {
  image: string
  expose: Array<{
    port: number
    as: number
    proto: 'TCP' | 'UDP'
    to: Array<{
      global: boolean
    }>
  }>
  resources: {
    cpu: {
      units: string
    }
    memory: {
      size: string
    }
    storage: {
      size: string
    }
  }
  count: number
}

export interface ProviderInfo {
  owner: string
  hostUri: string
  attributes: Array<{
    key: string
    value: string
  }>
}

// Re-export Lease types from protobuf to avoid duplication
export type {
  Lease,
  LeaseID,
  LeaseState,
  LeaseCloseReason
} from '@cryptoandcoffee/akash-jsdk-protobuf'

// Re-export Deployment types from protobuf to avoid duplication
export type {
  Deployment,
  DeploymentID,
  DeploymentState
} from '@cryptoandcoffee/akash-jsdk-protobuf'

/**
 * Deposit sources (AEP-75: Multi-Depositor Escrow)
 */
export enum DepositSource {
  /** Deposit from account balance */
  Balance = 'balance',
  /** Deposit from external grant */
  Grant = 'grant',
  /** Deposit from another account */
  Delegated = 'delegated'
}

/**
 * Deposit configuration for bids and deployments (AEP-75)
 */
export interface DepositConfig {
  /** Amount to deposit */
  amount: string;
  /** Denom of the deposit (default: 'uakt') */
  denom?: string;
  /** Sources of the deposit funds */
  sources: DepositSource[];
  /** Depositor addresses (for multi-depositor scenarios) */
  depositors?: string[];
}

export type { JWTClaims, JWTGenerationOptions, AuthConfig } from './jwt'
export { JWTPermissionScope, JWTAccessType, AuthMethod } from './jwt'

// Export result types
export * from './results'