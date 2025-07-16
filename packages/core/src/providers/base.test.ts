import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BaseProvider } from './base'
import { NetworkError } from '../errors'
import { AkashConfig, Deployment, Lease, ProviderInfo } from '../types'
import { StargateClient } from '@cosmjs/stargate'

// Mock StargateClient
vi.mock('@cosmjs/stargate', () => ({
  StargateClient: {
    connect: vi.fn(),
  }
}))

// Create a concrete implementation for testing
class TestProvider extends BaseProvider {
  async getDeployments(owner: string): Promise<Deployment[]> {
    this.ensureConnected()
    return [
      {
        id: { owner, dseq: '123' },
        state: 'active',
        version: 'v1.0.0',
        createdAt: Date.now()
      }
    ]
  }

  async getLeases(owner: string): Promise<Lease[]> {
    this.ensureConnected()
    return [
      {
        id: { owner, dseq: '123', gseq: 1, oseq: 1, provider: 'test-provider' },
        state: 'active',
        price: { denom: 'uakt', amount: '1000' }
      }
    ]
  }

  async getProviders(): Promise<ProviderInfo[]> {
    this.ensureConnected()
    return [
      {
        owner: 'test-provider',
        hostUri: 'https://provider.test',
        attributes: [{ key: 'region', value: 'us-west' }]
      }
    ]
  }

  async createDeployment(): Promise<string> {
    this.ensureConnected()
    return 'deployment-123'
  }

  async closeDeployment(): Promise<void> {
    this.ensureConnected()
    // Mock implementation
  }
}

