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

export interface Lease {
  id: {
    owner: string
    dseq: string
    gseq: number
    oseq: number
    provider: string
  }
  leaseId: {
    owner: string
    dseq: string
    gseq: number
    oseq: number
    provider: string
  }
  state: 'active' | 'closed' | 'insufficient_funds'
  price: {
    denom: string
    amount: string
  }
  /** Lease termination reason (AEP-39) - only present when state is 'closed' */
  closeReason?: LeaseCloseReason
}

/**
 * Lease close reasons (AEP-39: Lease Termination Tracking)
 */
export enum LeaseCloseReason {
  Unspecified = 'unspecified',
  ManifestTimeout = 'manifest_timeout',
  Unstable = 'unstable',
  InsufficientFunds = 'insufficient_funds',
  UserRequested = 'user_requested'
}

export interface Deployment {
  id: {
    owner: string
    dseq: string
  }
  state: 'active' | 'closed'
  version: string
  createdAt: number
}

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