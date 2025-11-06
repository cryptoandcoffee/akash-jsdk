// Export types first
export * from './types'
export * from './providers'
export * from './errors'
export * from './cache'

// Export events (selective to avoid conflicts)
export type {
  BaseEvent,
  DeploymentEvent,
  OrderEvent,
  BidEvent,
  LeaseEvent,
  AkashEvent,
  EventCallback,
  EventFilter,
  EventSubscription,
  TendermintAttribute,
  TendermintBlockchainEvent,
  TendermintTxResultData,
  TendermintEventData,
  TendermintSubscriptionParams,
  TendermintEvent,
  WebSocketMessageResult,
  WebSocketMessage,
  ConnectionState,
  EventStreamConfig
} from './events'
export { EventStreamManager } from './events/stream'

// Export utils (selective to avoid conflicts)
export {
  validateConfig,
  sleep,
  retry,
  formatAKT,
  parseAKT
} from './utils'
export type { Logger } from './utils'
export {
  LogLevel,
  ConsoleLogger,
  NoOpLogger,
  createDefaultLogger
} from './utils'

// Export specific modules to avoid conflicts
export {
  DeploymentManager,
  CertificateManager,
  EscrowManager,
  AuditManager,
  GovernanceManager,
  MarketManager,
  ProviderManager,
  SDLManager,
  WalletManager,
  JWTAuthManager,
  BatchManager,
  IBCManager,
  StakingManager,
  WalletAdapter,
  SupportedWallet
} from './modules'

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
import { JWTAuthManager } from './modules/jwt-auth'
import { BatchManager } from './modules/batch'
import { IBCManager } from './modules/ibc'
import { StakingManager } from './modules/staking'
import { AuthConfig, AuthMethod } from './types/jwt'
import { CacheManager } from './cache'
import { EventStreamManager } from './events/stream'

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
  public readonly jwtAuth: JWTAuthManager
  public readonly batch: BatchManager
  public readonly ibc: IBCManager
  public readonly cache: CacheManager
  public readonly events: EventStreamManager
  public readonly staking: StakingManager

  constructor(config: AkashConfig) {
    validateConfig(config)
    this.provider = new AkashProvider(config)

    // Initialize cache manager
    this.cache = new CacheManager()

    // Initialize module managers
    this.certificates = new CertificateManager(this.provider)
    this.escrow = new EscrowManager(this.provider)
    this.audit = new AuditManager(this.provider)
    this.governance = new GovernanceManager(this.provider)
    this.market = new MarketManager(this.provider, this.cache)
    this.providerManager = new ProviderManager(this.provider, this.cache)
    this.sdl = new SDLManager()
    this.wallet = new WalletManager(this.provider)
    this.jwtAuth = new JWTAuthManager()
    this.batch = new BatchManager(this.provider)
    this.ibc = new IBCManager(this.provider)
    this.staking = new StakingManager(this.provider)
    this.events = new EventStreamManager({
      rpcEndpoint: config.rpcEndpoint
    })
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

  /**
   * Set authentication configuration for provider interactions
   * Supports both JWT (Mainnet 14+) and certificate-based auth
   */
  setAuthConfig(config: AuthConfig): void {
    this.wallet.setAuthConfig(config)

    // Update provider manager with auth header if using JWT
    if (config.method === AuthMethod.JWT && config.jwtToken) {
      const authHeader = this.jwtAuth.createAuthHeader(config.jwtToken)
      this.providerManager.setAuthorizationHeader(authHeader)
    } else if (config.method === AuthMethod.Certificate) {
      // Certificate auth uses mTLS, no Authorization header needed
      this.providerManager.setAuthorizationHeader(null)
    }
  }

  /**
   * Get current authentication configuration
   */
  getAuthConfig(): AuthConfig | null {
    return this.wallet.getAuthConfig()
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
