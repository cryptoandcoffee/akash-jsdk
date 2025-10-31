import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BatchManager, BatchBuilder, BatchResult } from './batch'
import { AkashProvider } from '../providers/akash'
import { ValidationError, NetworkError } from '../errors'
import { EncodeObject } from '@cosmjs/proto-signing'

// Mock the provider
const mockClient = {
  searchTx: vi.fn()
}

const mockProvider = {
  client: mockClient,
  ensureConnected: vi.fn(),
  getClient: vi.fn().mockReturnValue(mockClient)
} as unknown as AkashProvider

const mockWallet = {
  address: 'akash1test1234567890abcdefghijklmnopqrstuvwxyz'
}

describe('BatchManager', () => {
  let batchManager: BatchManager

  beforeEach(() => {
    batchManager = new BatchManager(mockProvider, mockWallet)
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with provider and wallet', () => {
      expect(batchManager).toBeInstanceOf(BatchManager)
    })

    it('should create instance without wallet', () => {
      const manager = new BatchManager(mockProvider)
      expect(manager).toBeInstanceOf(BatchManager)
    })
  })

  describe('setWallet', () => {
    it('should set wallet successfully', () => {
      const manager = new BatchManager(mockProvider)
      const wallet = { address: 'akash1newwallet' }
      manager.setWallet(wallet)
      // Wallet is private, but we can test by trying to create a batch
      expect(() => manager.createBatch()).not.toThrow()
    })
  })

  describe('setGasPrice', () => {
    it('should set gas price successfully', () => {
      batchManager.setGasPrice('0.05uakt')
      // Gas price is private, but we can verify it doesn't throw
      expect(() => batchManager.setGasPrice('0.05uakt')).not.toThrow()
    })

    it('should throw error for invalid gas price', () => {
      expect(() => batchManager.setGasPrice('')).toThrow(ValidationError)
      expect(() => batchManager.setGasPrice('')).toThrow('gasPrice must be a non-empty string')
    })

    it('should throw error for non-string gas price', () => {
      expect(() => batchManager.setGasPrice(null as any)).toThrow(ValidationError)
    })
  })

  describe('setGasAdjustment', () => {
    it('should set gas adjustment successfully', () => {
      batchManager.setGasAdjustment(2.0)
      expect(() => batchManager.setGasAdjustment(2.0)).not.toThrow()
    })

    it('should throw error for invalid gas adjustment', () => {
      expect(() => batchManager.setGasAdjustment(0)).toThrow(ValidationError)
      expect(() => batchManager.setGasAdjustment(-1)).toThrow(ValidationError)
      expect(() => batchManager.setGasAdjustment('invalid' as any)).toThrow(ValidationError)
    })
  })

  describe('createBatch', () => {
    it('should create a new batch builder', async () => {
      const builder = await batchManager.createBatch()
      expect(builder).toBeInstanceOf(BatchBuilder)
      expect(mockProvider.ensureConnected).toHaveBeenCalled()
    })

    it('should check provider connection', async () => {
      await batchManager.createBatch()
      expect(mockProvider.ensureConnected).toHaveBeenCalledTimes(1)
    })
  })

  describe('executeBatch', () => {
    it('should execute batch successfully', async () => {
      const operations: EncodeObject[] = [
        {
          typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
          value: { id: { owner: 'akash1test', dseq: '123' } }
        }
      ]

      const result = await batchManager.executeBatch(operations)

      expect(result).toMatchObject({
        transactionHash: expect.stringMatching(/^batch-tx-\d+$/),
        height: expect.any(Number),
        gasUsed: expect.any(BigInt),
        gasWanted: expect.any(BigInt),
        success: true,
        events: expect.any(Array)
      })
      expect(result.events).toHaveLength(1)
      expect(mockProvider.ensureConnected).toHaveBeenCalled()
    })

    it('should execute multiple operations', async () => {
      const operations: EncodeObject[] = [
        {
          typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
          value: { id: { owner: 'akash1test', dseq: '123' } }
        },
        {
          typeUrl: '/akash.market.v1beta3.MsgCreateLease',
          value: { bidId: { owner: 'akash1test', dseq: '123' } }
        },
        {
          typeUrl: '/akash.cert.v1beta3.MsgCreateCertificate',
          value: { owner: 'akash1test', cert: 'cert-data' }
        }
      ]

      const result = await batchManager.executeBatch(operations)

      expect(result.success).toBe(true)
      expect(result.events).toHaveLength(3)
      expect(result.gasUsed).toBe(150000n) // 3 operations * 50000
    })

    it('should throw error if no wallet set', async () => {
      const manager = new BatchManager(mockProvider)
      const operations: EncodeObject[] = [
        {
          typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
          value: {}
        }
      ]

      await expect(manager.executeBatch(operations)).rejects.toThrow(ValidationError)
      await expect(manager.executeBatch(operations)).rejects.toThrow(
        'Wallet must be set before executing batch operations'
      )
    })

    it('should throw error for empty batch', async () => {
      await expect(batchManager.executeBatch([])).rejects.toThrow(ValidationError)
      await expect(batchManager.executeBatch([])).rejects.toThrow(
        'Batch must contain at least one operation'
      )
    })

    it('should throw error for null operations', async () => {
      await expect(batchManager.executeBatch(null as any)).rejects.toThrow(ValidationError)
    })

    it('should throw error for operations without typeUrl', async () => {
      const operations: EncodeObject[] = [
        {
          typeUrl: '',
          value: {}
        }
      ]

      await expect(batchManager.executeBatch(operations)).rejects.toThrow(ValidationError)
      await expect(batchManager.executeBatch(operations)).rejects.toThrow(
        'All operations must have a typeUrl'
      )
    })

    it('should calculate gas correctly with custom adjustment', async () => {
      batchManager.setGasAdjustment(2.0)
      const operations: EncodeObject[] = [
        {
          typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
          value: {}
        }
      ]

      const result = await batchManager.executeBatch(operations)
      expect(result.gasWanted).toBe(100000n) // 50000 * 2.0
    })
  })

  describe('simulateBatch', () => {
    it('should simulate batch successfully', async () => {
      const operations: EncodeObject[] = [
        {
          typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
          value: {}
        }
      ]

      const result = await batchManager.simulateBatch(operations)

      expect(result).toMatchObject({
        gasEstimate: expect.any(Number),
        fee: {
          denom: 'uakt',
          amount: expect.any(String)
        }
      })
      expect(mockProvider.ensureConnected).toHaveBeenCalled()
    })

    it('should calculate gas for multiple operations', async () => {
      const operations: EncodeObject[] = [
        {
          typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
          value: {}
        },
        {
          typeUrl: '/akash.market.v1beta3.MsgCreateLease',
          value: {}
        }
      ]

      const result = await batchManager.simulateBatch(operations)
      expect(result.gasEstimate).toBe(150000) // 2 ops * 50000 * 1.5
    })

    it('should throw error for empty batch', async () => {
      await expect(batchManager.simulateBatch([])).rejects.toThrow(ValidationError)
    })

    it('should use custom gas price in calculation', async () => {
      batchManager.setGasPrice('0.05uakt')
      const operations: EncodeObject[] = [
        {
          typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
          value: {}
        }
      ]

      const result = await batchManager.simulateBatch(operations)
      // gasEstimate: 75000 (50000 * 1.5), fee: 75000 * 0.05 = 3750
      expect(result.fee.amount).toBe('3750')
    })
  })

  describe('validateBatch', () => {
    it('should validate valid batch', () => {
      const operations: EncodeObject[] = [
        {
          typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
          value: { id: { owner: 'akash1test', dseq: '123' } }
        }
      ]

      const result = batchManager.validateBatch(operations)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect empty batch', () => {
      const result = batchManager.validateBatch([])
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Batch must contain at least one operation')
    })

    it('should detect missing typeUrl', () => {
      const operations: EncodeObject[] = [
        {
          typeUrl: '',
          value: {}
        }
      ]

      const result = batchManager.validateBatch(operations)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Operation at index 0 is missing typeUrl')
    })

    it('should detect duplicate operations', () => {
      const operations: EncodeObject[] = [
        {
          typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
          value: { id: { owner: 'akash1test', dseq: '123' } }
        },
        {
          typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
          value: { id: { owner: 'akash1test', dseq: '123' } }
        }
      ]

      const result = batchManager.validateBatch(operations)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Duplicate operation detected at index 1')
    })

    it('should detect missing wallet', () => {
      const manager = new BatchManager(mockProvider)
      const operations: EncodeObject[] = [
        {
          typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
          value: {}
        }
      ]

      const result = manager.validateBatch(operations)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Wallet must be set before validating batch')
    })

    it('should detect multiple errors', () => {
      const manager = new BatchManager(mockProvider)
      const operations: EncodeObject[] = [
        {
          typeUrl: '',
          value: {}
        }
      ]

      const result = manager.validateBatch(operations)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
    })
  })

  describe('getTransactionDetails', () => {
    it('should get transaction details', async () => {
      const txHash = 'batch-tx-12345'
      const result = await batchManager.getTransactionDetails(txHash)

      expect(result).toMatchObject({
        hash: txHash,
        height: expect.any(Number),
        success: true,
        timestamp: expect.any(String)
      })
      expect(mockProvider.ensureConnected).toHaveBeenCalled()
    })

    it('should throw error for invalid tx hash', async () => {
      await expect(batchManager.getTransactionDetails('')).rejects.toThrow(ValidationError)
      await expect(batchManager.getTransactionDetails('')).rejects.toThrow(
        'Transaction hash must be a non-empty string'
      )
    })

    it('should throw error for null tx hash', async () => {
      await expect(batchManager.getTransactionDetails(null as any)).rejects.toThrow(
        ValidationError
      )
    })
  })
})

