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