describe('BaseProvider', () => {
  let provider: TestProvider
  let mockClient: any
  const config: AkashConfig = {
    rpcEndpoint: 'https://rpc.test.network',
    chainId: 'test-chain'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new TestProvider(config)
    
    mockClient = {
      disconnect: vi.fn()
    }
  })

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(provider).toBeInstanceOf(BaseProvider)
      expect(provider['config']).toEqual(config)
      expect(provider['client']).toBeNull()
    })
  })

  describe('connect', () => {
    it('should connect successfully', async () => {
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient)

      await provider.connect()

      expect(StargateClient.connect).toHaveBeenCalledWith(config.rpcEndpoint)
      expect(provider['client']).toBe(mockClient)
    })

    it('should throw NetworkError on connection failure', async () => {
      const error = new Error('Connection failed')
      vi.mocked(StargateClient.connect).mockRejectedValue(error)

      await expect(provider.connect()).rejects.toThrow(NetworkError)
      await expect(provider.connect()).rejects.toThrow(
        `Failed to connect to ${config.rpcEndpoint}`
      )
    })
  })

  describe('disconnect', () => {
    it('should disconnect when client exists', async () => {
      provider['client'] = mockClient

      await provider.disconnect()

      expect(mockClient.disconnect).toHaveBeenCalled()
      expect(provider['client']).toBeNull()
    })

    it('should handle disconnect when no client exists', async () => {
      provider['client'] = null

      await provider.disconnect()

      expect(mockClient.disconnect).not.toHaveBeenCalled()
    })
  })

  describe('isConnected', () => {
    it('should return true when client is connected', () => {
      provider['client'] = mockClient
      
      expect(provider.isConnected()).toBe(true)
    })

    it('should return false when client is null', () => {
      provider['client'] = null
      
      expect(provider.isConnected()).toBe(false)
    })
  })

  describe('ensureConnected', () => {
    it('should not throw when client is connected', () => {
      provider['client'] = mockClient

      expect(() => provider['ensureConnected']()).not.toThrow()
    })

    it('should throw NetworkError when not connected', () => {
      provider['client'] = null

      expect(() => provider['ensureConnected']()).toThrow(NetworkError)
      expect(() => provider['ensureConnected']()).toThrow(
        'Provider not connected. Call connect() first.'
      )
    })
  })

  describe('abstract method implementations', () => {
    beforeEach(async () => {
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient)
      await provider.connect()
    })

    it('should implement getDeployments', async () => {
      const deployments = await provider.getDeployments('test-owner')
      
      expect(deployments).toHaveLength(1)
      expect(deployments[0]).toMatchObject({
        id: { owner: 'test-owner', dseq: '123' },
        state: 'active',
        version: 'v1.0.0'
      })
    })

    it('should implement getLeases', async () => {
      const leases = await provider.getLeases('test-owner')
      
      expect(leases).toHaveLength(1)
      expect(leases[0]).toMatchObject({
        id: { 
          owner: 'test-owner', 
          dseq: '123', 
          gseq: 1, 
          oseq: 1, 
          provider: 'test-provider' 
        },
        state: 'active',
        price: { denom: 'uakt', amount: '1000' }
      })
    })

    it('should implement getProviders', async () => {
      const providers = await provider.getProviders()
      
      expect(providers).toHaveLength(1)
      expect(providers[0]).toMatchObject({
        owner: 'test-provider',
        hostUri: 'https://provider.test',
        attributes: [{ key: 'region', value: 'us-west' }]
      })
    })

    it('should implement createDeployment', async () => {
      const deploymentId = await provider.createDeployment()
      
      expect(deploymentId).toBe('deployment-123')
    })

    it('should implement closeDeployment', async () => {
      await expect(provider.closeDeployment()).resolves.toBeUndefined()
    })
  })

  describe('method calls without connection', () => {
    it('should throw when calling getDeployments without connection', async () => {
      await expect(provider.getDeployments('test-owner')).rejects.toThrow(NetworkError)
    })

    it('should throw when calling getLeases without connection', async () => {
      await expect(provider.getLeases('test-owner')).rejects.toThrow(NetworkError)
    })

    it('should throw when calling getProviders without connection', async () => {
      await expect(provider.getProviders()).rejects.toThrow(NetworkError)
    })

    it('should throw when calling createDeployment without connection', async () => {
      await expect(provider.createDeployment()).rejects.toThrow(NetworkError)
    })

    it('should throw when calling closeDeployment without connection', async () => {
      await expect(provider.closeDeployment()).rejects.toThrow(NetworkError)
    })
  })

  describe('error handling', () => {
    it('should handle network errors during connection', async () => {
      const networkError = new Error('Network timeout')
      vi.mocked(StargateClient.connect).mockRejectedValue(networkError)

      await expect(provider.connect()).rejects.toThrow(NetworkError)
      
      try {
        await provider.connect()
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError)
        expect((error as NetworkError).details?.originalError).toBe(networkError)
      }
    })

    it('should handle multiple connect/disconnect cycles', async () => {
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient)

      // First cycle
      await provider.connect()
      expect(provider['client']).toBe(mockClient)
      
      await provider.disconnect()
      expect(provider['client']).toBeNull()

      // Second cycle
      await provider.connect()
      expect(provider['client']).toBe(mockClient)
      
      await provider.disconnect()
      expect(provider['client']).toBeNull()
    })
  })

  describe('configuration handling', () => {
    it('should store configuration correctly', () => {
      const customConfig: AkashConfig = {
        rpcEndpoint: 'https://custom.rpc.endpoint',
        apiEndpoint: 'https://custom.api.endpoint',
        chainId: 'custom-chain',
        gasPrice: '0.025uakt',
        gasAdjustment: 1.5,
        prefix: 'custom'
      }

      const customProvider = new TestProvider(customConfig)
      expect(customProvider['config']).toEqual(customConfig)
    })

    it('should handle minimal configuration', () => {
      const minimalConfig: AkashConfig = {
        rpcEndpoint: 'https://minimal.rpc',
        chainId: 'minimal-chain'
      }

      const minimalProvider = new TestProvider(minimalConfig)
      expect(minimalProvider['config']).toEqual(minimalConfig)
    })
  })
})