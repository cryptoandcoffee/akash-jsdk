import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DeploymentManager } from './deployments'
import { AkashProvider } from '../providers/akash'
import { DeploymentState } from '@cryptoandcoffee/akash-jsdk-protobuf'
import { DeploymentError } from '../errors'

// Helper function to create mock IndexedTx
const createMockTx = (height: number, hash: string = 'mock-hash') => ({
  height,
  hash,
  gasUsed: BigInt(50000),
  gasWanted: BigInt(60000),
  events: [],
  txIndex: 0,
  code: 0,
  rawLog: '',
  tx: new Uint8Array(),
  msgResponses: []
})

// Mock the provider
const mockProvider = {
  ensureConnected: vi.fn(),
  client: {
    searchTx: vi.fn()
  },
  signer: 'akash1test'
} as unknown as AkashProvider

describe('DeploymentManager', () => {
  let deploymentManager: DeploymentManager

  beforeEach(() => {
    deploymentManager = new DeploymentManager(mockProvider)
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should create deployment successfully', async () => {
      const createRequest = {
        sdl: `version: "2.0"
services:
  web:
    image: nginx:latest
    expose:
      - port: 80
        as: 80
        to:
          - global: true`
      }

      const mockTx = createMockTx(12345, 'deployment-tx-hash')

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await deploymentManager.create(createRequest)

      expect(result).toMatchObject({
        owner: 'akash1test',
        dseq: '12345'
      })
      expect(mockProvider['ensureConnected']).toHaveBeenCalled()
    })

    it('should throw error on deployment creation failure', async () => {
      const createRequest = { sdl: '' }

      await expect(deploymentManager.create(createRequest)).rejects.toThrow('SDL is required')
    })

    it('should handle deployment creation network errors', async () => {
      const createRequest = {
        sdl: `version: "2.0"
services:
  web:
    image: nginx:latest
    expose:
      - port: 80
        as: 80
        to:
          - global: true`
      }

      // Mock the provider client to throw an error
      const errorMockProvider = {
        ensureConnected: vi.fn(),
        client: {
          searchTx: vi.fn().mockRejectedValue(new Error('Network search failed'))
        }
      }

      const errorDeploymentManager = new DeploymentManager(errorMockProvider as any)
      
      await expect(errorDeploymentManager.create(createRequest)).rejects.toThrow(DeploymentError)
      await expect(errorDeploymentManager.create(createRequest)).rejects.toThrow('Failed to create deployment')
    })
  })

  describe('list', () => {
    it('should list deployments for owner', async () => {
      const mockTxs = [createMockTx(12345, 'deployment-tx-1')]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await deploymentManager.list({ owner: 'test-owner' })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        deploymentId: {
          owner: 'test-owner',
          dseq: '12345'
        },
        state: DeploymentState.DEPLOYMENT_ACTIVE,
        version: '1.0.0',
        createdAt: 12345
      })
    })

    it('should list deployments with dseq filter', async () => {
      const mockTxs = [createMockTx(12345, 'deployment-tx-1')]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await deploymentManager.list({ owner: 'test-owner', dseq: '12345' })

      expect(result).toHaveLength(1)
      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'deployment' },
        { key: 'deployment.owner', value: 'test-owner' },
        { key: 'deployment.dseq', value: '12345' }
      ])
    })

    it('should handle network errors during deployment list', async () => {
      const networkError = new Error('Network connection failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(deploymentManager.list({ owner: 'test-owner' })).rejects.toThrow('Failed to list deployments')
    })

    it('should handle empty deployment list', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await deploymentManager.list({ owner: 'test-owner' })

      expect(result).toEqual([])
    })
  })

  describe('get', () => {
    it('should get specific deployment', async () => {
      const deploymentId = { owner: 'test-owner', dseq: '123' }
      const mockTxs = [createMockTx(123, 'deployment-tx')]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await deploymentManager.get(deploymentId)

      expect(result).toMatchObject({
        deploymentId,
        state: DeploymentState.DEPLOYMENT_ACTIVE,
        version: '1.0.0',
        createdAt: 123
      })
    })

    it('should return null for non-existent deployment', async () => {
      const deploymentId = { owner: 'test-owner', dseq: '999' }
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await deploymentManager.get(deploymentId)

      expect(result).toBeNull()
    })

    it('should throw error for invalid deployment ID in get', async () => {
      const invalidDeploymentId = { owner: '', dseq: '123' }

      await expect(deploymentManager.get(invalidDeploymentId)).rejects.toThrow('Invalid deployment ID')
    })

    it('should throw error for missing dseq in deployment ID', async () => {
      const invalidDeploymentId = { owner: 'test-owner', dseq: '' }

      await expect(deploymentManager.get(invalidDeploymentId)).rejects.toThrow('Invalid deployment ID')
    })

    it('should handle network errors during deployment get', async () => {
      const deploymentId = { owner: 'test-owner', dseq: '123' }
      
      const networkError = new Error('Network connection failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(deploymentManager.get(deploymentId)).rejects.toThrow('Failed to get deployment')
    })
  })

  describe('close', () => {
    it('should close deployment successfully', async () => {
      const deploymentId = { owner: 'test-owner', dseq: '123' }
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      await deploymentManager.close(deploymentId)

      expect(mockProvider['ensureConnected']).toHaveBeenCalled()
      expect(mockProvider['client']!.searchTx).toHaveBeenCalled()
    })

    it('should throw error on close failure', async () => {
      const deploymentId = { owner: '', dseq: '' }

      await expect(deploymentManager.close(deploymentId)).rejects.toThrow('Invalid deployment ID')
    })

    it('should handle network errors during deployment close', async () => {
      const deploymentId = { owner: 'test-owner', dseq: '123' }
      
      const networkError = new Error('Network connection failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(deploymentManager.close(deploymentId)).rejects.toThrow('Failed to close deployment')
    })
  })

  describe('update', () => {
    it('should update deployment successfully', async () => {
      const deploymentId = { owner: 'test-owner', dseq: '123' }
      const sdl = `version: "2.0"
services:
  web:
    image: nginx:1.21
    expose:
      - port: 80
        as: 80
        to:
          - global: true
profiles:
  compute:
    web:
      resources:
        cpu:
          units: 0.2
        memory:
          size: 256Mi
        storage:
          size: 2Gi
deployment:
  web:
    westcoast:
      profile: compute
      count: 1`

      const mockTxs = [createMockTx(124, 'update-tx')]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      await deploymentManager.update(deploymentId, sdl)

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'deployment' },
        { key: 'message.action', value: 'update-deployment' },
        { key: 'deployment.owner', value: 'test-owner' },
        { key: 'deployment.dseq', value: '123' }
      ])
    })

    it('should throw error for invalid deployment ID', async () => {
      const invalidDeploymentId = { owner: '', dseq: '123' }
      const sdl = 'version: "2.0"\nservices:\n  web:\n    image: nginx:latest'

      await expect(deploymentManager.update(invalidDeploymentId, sdl))
        .rejects.toThrow('Invalid deployment ID')
    })

    it('should throw error for empty SDL', async () => {
      const deploymentId = { owner: 'test-owner', dseq: '123' }
      const emptySdl = ''

      await expect(deploymentManager.update(deploymentId, emptySdl))
        .rejects.toThrow('SDL is required')
    })

    it('should handle update errors', async () => {
      const deploymentId = { owner: 'test-owner', dseq: '123' }
      const sdl = 'version: "2.0"\nservices:\n  web:\n    image: nginx:latest'

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(deploymentManager.update(deploymentId, sdl))
        .rejects.toThrow('Failed to update deployment')
    })
  })

  describe('getGroups', () => {
    it('should get deployment groups successfully', async () => {
      const deploymentId = { owner: 'test-owner', dseq: '123' }
      const mockTxs = [createMockTx(125, 'groups-tx')]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await deploymentManager.getGroups(deploymentId)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        name: 'web',
        requirements: {
          signedBy: {
            allOf: [],
            anyOf: []
          },
          attributes: []
        },
        resources: expect.arrayContaining([
          expect.objectContaining({
            resources: expect.objectContaining({
              cpu: { units: { val: expect.any(Uint8Array) } },
              memory: { quantity: { val: expect.any(Uint8Array) } },
              storage: expect.arrayContaining([
                expect.objectContaining({
                  name: 'default',
                  quantity: { val: expect.any(Uint8Array) }
                })
              ])
            }),
            count: 1,
            price: { denom: 'uakt', amount: '1000' }
          })
        ])
      })

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'deployment' },
        { key: 'deployment.owner', value: 'test-owner' },
        { key: 'deployment.dseq', value: '123' }
      ])
    })

    it('should throw error for invalid deployment ID in getGroups', async () => {
      const invalidDeploymentId = { owner: 'test-owner', dseq: '' }

      await expect(deploymentManager.getGroups(invalidDeploymentId))
        .rejects.toThrow('Invalid deployment ID')
    })

    it('should handle getGroups errors', async () => {
      const deploymentId = { owner: 'test-owner', dseq: '123' }

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(deploymentManager.getGroups(deploymentId))
        .rejects.toThrow('Failed to get deployment groups')
    })
  })

  describe('validateDeployment', () => {
    it('should validate active deployment successfully', async () => {
      const deploymentId = { owner: 'test-owner', dseq: '123' }
      const mockTxs = [{
        height: 123,
        hash: 'deployment-tx',
        gasUsed: 50000,
        gasWanted: 60000,
        events: []
      }]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await deploymentManager.validateDeployment(deploymentId)

      expect(result).toEqual({
        valid: true,
        errors: []
      })
      expect(mockProvider['ensureConnected']).toHaveBeenCalled()
    })

    it('should return invalid for non-existent deployment', async () => {
      const deploymentId = { owner: 'test-owner', dseq: '999' }
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await deploymentManager.validateDeployment(deploymentId)

      expect(result).toEqual({
        valid: false,
        errors: ['Deployment not found']
      })
    })

    it('should return invalid for inactive deployment', async () => {
      const deploymentId = { owner: 'test-owner', dseq: '123' }
      const mockTxs = [{
        height: 123,
        hash: 'deployment-tx',
        gasUsed: 50000,
        gasWanted: 60000,
        events: []
      }]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)
      
      // Mock the get method to return an inactive deployment
      const originalGet = deploymentManager.get
      deploymentManager.get = vi.fn().mockResolvedValue({
        deploymentId,
        state: DeploymentState.CLOSED,
        version: '1.0.0',
        createdAt: 123
      })

      const result = await deploymentManager.validateDeployment(deploymentId)

      expect(result).toEqual({
        valid: false,
        errors: ['Deployment is not active']
      })

      // Restore original method
      deploymentManager.get = originalGet
    })

    it('should handle validation errors gracefully', async () => {
      const deploymentId = { owner: 'test-owner', dseq: '123' }
      
      // Mock the get method to throw an error
      const originalGet = deploymentManager.get
      deploymentManager.get = vi.fn().mockRejectedValue(new Error('Network connection failed'))

      const result = await deploymentManager.validateDeployment(deploymentId)

      expect(result).toEqual({
        valid: false,
        errors: ['Network connection failed']
      })

      // Restore original method
      deploymentManager.get = originalGet
    })

    it('should validate deployment with multiple validation checks', async () => {
      const deploymentId = { owner: 'test-owner', dseq: '123' }
      
      // Mock the get method to return null (deployment not found)
      const originalGet = deploymentManager.get
      deploymentManager.get = vi.fn().mockResolvedValue(null)

      const result = await deploymentManager.validateDeployment(deploymentId)

      expect(result).toEqual({
        valid: false,
        errors: ['Deployment not found']
      })

      // Restore original method
      deploymentManager.get = originalGet
    })

    it('should handle deployment state validation edge cases', async () => {
      const deploymentId = { owner: 'test-owner', dseq: '123' }
      
      // Test with DEPLOYMENT_PAUSED state
      const originalGet = deploymentManager.get
      deploymentManager.get = vi.fn().mockResolvedValue({
        deploymentId,
        state: DeploymentState.CLOSED,
        version: '1.0.0',
        createdAt: 123
      })

      const result = await deploymentManager.validateDeployment(deploymentId)

      expect(result).toEqual({
        valid: false,
        errors: ['Deployment is not active']
      })

      // Restore original method
      deploymentManager.get = originalGet
    })
  })
})