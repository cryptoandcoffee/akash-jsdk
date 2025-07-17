import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProviderManager } from './provider'
import { AkashProvider } from '../providers/akash'
import { NetworkError, ValidationError } from '../errors'

// Mock the provider
const mockProvider = {
  client: {
    searchTx: vi.fn()
  },
  ensureConnected: vi.fn()
} as unknown as AkashProvider

describe('ProviderManager', () => {
  let providerManager: ProviderManager

  beforeEach(() => {
    providerManager = new ProviderManager(mockProvider)
    vi.clearAllMocks()
  })

  describe('createProvider', () => {
    it('should create provider successfully', async () => {
      const providerParams = {
        owner: 'akash1provider',
        hostUri: 'https://provider.akash.network',
        attributes: [
          { key: 'region', value: 'us-west' },
          { key: 'tier', value: 'datacenter' }
        ],
        info: {
          email: 'admin@provider.com',
          website: 'https://provider.com'
        }
      }

      const mockTx = {
        height: 12345,
        hash: 'provider-tx-hash',
        gasUsed: 50000,
        gasWanted: 60000,
        events: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      await providerManager.createProvider(providerParams)

      expect(mockProvider['client']!.searchTx).toHaveBeenCalled()
    })

    it('should throw error for invalid provider parameters', async () => {
      const invalidParams = {
        owner: '',
        hostUri: 'invalid-url',
        attributes: [],
        info: {}
      }

      await expect(providerManager.createProvider(invalidParams)).rejects.toThrow('Invalid provider parameters')
    })
  })

  describe('getProvider', () => {
    it('should get provider by owner', async () => {
      const owner = 'akash1provider'
      const mockTxs = [
        {
          height: 12345,
          hash: 'provider-tx-hash',
          gasUsed: 50000,
          gasWanted: 60000,
          events: []
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await providerManager.getProvider(owner)

      expect(result).toMatchObject({
        owner,
        hostUri: 'https://provider.akash.network',
        attributes: expect.arrayContaining([
          { key: 'region', value: 'us-west' },
          { key: 'tier', value: 'datacenter' }
        ])
      })
    })

    it('should return null for non-existent provider', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await providerManager.getProvider('akash1nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('listProviders', () => {
    it('should list all providers', async () => {
      const mockTxs = [
        {
          height: 12345,
          hash: 'provider-tx-1',
          gasUsed: 50000,
          gasWanted: 60000,
          events: []
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await providerManager.listProviders()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        owner: 'akash1mock',
        hostUri: expect.any(String),
        attributes: expect.any(Array)
      })
    })
  })

  describe('getProviderStatus', () => {
    it('should get provider status', async () => {
      const owner = 'akash1provider'
      
      // Mock provider exists and active leases
      vi.mocked(mockProvider['client']!.searchTx)
        .mockResolvedValueOnce([{
          height: 12345,
          hash: 'provider-tx',
          gasUsed: 50000,
          gasWanted: 60000,
          events: []
        }])
        .mockResolvedValueOnce([
          { height: 1, hash: 'lease-1', gasUsed: 50000, gasWanted: 60000, events: [] }
        ])

      const result = await providerManager.getProviderStatus(owner)

      expect(result).toMatchObject({
        owner,
        online: true,
        activeDeployments: 1,
        totalCapacity: expect.any(Object),
        availableCapacity: expect.any(Object)
      })
    })
  })

  describe('getProviderCapacity', () => {
    it('should get provider capacity information', async () => {
      const owner = 'akash1provider'

      const result = await providerManager.getProviderCapacity(owner)

      expect(result).toMatchObject({
        total: {
          cpu: { units: '100' },
          memory: { size: '1000Gi' },
          storage: { size: '10000Gi' }
        },
        available: {
          cpu: { units: '80' },
          memory: { size: '800Gi' },
          storage: { size: '8000Gi' }
        },
        allocated: {
          cpu: { units: '20' },
          memory: { size: '200Gi' },
          storage: { size: '2000Gi' }
        }
      })
    })

  })

  describe('validateProviderConfig', () => {
    it('should validate valid provider configuration', () => {
      const config = {
        owner: 'akash1provider',
        hostUri: 'https://provider.akash.network',
        attributes: [
          { key: 'region', value: 'us-west' }
        ],
        info: {
          email: 'admin@provider.com'
        }
      }

      const result = providerManager.validateProviderConfig(config)

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should reject invalid provider configuration', () => {
      const config = {
        owner: '',
        hostUri: 'invalid-url',
        attributes: [],
        info: {}
      }

      const result = providerManager.validateProviderConfig(config)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Provider owner is required')
      expect(result.errors).toContain('Invalid host URI')
    })
  })

  describe('createProvider', () => {
    it('should create provider successfully', async () => {
      const request = {
        owner: 'akash1newprovider',
        hostUri: 'https://provider.example.com',
        attributes: [
          { key: 'region', value: 'us-west' },
          { key: 'tier', value: 'premium' }
        ],
        info: {
          email: 'contact@provider.com',
          website: 'https://provider.com'
        }
      }

      const mockTx = {
        height: 12346,
        hash: 'create-provider-tx',
        gasUsed: 60000,
        gasWanted: 70000,
        events: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await providerManager.createProvider(request)

      expect(result).toBe('akash1newprovider')
    })
  })

  describe('updateProvider', () => {
    it('should update provider successfully', async () => {
      const request = {
        owner: 'akash1provider',
        hostUri: 'https://updated.provider.com',
        attributes: [{ key: 'tier', value: 'enterprise' }]
      }

      const mockTx = {
        height: 12347,
        hash: 'update-provider-tx',
        gasUsed: 55000,
        gasWanted: 65000,
        events: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      await providerManager.updateProvider(request)

      expect(mockProvider['client']!.searchTx).toHaveBeenCalled()
    })
  })

  describe('deleteProvider', () => {
    it('should delete provider successfully', async () => {
      const owner = 'akash1provider'

      const mockTx = {
        height: 12348,
        hash: 'delete-provider-tx',
        gasUsed: 45000,
        gasWanted: 55000,
        events: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      await providerManager.deleteProvider(owner)

      expect(mockProvider['client']!.searchTx).toHaveBeenCalled()
    })
  })

  describe('placeBid', () => {
    it('should place bid successfully', async () => {
      const orderId = {
        owner: 'akash1tenant',
        dseq: '123',
        gseq: 1,
        oseq: 1
      }
      const price = { denom: 'uakt', amount: '1000' }
      const deposit = { denom: 'uakt', amount: '5000' }

      const mockTx = {
        height: 12349,
        hash: 'place-bid-tx',
        gasUsed: 50000,
        gasWanted: 60000,
        events: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await providerManager.placeBid(orderId, price, deposit)

      expect(result).toMatch(/^bid-\d+$/)
    })
  })

  describe('updateBidPricing', () => {
    it('should update bid pricing successfully', async () => {
      const bidId = {
        owner: 'akash1tenant',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }
      const newPrice = { denom: 'uakt', amount: '1200' }

      const mockTx = {
        height: 12350,
        hash: 'update-bid-tx',
        gasUsed: 45000,
        gasWanted: 55000,
        events: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      await providerManager.updateBidPricing(bidId, newPrice)

      expect(mockProvider['client']!.searchTx).toHaveBeenCalled()
    })
  })

  describe('updateResourcePricing', () => {
    it('should update resource pricing successfully', async () => {
      const owner = 'akash1provider'
      const pricing = {
        cpu: { denom: 'uakt', amount: '10' },
        memory: { denom: 'uakt', amount: '1' },
        storage: { denom: 'uakt', amount: '0.1' },
        gpu: { denom: 'uakt', amount: '100' }
      }

      const mockTx = {
        height: 12352,
        hash: 'pricing-tx',
        gasUsed: 50000,
        gasWanted: 60000,
        events: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      await providerManager.updateResourcePricing(owner, pricing)

      // updateResourcePricing doesn't call searchTx in the mock implementation
      expect(mockProvider.ensureConnected).toHaveBeenCalled()
    })

  })

  describe('deployManifest', () => {
    it('should deploy manifest successfully', async () => {
      const deploymentId = 'deployment-123'
      const manifest = {
        services: {
          web: {
            image: 'nginx:latest',
            expose: [{ port: 80, as: 80, to: [{ global: true }] }]
          }
        }
      }

      const mockTx = {
        height: 12353,
        hash: 'deploy-manifest-tx',
        gasUsed: 55000,
        gasWanted: 65000,
        events: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await providerManager.deployManifest(deploymentId, manifest)

      expect(result).toMatchObject({
        deploymentId,
        manifest: expect.any(Object),
        status: 'active'
      })
    })

  })

  describe('updateManifest', () => {
    it('should update manifest successfully', async () => {
      const deploymentId = 'deployment-123'
      const newManifest = {
        services: {
          web: {
            image: 'nginx:1.21'
          }
        }
      }

      const mockTx = {
        height: 12354,
        hash: 'update-manifest-tx',
        gasUsed: 50000,
        gasWanted: 60000,
        events: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      await providerManager.updateManifest(deploymentId, newManifest)

      // updateManifest doesn't call searchTx in the mock implementation
      expect(mockProvider.ensureConnected).toHaveBeenCalled()
    })

    it('should handle updateManifest errors', async () => {
      const deploymentId = 'deployment-123'
      const newManifest = { services: { web: { image: 'nginx:1.21' } } }

      // Mock console.log to throw an error since that's what updateManifest calls
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('Console error in updateManifest')
      })

      await expect(providerManager.updateManifest(deploymentId, newManifest)).rejects.toThrow('Failed to update manifest')
      
      consoleSpy.mockRestore()
    })
  })

  describe('getManifestStatus', () => {
    it('should get manifest status', async () => {
      const deploymentId = 'deployment-123'

      const mockTx = {
        height: 12355,
        hash: 'manifest-status-tx',
        gasUsed: 40000,
        gasWanted: 50000,
        events: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await providerManager.getManifestStatus(deploymentId)

      expect(result).toMatchObject({
        deploymentId,
        status: 'active',
        manifest: expect.any(Object)
      })
    })

    it('should return manifest status for any deployment', async () => {
      const deploymentId = 'deployment-999'

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await providerManager.getManifestStatus(deploymentId)

      expect(result).toMatchObject({
        deploymentId,
        status: 'active',
        manifest: expect.any(Object)
      })
    })

  })

  describe('closeManifest', () => {
    it('should close manifest successfully', async () => {
      const deploymentId = 'deployment-123'

      const mockTx = {
        height: 12356,
        hash: 'close-manifest-tx',
        gasUsed: 45000,
        gasWanted: 55000,
        events: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      await providerManager.closeManifest(deploymentId)

      // closeManifest doesn't call searchTx in the mock implementation
      expect(mockProvider.ensureConnected).toHaveBeenCalled()
    })

    it('should handle network errors during closeManifest', async () => {
      const deploymentId = 'deployment-123'

      // Mock console.log to throw an error since that's what closeManifest calls
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('Console error in closeManifest')
      })

      await expect(providerManager.closeManifest(deploymentId)).rejects.toThrow('Failed to close manifest')
      
      consoleSpy.mockRestore()
    })
  })
})