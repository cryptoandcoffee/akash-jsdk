import { StargateClient } from '@cosmjs/stargate'
import { AkashConfig, Deployment, Lease, ProviderInfo } from '../types'
import { NetworkError } from '../errors'

export abstract class BaseProvider {
  protected client: StargateClient | null = null
  protected config: AkashConfig

  constructor(config: AkashConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    try {
      this.client = await StargateClient.connect(this.config.rpcEndpoint)
    } catch (error) {
      throw new NetworkError(
        `Failed to connect to ${this.config.rpcEndpoint}`,
        { originalError: error }
      )
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.disconnect()
      this.client = null
    }
  }

  ensureConnected(): void {
    if (!this.client) {
      throw new NetworkError('Provider not connected. Call connect() first.')
    }
  }

  getClient(): StargateClient {
    if (!this.client) {
      throw new NetworkError('Provider not connected. Call connect() first.')
    }
    return this.client
  }

  isConnected(): boolean {
    return this.client !== null
  }

  abstract getDeployments(owner: string): Promise<Deployment[]>
  abstract getLeases(owner: string): Promise<Lease[]>
  abstract getProviders(): Promise<ProviderInfo[]>
  abstract createDeployment(config: any): Promise<string>
  abstract closeDeployment(deploymentId: string): Promise<void>
}