import { describe, it, expect, beforeEach, vi } from 'vitest'
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
    chainId: 'akashnet-test'
  }

  beforeEach(() => {
    provider = new AkashProvider(mockConfig)
    vi.clearAllMocks()
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
        searchTx: vi.fn().mockResolvedValue([
          {
            height: 12345,
            timestamp: '2024-01-01T00:00:00Z'
          }
        ])
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

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
    })

    it('should handle searchTx errors', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn().mockRejectedValue(new Error('Search failed'))
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      await provider.connect()
      
      await expect(provider.getDeployments('test-owner')).rejects.toThrow(NetworkError)
      await expect(provider.getDeployments('test-owner')).rejects.toThrow('Failed to fetch deployments')
    })
  })

  describe('getLeases', () => {
    it('should return leases when connected', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn().mockResolvedValue([
          {
            height: 12346,
            timestamp: '2024-01-01T00:00:00Z'
          }
        ])
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

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
    })

    it('should handle searchTx errors for leases', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn().mockRejectedValue(new Error('Search failed'))
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      await provider.connect()
      
      await expect(provider.getLeases('test-owner')).rejects.toThrow(NetworkError)
      await expect(provider.getLeases('test-owner')).rejects.toThrow('Failed to fetch leases')
    })
  })

  describe('getProviders', () => {
    it('should return providers when connected', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn().mockResolvedValue([
          {
            height: 12347,
            timestamp: '2024-01-01T00:00:00Z'
          }
        ])
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      await provider.connect()
      const providers = await provider.getProviders()

      expect(providers).toHaveLength(1)
      expect(providers[0]).toMatchObject({
        owner: 'akash1provider',
        hostUri: 'https://provider.akash.network'
      })
    })

    it('should handle searchTx errors for providers', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn().mockRejectedValue(new Error('Search failed'))
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      await provider.connect()
      
      await expect(provider.getProviders()).rejects.toThrow(NetworkError)
      await expect(provider.getProviders()).rejects.toThrow('Failed to fetch providers')
    })
  })

  describe('createDeployment', () => {
    it('should create deployment when connected', async () => {
      const mockClient = {
        disconnect: vi.fn()
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      await provider.connect()
      const deploymentId = await provider.createDeployment({ test: 'config' })

      expect(deploymentId).toBe('deployment-id-placeholder')
    })

    it('should throw error when not connected', async () => {
      await expect(provider.createDeployment({ test: 'config' })).rejects.toThrow(NetworkError)
    })

    it('should handle deployment creation errors', async () => {
      const mockClient = {
        disconnect: vi.fn()
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      await provider.connect()

      // Use the simulateError flag to trigger the catch block
      await expect(provider.createDeployment({ simulateError: true })).rejects.toThrow(DeploymentError)
      await expect(provider.createDeployment({ simulateError: true })).rejects.toThrow('Failed to create deployment')
    })
  })

  describe('getDeployment', () => {
    it('should return deployment when found', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn().mockResolvedValue([
          {
            height: 12345,
            timestamp: '2024-01-01T00:00:00Z'
          }
        ])
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      await provider.connect()
      const deployment = await provider.getDeployment({ owner: 'test-owner', dseq: '12345' })

      expect(deployment).toMatchObject({
        id: {
          owner: 'test-owner',
          dseq: '12345'
        },
        state: 'active'
      })
    })

    it('should return null when deployment not found', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn().mockResolvedValue([
          {
            height: 99999,
            timestamp: '2024-01-01T00:00:00Z'
          }
        ])
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      await provider.connect()
      const deployment = await provider.getDeployment({ owner: 'test-owner', dseq: '12345' })

      expect(deployment).toBeNull()
    })

    it('should throw error when not connected', async () => {
      await expect(provider.getDeployment({ owner: 'test-owner', dseq: '12345' })).rejects.toThrow(NetworkError)
    })

    it('should handle searchTx errors for getDeployment', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn().mockRejectedValue(new Error('Search failed'))
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      await provider.connect()
      
      await expect(provider.getDeployment({ owner: 'test-owner', dseq: '12345' })).rejects.toThrow(NetworkError)
      await expect(provider.getDeployment({ owner: 'test-owner', dseq: '12345' })).rejects.toThrow('Failed to fetch deployment')
    })
  })

  describe('getLeasesByDeployment', () => {
    it('should return leases for deployment when connected', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn().mockResolvedValue([
          {
            height: 12346,
            timestamp: '2024-01-01T00:00:00Z'
          }
        ])
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

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
    })

    it('should throw error when not connected', async () => {
      await expect(provider.getLeasesByDeployment({ owner: 'test-owner', dseq: '12345' })).rejects.toThrow(NetworkError)
    })

    it('should handle searchTx errors for getLeasesByDeployment', async () => {
      const mockClient = {
        disconnect: vi.fn(),
        searchTx: vi.fn().mockRejectedValue(new Error('Search failed'))
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      await provider.connect()
      
      await expect(provider.getLeasesByDeployment({ owner: 'test-owner', dseq: '12345' })).rejects.toThrow(NetworkError)
      await expect(provider.getLeasesByDeployment({ owner: 'test-owner', dseq: '12345' })).rejects.toThrow('Failed to fetch leases')
    })
  })

  describe('closeDeployment', () => {
    it('should close deployment when connected', async () => {
      const mockClient = {
        disconnect: vi.fn()
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await provider.connect()
      await provider.closeDeployment('deployment-123')

      expect(consoleLogSpy).toHaveBeenCalledWith('Closing deployment: deployment-123')
      
      consoleLogSpy.mockRestore()
    })

    it('should close deployment with object parameter when connected', async () => {
      const mockClient = {
        disconnect: vi.fn()
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      await provider.connect()
      await provider.closeDeployment({ owner: 'akash1test', dseq: '123' })
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Closing deployment: akash1test/123')
      
      consoleLogSpy.mockRestore()
    })

    it('should throw error when not connected', async () => {
      await expect(provider.closeDeployment('deployment-123')).rejects.toThrow(NetworkError)
    })

    it('should handle deployment closing errors with string parameter', async () => {
      const mockClient = {
        disconnect: vi.fn()
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      await provider.connect()

      // Use the simulate-error string to trigger the catch block
      await expect(provider.closeDeployment('deployment-simulate-error-123')).rejects.toThrow(DeploymentError)
      await expect(provider.closeDeployment('deployment-simulate-error-123')).rejects.toThrow('Failed to close deployment')
    })

    it('should handle deployment closing errors with object parameter', async () => {
      const mockClient = {
        disconnect: vi.fn()
      }
      
      const { StargateClient } = await import('@cosmjs/stargate')
      vi.mocked(StargateClient.connect).mockResolvedValue(mockClient as any)

      await provider.connect()

      // Use the simulate-error owner to trigger the catch block
      await expect(provider.closeDeployment({ owner: 'simulate-error', dseq: '123' })).rejects.toThrow(DeploymentError)
      await expect(provider.closeDeployment({ owner: 'simulate-error', dseq: '123' })).rejects.toThrow('Failed to close deployment')
    })
  })
})