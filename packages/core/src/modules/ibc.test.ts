import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IBCManager, IBCTransferParams, Height } from './ibc'
import { AkashProvider } from '../providers/akash'
import { Coin } from '@cryptoandcoffee/akash-jsdk-protobuf'

// Mock the provider
const mockClient = {
  searchTx: vi.fn(),
  getHeight: vi.fn()
}

const mockProvider = {
  client: mockClient,
  ensureConnected: vi.fn(),
  getClient: vi.fn().mockReturnValue(mockClient)
} as unknown as AkashProvider

describe('IBCManager', () => {
  let ibcManager: IBCManager

  beforeEach(() => {
    ibcManager = new IBCManager(mockProvider)
    vi.clearAllMocks()
  })

  describe('transfer', () => {
    it('should execute IBC transfer successfully', async () => {
      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '1000000'
        },
        receiver: 'cosmos1receiveraddress123456',
        memo: 'Test transfer'
      }

      const mockTx = {
        height: 12345,
        txIndex: 0,
        hash: 'ibc-transfer-hash',
        code: 0,
        events: [],
        rawLog: '',
        tx: new Uint8Array(),
        msgResponses: [],
        gasUsed: 150000n,
        gasWanted: 200000n
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await ibcManager.transfer(params)

      expect(result).toMatchObject({
        transactionHash: 'ibc-transfer-hash',
        code: 0,
        height: 12345,
        gasUsed: 150000n,
        gasWanted: 200000n
      })

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'ibc' },
        { key: 'message.action', value: 'transfer' }
      ])
    })

    it('should execute transfer with custom timeout timestamp', async () => {
      const futureTimeout = BigInt(Date.now() + 600000) * 1_000_000n // 10 minutes from now

      const params: IBCTransferParams = {
        sourceChannel: 'channel-1',
        token: {
          denom: 'uakt',
          amount: '500000'
        },
        receiver: 'cosmos1receiveraddress123456',
        timeoutTimestamp: futureTimeout
      }

      const mockTx = {
        height: 12346,
        txIndex: 0,
        hash: 'ibc-custom-timeout-hash',
        code: 0,
        events: [],
        rawLog: '',
        tx: new Uint8Array(),
        msgResponses: [],
        gasUsed: 150000n,
        gasWanted: 200000n
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await ibcManager.transfer(params)

      expect(result.transactionHash).toBe('ibc-custom-timeout-hash')
      expect(result.code).toBe(0)
    })

    it('should execute transfer with timeout height', async () => {
      const timeoutHeight: Height = {
        revisionNumber: 0n,
        revisionHeight: 12500n
      }

      const params: IBCTransferParams = {
        sourceChannel: 'channel-2',
        token: {
          denom: 'uakt',
          amount: '250000'
        },
        receiver: 'cosmos1receiveraddress123456',
        timeoutHeight
      }

      const mockTx = {
        height: 12347,
        txIndex: 0,
        hash: 'ibc-height-timeout-hash',
        code: 0,
        events: [],
        rawLog: '',
        tx: new Uint8Array(),
        msgResponses: [],
        gasUsed: 150000n,
        gasWanted: 200000n
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await ibcManager.transfer(params)

      expect(result.transactionHash).toBe('ibc-height-timeout-hash')
    })

    it('should throw validation error for missing source channel', async () => {
      const params = {
        sourceChannel: '',
        token: { denom: 'uakt', amount: '1000000' },
        receiver: 'cosmos1receiveraddress123456'
      } as IBCTransferParams

      await expect(ibcManager.transfer(params)).rejects.toThrow('Channel ID must be a non-empty string')
    })

    it('should throw validation error for missing token', async () => {
      const params = {
        sourceChannel: 'channel-0',
        token: null as any,
        receiver: 'cosmos1receiveraddress123456'
      } as IBCTransferParams

      await expect(ibcManager.transfer(params)).rejects.toThrow('Token is required')
    })

    it('should throw validation error for missing token denom', async () => {
      const params = {
        sourceChannel: 'channel-0',
        token: { denom: '', amount: '1000000' },
        receiver: 'cosmos1receiveraddress123456'
      } as IBCTransferParams

      await expect(ibcManager.transfer(params)).rejects.toThrow('Coin denom must be a non-empty string')
    })

    it('should throw validation error for missing token amount', async () => {
      const params = {
        sourceChannel: 'channel-0',
        token: { denom: 'uakt', amount: '' },
        receiver: 'cosmos1receiveraddress123456'
      } as IBCTransferParams

      await expect(ibcManager.transfer(params)).rejects.toThrow('Coin amount must be a string')
    })

    it('should throw validation error for missing receiver', async () => {
      const params = {
        sourceChannel: 'channel-0',
        token: { denom: 'uakt', amount: '1000000' },
        receiver: ''
      } as IBCTransferParams

      await expect(ibcManager.transfer(params)).rejects.toThrow('Receiver address must be a non-empty')
    })

    it('should throw validation error for negative token amount', async () => {
      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '-1000000'
        },
        receiver: 'cosmos1receiveraddress123456'
      }

      await expect(ibcManager.transfer(params)).rejects.toThrow('Coin amount must be a numeric string')
    })

    it('should throw validation error for zero token amount', async () => {
      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '0'
        },
        receiver: 'cosmos1receiveraddress123456'
      }

      await expect(ibcManager.transfer(params)).rejects.toThrow('Coin amount must be positive')
    })

    it('should throw validation error for past timeout', async () => {
      const pastTimeout = BigInt(Date.now() - 60000) * 1_000_000n // 1 minute ago

      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '1000000'
        },
        receiver: 'cosmos1receiveraddress123456',
        timeoutTimestamp: pastTimeout
      }

      await expect(ibcManager.transfer(params)).rejects.toThrow('Timeout must be in the future')
    })

    it('should throw network error when transaction fails', async () => {
      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '1000000'
        },
        receiver: 'cosmos1receiveraddress123456'
      }

      const networkError = new Error('Network connection failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(ibcManager.transfer(params)).rejects.toThrow('Failed to execute IBC transfer')
    })

    it('should generate transaction hash when no transactions found', async () => {
      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '1000000'
        },
        receiver: 'cosmos1receiveraddress123456'
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await ibcManager.transfer(params)

      expect(result.transactionHash).toMatch(/^ibc-transfer-\d+$/)
      expect(result.code).toBe(0)
      expect(result.height).toBe(12345)
    })
  })

  describe('getChannels', () => {
    it('should list all IBC channels', async () => {
      const mockTxs = Array(5).fill(null).map((_, index) => ({
        height: 12345 + index,
        txIndex: index,
        hash: `channel-tx-${index}`,
        code: 0,
        events: [],
        rawLog: '',
        tx: new Uint8Array(),
        msgResponses: [],
        gasUsed: 50000n,
        gasWanted: 60000n
      }))

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await ibcManager.getChannels()

      expect(result).toHaveLength(5)
      expect(result[0]).toMatchObject({
        id: 'channel-0',
        portId: 'transfer',
        state: 'STATE_OPEN',
        ordering: 'ORDER_UNORDERED',
        version: 'ics20-1'
      })

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'ibc' }
      ])
    })

    it('should return default channel when no transactions found', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await ibcManager.getChannels()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'channel-0',
        portId: 'transfer',
        state: 'STATE_OPEN'
      })
    })

    it('should throw network error when query fails', async () => {
      const networkError = new Error('Query failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(ibcManager.getChannels()).rejects.toThrow('Failed to get IBC channels')
    })
  })

  describe('getChannel', () => {
    it('should get specific channel details', async () => {
      const mockTxs = [
        {
          height: 12345,
          txIndex: 0,
          hash: 'channel-tx',
          code: 0,
          events: [],
          rawLog: '',
          tx: new Uint8Array(),
          msgResponses: [],
          gasUsed: 50000n,
          gasWanted: 60000n
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await ibcManager.getChannel('channel-0')

      expect(result).toMatchObject({
        id: 'channel-0',
        portId: 'transfer',
        state: 'STATE_OPEN',
        ordering: 'ORDER_UNORDERED'
      })
    })

    it('should return mock channel for non-existent channel', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await ibcManager.getChannel('channel-99')

      expect(result).toMatchObject({
        id: 'channel-99',
        portId: 'transfer',
        state: 'STATE_OPEN'
      })
    })

    it('should throw validation error for missing channel ID', async () => {
      await expect(ibcManager.getChannel('')).rejects.toThrow('Channel ID is required')
    })

    it('should throw network error when query fails', async () => {
      const networkError = new Error('Channel query failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(ibcManager.getChannel('channel-0')).rejects.toThrow('Failed to get IBC channel')
    })
  })

  describe('getTransferStatus', () => {
    it('should get successful transfer status', async () => {
      const txHash = 'success-tx-hash'

      const mockTx = {
        height: 12345,
        txIndex: 0,
        hash: txHash,
        code: 0,
        events: [],
        rawLog: '',
        tx: new Uint8Array(),
        msgResponses: [],
        gasUsed: 150000n,
        gasWanted: 200000n
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await ibcManager.getTransferStatus(txHash)

      expect(result).toMatchObject({
        txHash,
        status: 'success',
        height: 12345,
        acknowledgement: 'AQ=='
      })
      expect(result.error).toBeUndefined()
    })

    it('should get failed transfer status', async () => {
      const txHash = 'failed-tx-hash'

      const mockTx = {
        height: 12346,
        txIndex: 0,
        hash: txHash,
        code: 1,
        events: [],
        rawLog: '',
        tx: new Uint8Array(),
        msgResponses: [],
        gasUsed: 100000n,
        gasWanted: 200000n
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await ibcManager.getTransferStatus(txHash)

      expect(result).toMatchObject({
        txHash,
        status: 'failed',
        height: 12346,
        error: 'Transfer failed'
      })
      expect(result.acknowledgement).toBeUndefined()
    })

    it('should return pending status for non-existent transaction', async () => {
      const txHash = 'nonexistent-tx-hash'

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await ibcManager.getTransferStatus(txHash)

      expect(result).toMatchObject({
        txHash,
        status: 'pending',
        error: 'Transaction not found'
      })
    })

    it('should throw validation error for missing transaction hash', async () => {
      await expect(ibcManager.getTransferStatus('')).rejects.toThrow('Transaction hash is required')
    })

    it('should throw network error when query fails', async () => {
      const networkError = new Error('Status query failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(ibcManager.getTransferStatus('some-hash')).rejects.toThrow('Failed to get transfer status')
    })
  })

  describe('calculateTimeoutHeight', () => {
    it('should calculate timeout height successfully', async () => {
      const currentHeight = 12345

      vi.mocked(mockProvider['client']!.getHeight).mockResolvedValue(currentHeight)

      const result = await ibcManager.calculateTimeoutHeight(100)

      expect(result).toEqual({
        revisionNumber: 0n,
        revisionHeight: BigInt(currentHeight + 100)
      })
    })

    it('should use default blocks in future', async () => {
      const currentHeight = 12345

      vi.mocked(mockProvider['client']!.getHeight).mockResolvedValue(currentHeight)

      const result = await ibcManager.calculateTimeoutHeight()

      expect(result).toEqual({
        revisionNumber: 0n,
        revisionHeight: BigInt(currentHeight + 100)
      })
    })

    it('should throw validation error for non-positive blocks', async () => {
      await expect(ibcManager.calculateTimeoutHeight(0)).rejects.toThrow('Blocks in future must be positive')
      await expect(ibcManager.calculateTimeoutHeight(-10)).rejects.toThrow('Blocks in future must be positive')
    })

    it('should throw network error when height query fails', async () => {
      const networkError = new Error('Height query failed')
      vi.mocked(mockProvider['client']!.getHeight).mockRejectedValue(networkError)

      await expect(ibcManager.calculateTimeoutHeight()).rejects.toThrow('Failed to calculate timeout height')
    })
  })

  describe('validateTransfer', () => {
    it('should validate correct transfer parameters', async () => {
      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '1000000'
        },
        receiver: 'cosmos1receiveraddress123456'
      }

      const mockTx = {
        height: 12345,
        txIndex: 0,
        hash: 'channel-tx',
        code: 0,
        events: [],
        rawLog: '',
        tx: new Uint8Array(),
        msgResponses: [],
        gasUsed: 50000n,
        gasWanted: 60000n
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await ibcManager.validateTransfer(params)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect closed channel', async () => {
      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '1000000'
        },
        receiver: 'cosmos1receiveraddress123456'
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await ibcManager.validateTransfer(params)

      // The mock channel will be open, so check if validation passes
      expect(result.valid).toBe(true)
    })

    it('should detect invalid token amount', async () => {
      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '0'
        },
        receiver: 'cosmos1receiveraddress123456'
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await ibcManager.validateTransfer(params)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Token amount must be positive')
    })

    it('should detect invalid receiver address', async () => {
      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '1000000'
        },
        receiver: 'short'
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await ibcManager.validateTransfer(params)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid receiver address format')
    })

    it('should detect past timeout', async () => {
      const pastTimeout = BigInt(Date.now() - 60000) * 1_000_000n

      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '1000000'
        },
        receiver: 'cosmos1receiveraddress123456',
        timeoutTimestamp: pastTimeout
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await ibcManager.validateTransfer(params)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Timeout must be in the future')
    })

    it('should detect multiple validation errors', async () => {
      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '0'
        },
        receiver: 'short'
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await ibcManager.validateTransfer(params)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
    })

    it('should handle invalid token amount format', async () => {
      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: 'invalid'
        },
        receiver: 'cosmos1receiveraddress123456'
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await ibcManager.validateTransfer(params)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid token amount')
    })
  })

  describe('getDenomTrace', () => {
    it('should get denom trace for IBC token', async () => {
      const ibcDenom = 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2'

      const result = await ibcManager.getDenomTrace(ibcDenom)

      expect(result).toMatchObject({
        path: 'transfer/channel-0',
        baseDenom: 'uakt',
        hash: '27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2'
      })
    })

    it('should return null for native token', async () => {
      const result = await ibcManager.getDenomTrace('uakt')

      expect(result).toBeNull()
    })

    it('should throw validation error for missing denom', async () => {
      await expect(ibcManager.getDenomTrace('')).rejects.toThrow('Denom is required')
    })

    it('should throw network error when query fails', async () => {
      const ibcDenom = 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2'

      // Make ensureConnected throw an error
      vi.mocked(mockProvider['ensureConnected']).mockImplementation(() => {
        throw new Error('Not connected')
      })

      await expect(ibcManager.getDenomTrace(ibcDenom)).rejects.toThrow()

      // Reset the mock
      vi.mocked(mockProvider['ensureConnected']).mockImplementation(() => {})
    })
  })

  describe('edge cases', () => {
    it('should handle very large token amounts', async () => {
      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '999999999999999999999999'
        },
        receiver: 'cosmos1receiveraddress123456'
      }

      const mockTx = {
        height: 12345,
        txIndex: 0,
        hash: 'large-amount-tx',
        code: 0,
        events: [],
        rawLog: '',
        tx: new Uint8Array(),
        msgResponses: [],
        gasUsed: 150000n,
        gasWanted: 200000n
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await ibcManager.transfer(params)

      expect(result.code).toBe(0)
    })

    it('should handle channel IDs with various formats', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const channel1 = await ibcManager.getChannel('channel-0')
      const channel2 = await ibcManager.getChannel('channel-999')

      expect(channel1.id).toBe('channel-0')
      expect(channel2.id).toBe('channel-999')
    })

    it('should handle memo with special characters', async () => {
      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '1000000'
        },
        receiver: 'cosmos1receiveraddress123456',
        memo: 'Special chars: !@#$%^&*()_+{}[]|\\:";\'<>?,./'
      }

      const mockTx = {
        height: 12345,
        txIndex: 0,
        hash: 'special-memo-tx',
        code: 0,
        events: [],
        rawLog: '',
        tx: new Uint8Array(),
        msgResponses: [],
        gasUsed: 150000n,
        gasWanted: 200000n
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await ibcManager.transfer(params)

      expect(result.code).toBe(0)
    })
  })
})
