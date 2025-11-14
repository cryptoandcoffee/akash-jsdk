// Export types first
export * from './types'
export * from './providers'
export * from './errors'
export * from './cache'

// Note: HTTP requests are handled by the consumer (e.g., MCP server)

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
  SupportedWallet,
  MnemonicWallet
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
import { DeploymentManager } from './modules/deployments'
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
  public readonly deploymentManager: DeploymentManager
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
    this.deploymentManager = new DeploymentManager(this.provider)
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

  // Legacy deployment methods (maintained for backward compatibility)
  get deployments() {
    return {
      create: (config: any, wallet?: any) => this.deploymentManager.create(config, wallet),
      list: (ownerOrFilters: string | any) => {
        if (typeof ownerOrFilters === 'string') {
          return this.deploymentManager.list({ owner: ownerOrFilters });
        } else {
          return this.deploymentManager.list(ownerOrFilters);
        }
      },
      get: (params: { owner: string; dseq: string }) => this.deploymentManager.get(params),
      close: (deploymentId: string | any) => {
        if (typeof deploymentId === 'string') {
          throw new Error('close method requires deploymentId object with owner and dseq, not just a string');
        } else {
          return this.deploymentManager.close(deploymentId);
        }
      }
    }
  }

  // Legacy provider methods (maintained for backward compatibility)
  get providers() {
    return {
      list: () => this.provider.getProviders(),
      sendManifest: (leaseId: any, manifest: string) => this.sendManifestToProvider(leaseId, manifest),
      getDeploymentStatus: (leaseId: any) => this.getProviderDeploymentStatus(leaseId),
      getLogs: (leaseId: any, service?: string) => this.getProviderLogs(leaseId, service)
    }
  }

  async sendManifestToProvider(leaseId: any, manifest: string): Promise<{ url: string; jwtToken: string; method: string; body: string }> {
    // Generate JWT token for provider authentication
    const accounts = await this.wallet.getAccounts();
    const address = accounts[0];

    const jwtToken = await this.jwtAuth.generateToken({
      address,
      privateKey: 'mock-private-key', // In production, this should be securely managed
      leasePermissions: [{
        owner: leaseId.owner,
        dseq: leaseId.dseq,
        gseq: leaseId.gseq?.toString(),
        oseq: leaseId.oseq?.toString(),
        provider: leaseId.provider,
        scopes: ['send_manifest' as any]
      }]
    });

    // Use a known real provider host instead of the provider address
    // In production, this should look up the actual provider host from the provider info
    const providerHost = 'provider.sphinx.chat'; // Known Akash provider
    const providerUrl = `https://${providerHost}/deployment/${leaseId.owner}/${leaseId.dseq}/manifest`;

    return {
      url: providerUrl,
      jwtToken,
      method: 'PUT',
      body: manifest
    };
  }

  async getProviderDeploymentStatus(leaseId: any): Promise<{ url: string; jwtToken: string; method: string }> {
    // Generate JWT token
    const accounts = await this.wallet.getAccounts();
    const address = accounts[0];

    const jwtToken = await this.jwtAuth.generateToken({
      address,
      privateKey: 'mock-private-key',
      leasePermissions: [{
        owner: leaseId.owner,
        dseq: leaseId.dseq,
        gseq: leaseId.gseq?.toString(),
        oseq: leaseId.oseq?.toString(),
        provider: leaseId.provider,
        scopes: ['status' as any]
      }]
    });

    // Use a known real provider host
    const providerHost = 'provider.akash.network';
    const statusUrl = `https://${providerHost}/deployment/${leaseId.owner}/${leaseId.dseq}/status`;

    return {
      url: statusUrl,
      jwtToken,
      method: 'GET'
    };
  }

  async getProviderLogs(leaseId: any, service?: string): Promise<{ url: string; jwtToken: string; method: string }> {
    // Generate JWT token
    const accounts = await this.wallet.getAccounts();
    const address = accounts[0];

    const jwtToken = await this.jwtAuth.generateToken({
      address,
      privateKey: 'mock-private-key',
      leasePermissions: [{
        owner: leaseId.owner,
        dseq: leaseId.dseq,
        gseq: leaseId.gseq?.toString(),
        oseq: leaseId.oseq?.toString(),
        provider: leaseId.provider,
        scopes: ['logs' as any]
      }]
    });

    // Use a known real provider host
    const providerHost = 'provider.akash.network';
    const logsUrl = `https://${providerHost}/deployment/${leaseId.owner}/${leaseId.dseq}/logs${service ? `?service=${service}` : ''}`;

    return {
      url: logsUrl,
      jwtToken,
      method: 'GET'
    };
  }
}

export default AkashSDK