describe('BatchBuilder', () => {
  let batchManager: BatchManager
  let batchBuilder: BatchBuilder

  beforeEach(async () => {
    batchManager = new BatchManager(mockProvider, mockWallet)
    batchBuilder = await batchManager.createBatch()
    vi.clearAllMocks()
  })

  describe('addDeployment', () => {
    it('should add deployment to batch', () => {
      const sdl = 'version: "2.0"\nservices:\n  web:\n    image: nginx'
      const result = batchBuilder.addDeployment(sdl)

      expect(result).toBe(batchBuilder)
      expect(batchBuilder.getOperationCount()).toBe(1)
      const ops = batchBuilder.getOperations()
      expect(ops[0].typeUrl).toBe('/akash.deployment.v1beta3.MsgCreateDeployment')
    })

    it('should throw error for empty SDL', () => {
      expect(() => batchBuilder.addDeployment('')).toThrow(ValidationError)
      expect(() => batchBuilder.addDeployment('')).toThrow('SDL must be a non-empty string')
    })

    it('should throw error for non-string SDL', () => {
      expect(() => batchBuilder.addDeployment(null as any)).toThrow(ValidationError)
      expect(() => batchBuilder.addDeployment(123 as any)).toThrow(ValidationError)
    })
  })

  describe('addLease', () => {
    it('should add lease to batch', () => {
      const result = batchBuilder.addLease('123', 'akash1provider123456789012345678901234567890')

      expect(result).toBe(batchBuilder)
      expect(batchBuilder.getOperationCount()).toBe(1)
      const ops = batchBuilder.getOperations()
      expect(ops[0].typeUrl).toBe('/akash.market.v1beta3.MsgCreateLease')
    })

    it('should throw error for empty dseq', () => {
      expect(() => batchBuilder.addLease('', 'akash1provider123456789012345678901234567890')).toThrow(ValidationError)
      expect(() => batchBuilder.addLease('', 'akash1provider123456789012345678901234567890')).toThrow(
        'dseq must be a non-empty string'
      )
    })

    it('should throw error for empty provider', () => {
      expect(() => batchBuilder.addLease('123', '')).toThrow(ValidationError)
      expect(() => batchBuilder.addLease('123', '')).toThrow(
        'Address must be a non-empty string'
      )
    })

    it('should throw error for non-string parameters', () => {
      expect(() => batchBuilder.addLease(null as any, 'akash1provider123456789012345678901234567890')).toThrow(ValidationError)
      expect(() => batchBuilder.addLease('123', null as any)).toThrow(ValidationError)
    })
  })

  describe('addCertificate', () => {
    it('should add certificate to batch', () => {
      const cert = '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----'
      const result = batchBuilder.addCertificate(cert)

      expect(result).toBe(batchBuilder)
      expect(batchBuilder.getOperationCount()).toBe(1)
      const ops = batchBuilder.getOperations()
      expect(ops[0].typeUrl).toBe('/akash.cert.v1beta3.MsgCreateCertificate')
    })

    it('should throw error for empty cert', () => {
      expect(() => batchBuilder.addCertificate('')).toThrow(ValidationError)
      expect(() => batchBuilder.addCertificate('')).toThrow('cert must be a non-empty string')
    })

    it('should throw error for non-string cert', () => {
      expect(() => batchBuilder.addCertificate(null as any)).toThrow(ValidationError)
    })
  })

  describe('addCustomMessage', () => {
    it('should add custom message to batch', () => {
      const msg: EncodeObject = {
        typeUrl: '/custom.module.v1.MsgCustom',
        value: { data: 'test' }
      }
      const result = batchBuilder.addCustomMessage(msg)

      expect(result).toBe(batchBuilder)
      expect(batchBuilder.getOperationCount()).toBe(1)
      const ops = batchBuilder.getOperations()
      expect(ops[0].typeUrl).toBe('/custom.module.v1.MsgCustom')
    })

    it('should throw error for invalid message', () => {
      expect(() => batchBuilder.addCustomMessage(null as any)).toThrow(ValidationError)
      expect(() => batchBuilder.addCustomMessage({} as any)).toThrow(ValidationError)
    })

    it('should throw error for message without typeUrl', () => {
      expect(() => batchBuilder.addCustomMessage({ typeUrl: '', value: {} })).toThrow(
        ValidationError
      )
    })
  })

  describe('getOperationCount', () => {
    it('should return 0 for empty batch', () => {
      expect(batchBuilder.getOperationCount()).toBe(0)
    })

    it('should return correct count', () => {
      batchBuilder.addDeployment('sdl1')
      expect(batchBuilder.getOperationCount()).toBe(1)

      batchBuilder.addLease('123', 'akash1provider123456789012345678901234567890')
      expect(batchBuilder.getOperationCount()).toBe(2)

      batchBuilder.addCertificate('cert1')
      expect(batchBuilder.getOperationCount()).toBe(3)
    })
  })

  describe('getOperations', () => {
    it('should return copy of operations', () => {
      batchBuilder.addDeployment('sdl1')
      const ops1 = batchBuilder.getOperations()
      const ops2 = batchBuilder.getOperations()

      expect(ops1).toEqual(ops2)
      expect(ops1).not.toBe(ops2) // Should be different array instances
    })

    it('should return empty array for empty batch', () => {
      expect(batchBuilder.getOperations()).toEqual([])
    })
  })

  describe('clear', () => {
    it('should clear all operations', () => {
      batchBuilder.addDeployment('sdl1')
      batchBuilder.addLease('123', 'akash1provider123456789012345678901234567890')
      expect(batchBuilder.getOperationCount()).toBe(2)

      const result = batchBuilder.clear()

      expect(result).toBe(batchBuilder)
      expect(batchBuilder.getOperationCount()).toBe(0)
      expect(batchBuilder.getOperations()).toEqual([])
    })

    it('should allow adding after clear', () => {
      batchBuilder.addDeployment('sdl1')
      batchBuilder.clear()
      batchBuilder.addLease('123', 'akash1provider123456789012345678901234567890')

      expect(batchBuilder.getOperationCount()).toBe(1)
    })
  })

  describe('execute', () => {
    it('should execute batch successfully', async () => {
      batchBuilder.addDeployment('sdl1')
      batchBuilder.addLease('123', 'akash1provider123456789012345678901234567890')

      const result = await batchBuilder.execute()

      expect(result).toMatchObject({
        transactionHash: expect.stringMatching(/^batch-tx-\d+$/),
        height: expect.any(Number),
        gasUsed: expect.any(Number),
        success: true
      })
    })

    it('should pass operations to manager', async () => {
      const executeSpy = vi.spyOn(batchManager, 'executeBatch')
      batchBuilder.addDeployment('sdl1')

      await batchBuilder.execute()

      expect(executeSpy).toHaveBeenCalledTimes(1)
      expect(executeSpy).toHaveBeenCalledWith(expect.any(Array))
    })
  })

  describe('builder pattern', () => {
    it('should support method chaining', () => {
      const result = batchBuilder
        .addDeployment('sdl1')
        .addLease('123', 'akash1provider123456789012345678901234567890')
        .addCertificate('cert1')

      expect(result).toBe(batchBuilder)
      expect(batchBuilder.getOperationCount()).toBe(3)
    })

    it('should create complex batch', () => {
      batchBuilder
        .addDeployment('sdl1')
        .addDeployment('sdl2')
        .addLease('123', 'akash1provider123456789012345678901234567890')
        .addLease('124', 'provider2')
        .addCertificate('cert1')

      expect(batchBuilder.getOperationCount()).toBe(5)
      const ops = batchBuilder.getOperations()
      expect(ops[0].typeUrl).toBe('/akash.deployment.v1beta3.MsgCreateDeployment')
      expect(ops[2].typeUrl).toBe('/akash.market.v1beta3.MsgCreateLease')
      expect(ops[4].typeUrl).toBe('/akash.cert.v1beta3.MsgCreateCertificate')
    })
  })
})

