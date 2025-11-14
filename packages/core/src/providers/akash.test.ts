import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AkashProvider } from './akash'
import { NetworkError, DeploymentError } from '../errors'

// Mock @cosmjs/stargate
vi.mock('@cosmjs/stargate', () => ({
  StargateClient: {
    connect: vi.fn()
  }
}))

describe('AkashProvider', () => {
  let provider: AkashProvider
  const mockConfig = {
    rpcEndpoint: 'https://rpc.akashedge.com:443',
    apiEndpoint: 'https://api.akashedge.com:443',
    chainId: 'akashnet-test'
  }

  // Store original fetch
  const originalFetch = global.fetch

  beforeEach(() => {
    provider = new AkashProvider(mockConfig)
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch
  })

  describe('connect', () => {
    it('should connect successfully', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn()
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      await provider.connect()
      
      expect(StargateClient.connect).toHaveBeenCalledWith(mockConfig.rpcEndpoint)
    })

    it('should throw NetworkError on connection failure', async () => {
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockRejectedValue(new Error('Connection failed'))

      await expect(provider.connect()).rejects.toThrow(NetworkError)
    })
  })

  describe('disconnect', () => {
    it('should disconnect when connected', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn()
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      await provider.connect()
      await provider.disconnect()
      
      expect(mockClient.disconnect).toHaveBeenCalled()
    })

    it('should handle disconnect when not connected', async () => {
      await provider.disconnect()
      // Should not throw
      expect(true).toBe(true)
    })
  })

  describe('getDeployments', () => {
    it('should throw error when not connected', async () => {
      await expect(provider.getDeployments('test-owner')).rejects.toThrow(NetworkError)
    })

    it('should return deployments when connected', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn()
      }

      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      // Mock fetch for deployments
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          deployments: [
            {
              deployment: {
                deploymentId: {
                  owner: 'test-owner',
                  dseq: '12345'
                },
                state: 'active',
                version: '1.0.0',
                createdAt: '2024-01-01T00:00:00Z'
              }
            }
          ]
        })
      }) as any

      await provider.connect()
      const deployments = await provider.getDeployments('test-owner')

      expect(deployments).toHaveLength(1)
      expect(deployments[0]).toMatchObject({
        id: {
          owner: 'test-owner',
          dseq: '12345'
        },
        state: 'active'
      })
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockConfig.apiEndpoint}/akash/deployment/v1beta3/deployments/list?filters.owner=test-owner`
      )
    })

    it('should handle fetch errors', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn()
      }

      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      // Mock fetch to fail
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      }) as any

      await provider.connect()

      await expect(provider.getDeployments('test-owner')).rejects.toThrow(NetworkError)
      await expect(provider.getDeployments('test-owner')).rejects.toThrow('Failed to fetch deployments')
    })
  })

  describe('getLeases', () => {
    it('should return leases when connected', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn()
      }

      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      // Mock fetch for leases
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          leases: [
            {
              lease: {
                leaseId: {
                  owner: 'test-owner',
                  dseq: '12346',
                  gseq: '1',
                  oseq: '1',
                  provider: 'akash1provider'
                },
                state: 'active',
                price: {
                  denom: 'uakt',
                  amount: '100'
                }
              }
            }
          ]
        })
      }) as any

      await provider.connect()
      const leases = await provider.getLeases('test-owner')

      expect(leases).toHaveLength(1)
      expect(leases[0]).toMatchObject({
        id: {
          owner: 'test-owner',
          dseq: '12346'
        },
        state: 'active'
      })
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockConfig.apiEndpoint}/akash/market/v1beta4/leases/list?filters.owner=test-owner`
      )
    })

    it('should handle fetch errors for leases', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn()
      }

      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      // Mock fetch to fail
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      }) as any

      await provider.connect()

      await expect(provider.getLeases('test-owner')).rejects.toThrow(NetworkError)
      await expect(provider.getLeases('test-owner')).rejects.toThrow('Failed to fetch leases')
    })
  })

  describe('getProviders', () => {
    it('should return providers when connected', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn()
      }

      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      // Mock fetch for providers
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          providers: [
            {
              owner: 'akash1provider',
              hostUri: 'https://provider.akash.network',
              attributes: []
            }
          ]
        })
      }) as any

      await provider.connect()
      const providers = await provider.getProviders()

      expect(providers).toHaveLength(1)
      expect(providers[0]).toMatchObject({
        owner: 'akash1provider',
        hostUri: 'https://provider.akash.network'
      })
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockConfig.apiEndpoint}/akash/provider/v1beta3/providers`
      )
    })

    it('should handle fetch errors for providers', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn()
      }

      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      // Mock fetch to fail
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      }) as any

      await provider.connect()

      await expect(provider.getProviders()).rejects.toThrow(NetworkError)
      await expect(provider.getProviders()).rejects.toThrow('Failed to fetch providers')
    })
  })

  describe('createDeployment', () => {
    it('should throw error indicating to use DeploymentManager', async () => {
      const mockClient = {
        disconnect: vi.fn()
      }

      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      await provider.connect()

      await expect(provider.createDeployment({ test: 'config' })).rejects.toThrow(
        'createDeployment should be called through DeploymentManager, not directly on provider'
      )
    })

    it('should throw error even when not connected', async () => {
      await expect(provider.createDeployment({ test: 'config' })).rejects.toThrow(
        'createDeployment should be called through DeploymentManager, not directly on provider'
      )
    })
  })

  describe('getDeployment', () => {
    it('should return deployment when found', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn()
      }

      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      // Mock fetch for deployment
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          deployment: {
            deploymentId: {
              owner: 'test-owner',
              dseq: '12345'
            },
            state: 'active',
            version: '1.0.0',
            createdAt: '2024-01-01T00:00:00Z'
          }
        })
      }) as any

      await provider.connect()
      const deployment = await provider.getDeployment({ owner: 'test-owner', dseq: '12345' })

      expect(deployment).toMatchObject({
        deploymentId: {
          owner: 'test-owner',
          dseq: '12345'
        },
        state: 'active'
      })
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockConfig.apiEndpoint}/akash/deployment/v1beta3/deployments/info?id.owner=test-owner&id.dseq=12345`
      )
    })

    it('should return null when deployment not found', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn()
      }

      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      // Mock fetch to return 404
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      }) as any

      await provider.connect()
      const deployment = await provider.getDeployment({ owner: 'test-owner', dseq: '12345' })

      expect(deployment).toBeNull()
    })

    it('should throw error when not connected', async () => {
      await expect(provider.getDeployment({ owner: 'test-owner', dseq: '12345' })).rejects.toThrow(NetworkError)
    })

    it('should handle fetch errors for getDeployment', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn()
      }

      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      // Mock fetch to fail
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      }) as any

      await provider.connect()

      await expect(provider.getDeployment({ owner: 'test-owner', dseq: '12345' })).rejects.toThrow(NetworkError)
      await expect(provider.getDeployment({ owner: 'test-owner', dseq: '12345' })).rejects.toThrow('Failed to fetch deployment')
    })
  })

  describe('getLeasesByDeployment', () => {
    it('should return leases for deployment when connected', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn()
      }

      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      // Mock fetch for leases by deployment
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          leases: [
            {
              lease: {
                leaseId: {
                  owner: 'test-owner',
                  dseq: '12345',
                  gseq: '1',
                  oseq: '1',
                  provider: 'akash1provider'
                },
                state: 'active',
                price: {
                  denom: 'uakt',
                  amount: '100'
                }
              }
            }
          ]
        })
      }) as any

      await provider.connect()
      const leases = await provider.getLeasesByDeployment({ owner: 'test-owner', dseq: '12345' })

      expect(leases).toHaveLength(1)
      expect(leases[0]).toMatchObject({
        id: {
          owner: 'test-owner',
          dseq: '12345'
        },
        state: 'active'
      })
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockConfig.apiEndpoint}/akash/market/v1beta4/leases/list?filters.owner=test-owner&filters.dseq=12345`
      )
    })

    it('should throw error when not connected', async () => {
      await expect(provider.getLeasesByDeployment({ owner: 'test-owner', dseq: '12345' })).rejects.toThrow(NetworkError)
    })

    it('should handle fetch errors for getLeasesByDeployment', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn()
      }

      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      // Mock fetch to fail
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      }) as any

      await provider.connect()

      await expect(provider.getLeasesByDeployment({ owner: 'test-owner', dseq: '12345' })).rejects.toThrow(NetworkError)
      await expect(provider.getLeasesByDeployment({ owner: 'test-owner', dseq: '12345' })).rejects.toThrow('Failed to fetch leases')
    })
  })

  describe('closeDeployment', () => {
    it('should throw error indicating to use DeploymentManager', async () => {
      const mockClient = {
        disconnect: vi.fn()
      }

      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      await provider.connect()

      await expect(provider.closeDeployment('deployment-123')).rejects.toThrow(
        'closeDeployment should be called through DeploymentManager, not directly on provider'
      )
    })

    it('should throw error even when not connected', async () => {
      await expect(provider.closeDeployment('deployment-123')).rejects.toThrow(
        'closeDeployment should be called through DeploymentManager, not directly on provider'
      )
    })
  })
})