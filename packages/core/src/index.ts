export * from './types'
export * from './providers'
export * from './errors'
export * from './utils'
export * from './modules'

import { AkashProvider } from './providers'
import { AkashConfig } from './types'
import { validateConfig } from './utils'

// Default configuration using akashedge.com endpoints
export const DEFAULT_CONFIG = {
  rpcEndpoint: 'https://rpc.akashedge.com:443',
  apiEndpoint: 'https://api.akashedge.com:443',
  chainId: 'akashnet-2',
  gasPrice: '0.025uakt',
  gasAdjustment: 1.5,
  prefix: 'akash'
}

import { CertificateManager } from './modules/certificates'
import { EscrowManager } from './modules/escrow'
import { AuditManager } from './modules/audit'
import { GovernanceManager } from './modules/governance'
import { MarketManager } from './modules/market'
import { ProviderManager } from './modules/provider'
import { SDLManager } from './modules/sdl'
import { WalletManager } from './modules/wallet'

export class AkashSDK {
  private provider: AkashProvider
  
  // Module managers
  public readonly certificates: CertificateManager
  public readonly escrow: EscrowManager
  public readonly audit: AuditManager
  public readonly governance: GovernanceManager
  public readonly market: MarketManager
  public readonly providerManager: ProviderManager
  public readonly sdl: SDLManager
  public readonly wallet: WalletManager

  constructor(config: AkashConfig) {
    validateConfig(config)
    this.provider = new AkashProvider(config)
    
    // Initialize module managers
    this.certificates = new CertificateManager(this.provider)
    this.escrow = new EscrowManager(this.provider)
    this.audit = new AuditManager(this.provider)
    this.governance = new GovernanceManager(this.provider)
    this.market = new MarketManager(this.provider)
    this.providerManager = new ProviderManager(this.provider)
    this.sdl = new SDLManager()
    this.wallet = new WalletManager(this.provider)
  }

  async connect(): Promise<void> {
    await this.provider.connect()
  }

  async disconnect(): Promise<void> {
    await this.provider.disconnect()
  }

  isConnected(): boolean {
    return this.provider.isConnected()
  }

  // Legacy deployment methods (maintained for backward compatibility)
  get deployments() {
    return {
      list: (owner: string) => this.provider.getDeployments(owner),
      get: (params: { owner: string; dseq: string }) => this.provider.getDeployment(params),
      create: (config: any) => this.provider.createDeployment(config),
      close: (params: { owner: string; dseq: string } | string) => this.provider.closeDeployment(params)
    }
  }

  // Legacy lease methods (maintained for backward compatibility)
  get leases() {
    return {
      list: (params: { owner: string; dseq: string } | string) => {
        if (typeof params === 'string') {
          return this.provider.getLeases(params)
        } else {
          return this.provider.getLeasesByDeployment(params)
        }
      }
    }
  }

  // Legacy provider methods (maintained for backward compatibility)
  get providers() {
    return {
      list: () => this.provider.getProviders()
    }
  }
}

export default AkashSDK