describe('Integration tests', () => {
  it('should complete full batch workflow', async () => {
    const manager = new BatchManager(mockProvider, mockWallet)
    const builder = await manager.createBatch()

    // Build batch
    builder
      .addDeployment('version: "2.0"')
      .addLease('123', 'akash1provider123456789012345678901234567890')
      .addCertificate('cert-data')

    // Validate
    const validation = manager.validateBatch(builder.getOperations())
    expect(validation.valid).toBe(true)

    // Simulate
    const simulation = await manager.simulateBatch(builder.getOperations())
    expect(simulation.gasEstimate).toBeGreaterThan(0)

    // Execute
    const result = await builder.execute()
    expect(result.success).toBe(true)

    // Get details
    const details = await manager.getTransactionDetails(result.transactionHash)
    expect(details).not.toBeNull()
    expect(details!.hash).toBe(result.transactionHash)
  })

  it('should handle partial failure scenario', async () => {
    const manager = new BatchManager(mockProvider, mockWallet)
    const builder = await manager.createBatch()

    // Add invalid operation
    builder.addDeployment('sdl1')
    const operations = builder.getOperations()
    operations.push({ typeUrl: '', value: {} })

    // Should fail validation
    await expect(manager.executeBatch(operations)).rejects.toThrow(ValidationError)
  })
})
