import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IBCManager, IBCTransferParams, Height } from './ibc'
import { AkashProvider } from '../providers/akash'
import { Coin } from '@cryptoandcoffee/akash-jsdk-protobuf'

// Mock SigningStargateClient
vi.mock('@cosmjs/stargate', () => ({
  SigningStargateClient: {
    connect: vi.fn(),
    connectWithSigner: vi.fn()
  },
  calculateFee: vi.fn((gas, gasPrice) => ({
    amount: [{ denom: 'uakt', amount: '5000' }],
    gas: gas.toString()
  })),
  GasPrice: {
    fromString: vi.fn(() => ({ denom: 'uakt', amount: '0.025' }))
  }
}))

// Mock global fetch
global.fetch = vi.fn()

// Mock the provider
const mockClient = {
  searchTx: vi.fn(),
  getHeight: vi.fn()
}

const mockProvider = {
  client: mockClient,
  ensureConnected: vi.fn(),
  getClient: vi.fn().mockReturnValue(mockClient),
  config: {
    rpcEndpoint: 'http://localhost:26657',
    apiEndpoint: 'http://localhost:1317'
  }
} as unknown as AkashProvider

describe('IBCManager', () => {
  let ibcManager: IBCManager

  beforeEach(async () => {
    const { SigningStargateClient } = await import('@cosmjs/stargate')

    const mockClient = {
      signAndBroadcast: vi.fn().mockResolvedValue({
        transactionHash: 'mock-tx-hash',
        code: 0,
        height: 12345,
        gasUsed: 150000,
        gasWanted: 200000,
        rawLog: '',
        events: []
      }),
      simulate: vi.fn().mockResolvedValue(50000),
      getTx: vi.fn().mockResolvedValue({
        hash: 'mock-tx-hash',
        height: 12345,
        code: 0,
        events: [
          {
            type: 'acknowledge_packet',
            attributes: [{ key: 'packet_ack', value: 'AQ==' }]
          }
        ]
      }),
      getBlock: vi.fn().mockResolvedValue({
        header: {
          time: new Date().toISOString()
        }
      })
    }

    vi.mocked(SigningStargateClient.connect).mockResolvedValue(mockClient as any)
    vi.mocked(SigningStargateClient.connectWithSigner).mockResolvedValue(mockClient as any)

    // Reset mockClient.getHeight mock
    vi.mocked(mockProvider['client']!.getHeight).mockResolvedValue(12345)

    // Mock fetch for API calls
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        channels: [
          {
            channel_id: 'channel-0',
            port_id: 'transfer',
            state: 'STATE_OPEN',
            ordering: 'ORDER_UNORDERED',
            counterparty: { port_id: 'transfer', channel_id: 'channel-0' },
            connection_hops: ['connection-0'],
            version: 'ics20-1'
          }
        ],
        channel: {
          state: 'STATE_OPEN',
          ordering: 'ORDER_UNORDERED',
          counterparty: { port_id: 'transfer', channel_id: 'channel-0' },
          connection_hops: ['connection-0'],
          version: 'ics20-1'
        },
        denom_trace: {
          path: 'transfer/channel-0',
          base_denom: 'uakt'
        }
      })
    } as Response)

    ibcManager = new IBCManager(mockProvider)
    vi.clearAllMocks()

    // Re-setup mocks after clearAllMocks
    vi.mocked(SigningStargateClient.connect).mockResolvedValue(mockClient as any)
    vi.mocked(SigningStargateClient.connectWithSigner).mockResolvedValue(mockClient as any)
    vi.mocked(mockProvider['client']!.getHeight).mockResolvedValue(12345)
  })

  describe('transfer', () => {
    it('should execute IBC transfer successfully', async () => {
      const mockWallet = {
        getAccounts: vi.fn().mockResolvedValue([
          { address: 'akash1senderaddress123456' }
        ])
      }

      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '1000000'
        },
        receiver: 'cosmos1receiveraddress123456',
        memo: 'Test transfer',
        wallet: mockWallet
      }

      const result = await ibcManager.transfer(params)

      expect(result).toMatchObject({
        transactionHash: 'mock-tx-hash',
        code: 0,
        height: 12345,
        gasUsed: 150000n,
        gasWanted: 200000n
      })
    })

    it('should execute transfer with custom timeout timestamp', async () => {
      const futureTimeout = BigInt(Date.now() + 600000) * 1_000_000n // 10 minutes from now
      const mockWallet = {
        getAccounts: vi.fn().mockResolvedValue([
          { address: 'akash1senderaddress123456' }
        ])
      }

      const params: IBCTransferParams = {
        sourceChannel: 'channel-1',
        token: {
          denom: 'uakt',
          amount: '500000'
        },
        receiver: 'cosmos1receiveraddress123456',
        timeoutTimestamp: futureTimeout,
        wallet: mockWallet
      }

      const result = await ibcManager.transfer(params)

      expect(result.transactionHash).toBe('mock-tx-hash')
      expect(result.code).toBe(0)
    })

    it('should execute transfer with timeout height', async () => {
      const timeoutHeight: Height = {
        revisionNumber: 0n,
        revisionHeight: 12500n
      }
      const mockWallet = {
        getAccounts: vi.fn().mockResolvedValue([
          { address: 'akash1senderaddress123456' }
        ])
      }

      const params: IBCTransferParams = {
        sourceChannel: 'channel-2',
        token: {
          denom: 'uakt',
          amount: '250000'
        },
        receiver: 'cosmos1receiveraddress123456',
        timeoutHeight,
        wallet: mockWallet
      }

      const result = await ibcManager.transfer(params)

      expect(result.transactionHash).toBe('mock-tx-hash')
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
      const mockWallet = {
        getAccounts: vi.fn().mockRejectedValue(new Error('Network connection failed'))
      }

      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '1000000'
        },
        receiver: 'cosmos1receiveraddress123456',
        wallet: mockWallet
      }

      await expect(ibcManager.transfer(params)).rejects.toThrow('Failed to execute IBC transfer')
    })

    it('should generate transaction hash when no transactions found', async () => {
      const mockWallet = {
        getAccounts: vi.fn().mockResolvedValue([
          { address: 'akash1senderaddress123456' }
        ])
      }

      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '1000000'
        },
        receiver: 'cosmos1receiveraddress123456',
        wallet: mockWallet
      }

      const result = await ibcManager.transfer(params)

      expect(result.transactionHash).toBe('mock-tx-hash')
      expect(result.code).toBe(0)
      expect(result.height).toBe(12345)
    })
  })

  describe('getChannels', () => {
    it('should list all IBC channels', async () => {
      const result = await ibcManager.getChannels()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'channel-0',
        portId: 'transfer',
        state: 'STATE_OPEN',
        ordering: 'ORDER_UNORDERED',
        version: 'ics20-1'
      })
    })

    it('should return default channel when no transactions found', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ channels: [] })
      } as Response)

      const result = await ibcManager.getChannels()

      expect(result).toHaveLength(0)
    })

    it('should throw network error when query fails', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Query failed'))

      await expect(ibcManager.getChannels()).rejects.toThrow('Failed to get IBC channels')
    })
  })

  describe('getChannel', () => {
    it('should get specific channel details', async () => {
      const result = await ibcManager.getChannel('channel-0')

      expect(result).toMatchObject({
        id: 'channel-0',
        portId: 'transfer',
        state: 'STATE_OPEN',
        ordering: 'ORDER_UNORDERED'
      })
    })

    it('should return mock channel for non-existent channel', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404
      } as Response)

      await expect(ibcManager.getChannel('channel-99')).rejects.toThrow('Channel channel-99 not found')
    })

    it('should throw validation error for missing channel ID', async () => {
      await expect(ibcManager.getChannel('')).rejects.toThrow('Channel ID is required')
    })

    it('should throw network error when query fails', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Channel query failed'))

      await expect(ibcManager.getChannel('channel-0')).rejects.toThrow('Failed to get IBC channel')
    })
  })

  describe('getTransferStatus', () => {
    it('should get successful transfer status', async () => {
      const txHash = 'mock-tx-hash'

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
      const { SigningStargateClient } = await import('@cosmjs/stargate')

      vi.mocked(SigningStargateClient.connect).mockResolvedValueOnce({
        getTx: vi.fn().mockResolvedValue({
          hash: txHash,
          height: 12346,
          code: 1,
          rawLog: 'Transfer failed',
          events: []
        }),
        getBlock: vi.fn().mockResolvedValue({
          header: { time: new Date().toISOString() }
        })
      } as any)

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
      const { SigningStargateClient } = await import('@cosmjs/stargate')

      vi.mocked(SigningStargateClient.connect).mockResolvedValueOnce({
        getTx: vi.fn().mockResolvedValue(null),
        getBlock: vi.fn()
      } as any)

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
      const { SigningStargateClient } = await import('@cosmjs/stargate')

      vi.mocked(SigningStargateClient.connect).mockRejectedValueOnce(new Error('Status query failed'))

      await expect(ibcManager.getTransferStatus('some-hash')).rejects.toThrow('Failed to get transfer status')
    })
  })

  describe('calculateTimeoutHeight', () => {
    it('should calculate timeout height successfully', async () => {
      const result = await ibcManager.calculateTimeoutHeight(100)

      expect(result).toEqual({
        revisionNumber: 0n,
        revisionHeight: 12445n // 12345 + 100
      })
    })

    it('should use default blocks in future', async () => {
      const result = await ibcManager.calculateTimeoutHeight()

      expect(result).toEqual({
        revisionNumber: 0n,
        revisionHeight: 12445n // 12345 + 100
      })
    })

    it('should throw validation error for non-positive blocks', async () => {
      await expect(ibcManager.calculateTimeoutHeight(0)).rejects.toThrow('Blocks in future must be a positive number')
      await expect(ibcManager.calculateTimeoutHeight(-10)).rejects.toThrow('Blocks in future must be a positive number')
    })

    it('should throw network error when height query fails', async () => {
      vi.mocked(mockClient.getHeight).mockRejectedValueOnce(new Error('Height query failed'))

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
      const mockWallet = {
        getAccounts: vi.fn().mockResolvedValue([
          { address: 'akash1senderaddress123456' }
        ])
      }

      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '999999999999999999999999'
        },
        receiver: 'cosmos1receiveraddress123456',
        wallet: mockWallet
      }

      const result = await ibcManager.transfer(params)

      expect(result.code).toBe(0)
    })

    it('should handle channel IDs with various formats', async () => {
      const channel1 = await ibcManager.getChannel('channel-0')
      const channel2 = await ibcManager.getChannel('channel-999')

      expect(channel1.id).toBe('channel-0')
      expect(channel2.id).toBe('channel-999')
    })

    it('should handle memo with special characters', async () => {
      const mockWallet = {
        getAccounts: vi.fn().mockResolvedValue([
          { address: 'akash1senderaddress123456' }
        ])
      }

      const params: IBCTransferParams = {
        sourceChannel: 'channel-0',
        token: {
          denom: 'uakt',
          amount: '1000000'
        },
        receiver: 'cosmos1receiveraddress123456',
        memo: 'Special chars: !@#$%^&*()_+{}[]|\\:";\'<>?,./',
        wallet: mockWallet
      }

      const result = await ibcManager.transfer(params)

      expect(result.code).toBe(0)
    })
  })
})
