import { BaseProvider } from './base'
import { Deployment, Lease, ProviderInfo } from '../types'
import { NetworkError } from '../errors'

export class AkashProvider extends BaseProvider {
  async getDeployments(owner: string): Promise<Deployment[]> {
    this.ensureConnected()

    try {
      const apiEndpoint = (this as any).config.apiEndpoint
      const response = await fetch(`${apiEndpoint}/akash/deployment/v1beta3/deployments/list?filters.owner=${owner}`)

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return data.deployments.map((deployment: any) => ({
        id: {
          owner: deployment.deployment.deploymentId.owner,
          dseq: deployment.deployment.deploymentId.dseq
        },
        state: deployment.deployment.state,
        version: deployment.deployment.version,
        createdAt: deployment.deployment.createdAt
      }))
    } catch (error) {
      throw new NetworkError('Failed to fetch deployments', { error })
    }
  }

  async getLeases(owner: string): Promise<Lease[]> {
    this.ensureConnected()

    try {
      const apiEndpoint = (this as any).config.apiEndpoint
      const response = await fetch(`${apiEndpoint}/akash/market/v1beta4/leases/list?filters.owner=${owner}`)

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return data.leases.map((lease: any) => ({
        id: {
          owner: lease.lease.leaseId.owner,
          dseq: lease.lease.leaseId.dseq,
          gseq: lease.lease.leaseId.gseq,
          oseq: lease.lease.leaseId.oseq,
          provider: lease.lease.leaseId.provider
        },
        leaseId: {
          owner: lease.lease.leaseId.owner,
          dseq: lease.lease.leaseId.dseq,
          gseq: lease.lease.leaseId.gseq,
          oseq: lease.lease.leaseId.oseq,
          provider: lease.lease.leaseId.provider
        },
        state: lease.lease.state,
        price: lease.lease.price
      }))
    } catch (error) {
      throw new NetworkError('Failed to fetch leases', { error })
    }
  }

  async getProviders(): Promise<ProviderInfo[]> {
    this.ensureConnected()

    try {
      const apiEndpoint = (this as any).config.apiEndpoint
      const response = await fetch(`${apiEndpoint}/akash/provider/v1beta3/providers`)

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return data.providers.map((provider: any) => ({
        owner: provider.owner,
        hostUri: provider.hostUri,
        attributes: provider.attributes || []
      }))
    } catch (error) {
      throw new NetworkError('Failed to fetch providers', { error })
    }
  }

  async createDeployment(): Promise<string> {
    throw new Error('createDeployment should be called through DeploymentManager, not directly on provider')
  }

  async getDeployment(params: { owner: string; dseq: string }): Promise<Deployment | null> {
    this.ensureConnected()

    try {
      const apiEndpoint = (this as any).config.apiEndpoint
      const response = await fetch(`${apiEndpoint}/akash/deployment/v1beta3/deployments/info?id.owner=${params.owner}&id.dseq=${params.dseq}`)

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return {
        deploymentId: {
          owner: data.deployment.deploymentId.owner,
          dseq: data.deployment.deploymentId.dseq
        },
        state: data.deployment.state,
        version: data.deployment.version,
        createdAt: data.deployment.createdAt
      }
    } catch (error) {
      throw new NetworkError('Failed to fetch deployment', { error })
    }
  }

  async getLeasesByDeployment(params: { owner: string; dseq: string }): Promise<Lease[]> {
    this.ensureConnected()

    try {
      const apiEndpoint = (this as any).config.apiEndpoint
      const response = await fetch(`${apiEndpoint}/akash/market/v1beta4/leases/list?filters.owner=${params.owner}&filters.dseq=${params.dseq}`)

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return data.leases.map((lease: any) => ({
        id: {
          owner: lease.lease.leaseId.owner,
          dseq: lease.lease.leaseId.dseq,
          gseq: lease.lease.leaseId.gseq,
          oseq: lease.lease.leaseId.oseq,
          provider: lease.lease.leaseId.provider
        },
        leaseId: {
          owner: lease.lease.leaseId.owner,
          dseq: lease.lease.leaseId.dseq,
          gseq: lease.lease.leaseId.gseq,
          oseq: lease.lease.leaseId.oseq,
          provider: lease.lease.leaseId.provider
        },
        state: lease.lease.state,
        price: lease.lease.price
      }))
    } catch (error) {
      throw new NetworkError('Failed to fetch leases', { error })
    }
  }

  async closeDeployment(): Promise<void> {
    throw new Error('closeDeployment should be called through DeploymentManager, not directly on provider')
  }
}