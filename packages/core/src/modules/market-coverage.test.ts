import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MarketManager } from './market'
import { AkashProvider } from '../providers/akash'
import { ValidationError, NetworkError } from '../errors'
import { BidState } from '@cryptoandcoffee/akash-jsdk-protobuf'

// Helper function to create proper IndexedTx mock
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

describe('MarketManager - Coverage Tests', () => {
  let marketManager: MarketManager
  let mockProvider: AkashProvider

  beforeEach(() => {
    mockProvider = {
      client: {
        searchTx: vi.fn()
      },
      ensureConnected: vi.fn()
    } as unknown as AkashProvider
    
    marketManager = new MarketManager(mockProvider)
  })

  describe('getOrder - Complete Coverage', () => {
    it('should get order successfully', async () => {
      const orderId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 1
      }

      const mockTxs = [createMockTx(12345, 'order-hash')]
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await marketManager.getOrder(orderId)

      expect(result).toMatchObject({
        orderId,
        state: 'open',
        spec: {
          name: 'default',
          requirements: {
            signedBy: { allOf: [], anyOf: [] },
            attributes: []
          },
          resources: []
        },
        createdAt: expect.any(Number)
      })
    })

    it('should return null when order not found', async () => {
      const orderId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 1
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await marketManager.getOrder(orderId)

      expect(result).toBeNull()
    })

    it('should validate complete order ID - missing owner', async () => {
      const orderId = {
        owner: '',
        dseq: '123',
        gseq: 1,
        oseq: 1
      }

      await expect(marketManager.getOrder(orderId))
        .rejects.toThrow('Complete order ID is required')
    })

    it('should validate complete order ID - missing dseq', async () => {
      const orderId = {
        owner: 'akash1owner',
        dseq: '',
        gseq: 1,
        oseq: 1
      }

      await expect(marketManager.getOrder(orderId))
        .rejects.toThrow('Complete order ID is required')
    })

    it('should validate complete order ID - missing gseq', async () => {
      const orderId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 0,
        oseq: 1
      }

      await expect(marketManager.getOrder(orderId))
        .rejects.toThrow('Complete order ID is required')
    })

    it('should validate complete order ID - missing oseq', async () => {
      const orderId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 0
      }

      await expect(marketManager.getOrder(orderId))
        .rejects.toThrow('Complete order ID is required')
    })

    it('should handle network errors', async () => {
      const orderId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 1
      }

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(marketManager.getOrder(orderId))
        .rejects.toThrow('Failed to get order')
    })
  })

  describe('createBid - Complete Coverage', () => {
    it('should create bid successfully', async () => {
      const bidRequest = {
        orderId: {
          owner: 'akash1owner',
          dseq: '123',
          gseq: 1,
          oseq: 1
        },
        provider: 'akash1provider',
        price: { denom: 'uakt', amount: '100' },
        deposit: { denom: 'uakt', amount: '50' }
      }

      const mockTxs = [createMockTx(12345, 'bid-hash')]
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await marketManager.createBid(bidRequest)

      expect(result).toMatchObject({
        bidId: {
          ...bidRequest.orderId,
          provider: bidRequest.provider
        },
        state: 'open',
        price: bidRequest.price,
        createdAt: 12345
      })
    })

    it('should validate bid request - missing orderId', async () => {
      const bidRequest = {
        orderId: null as any,
        provider: 'akash1provider',
        price: { denom: 'uakt', amount: '100' },
        deposit: { denom: 'uakt', amount: '50' }
      }

      await expect(marketManager.createBid(bidRequest))
        .rejects.toThrow('Order ID, provider, and price are required')
    })

    it('should validate bid request - missing provider', async () => {
      const bidRequest = {
        orderId: {
          owner: 'akash1owner',
          dseq: '123',
          gseq: 1,
          oseq: 1
        },
        provider: '',
        price: { denom: 'uakt', amount: '100' },
        deposit: { denom: 'uakt', amount: '50' }
      }

      await expect(marketManager.createBid(bidRequest))
        .rejects.toThrow('Order ID, provider, and price are required')
    })

    it('should validate bid request - missing price', async () => {
      const bidRequest = {
        orderId: {
          owner: 'akash1owner',
          dseq: '123',
          gseq: 1,
          oseq: 1
        },
        provider: 'akash1provider',
        price: null as any,
        deposit: { denom: 'uakt', amount: '50' }
      }

      await expect(marketManager.createBid(bidRequest))
        .rejects.toThrow('Order ID, provider, and price are required')
    })

    it('should validate positive price', async () => {
      const bidRequest = {
        orderId: {
          owner: 'akash1owner',
          dseq: '123',
          gseq: 1,
          oseq: 1
        },
        provider: 'akash1provider',
        price: { denom: 'uakt', amount: '0' },
        deposit: { denom: 'uakt', amount: '50' }
      }

      await expect(marketManager.createBid(bidRequest))
        .rejects.toThrow('Bid price must be positive')
    })

    it('should validate negative price', async () => {
      const bidRequest = {
        orderId: {
          owner: 'akash1owner',
          dseq: '123',
          gseq: 1,
          oseq: 1
        },
        provider: 'akash1provider',
        price: { denom: 'uakt', amount: '-10' },
        deposit: { denom: 'uakt', amount: '50' }
      }

      await expect(marketManager.createBid(bidRequest))
        .rejects.toThrow('Bid price must be positive')
    })

    it('should handle network errors', async () => {
      const bidRequest = {
        orderId: {
          owner: 'akash1owner',
          dseq: '123',
          gseq: 1,
          oseq: 1
        },
        provider: 'akash1provider',
        price: { denom: 'uakt', amount: '100' },
        deposit: { denom: 'uakt', amount: '50' }
      }

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(marketManager.createBid(bidRequest))
        .rejects.toThrow('Failed to create bid')
    })

    it('should handle empty transaction response', async () => {
      const bidRequest = {
        orderId: {
          owner: 'akash1owner',
          dseq: '123',
          gseq: 1,
          oseq: 1
        },
        provider: 'akash1provider',
        price: { denom: 'uakt', amount: '100' },
        deposit: { denom: 'uakt', amount: '50' }
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await marketManager.createBid(bidRequest)

      expect(result.createdAt).toEqual(expect.any(Number))
    })
  })

  describe('closeBid - Complete Coverage', () => {
    it('should close bid successfully', async () => {
      const bidId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      const mockTxs = [createMockTx(12345, 'close-bid-hash')]
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      await expect(marketManager.closeBid(bidId)).resolves.toBeUndefined()
    })

    it('should validate complete bid ID - missing owner', async () => {
      const bidId = {
        owner: '',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      await expect(marketManager.closeBid(bidId))
        .rejects.toThrow('Complete bid ID is required')
    })

    it('should validate complete bid ID - missing provider', async () => {
      const bidId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: ''
      }

      await expect(marketManager.closeBid(bidId))
        .rejects.toThrow('Complete bid ID is required')
    })

    it('should validate complete bid ID - missing dseq', async () => {
      const bidId = {
        owner: 'akash1owner',
        dseq: '',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      await expect(marketManager.closeBid(bidId))
        .rejects.toThrow('Complete bid ID is required')
    })

    it('should handle network errors', async () => {
      const bidId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(marketManager.closeBid(bidId))
        .rejects.toThrow('Failed to close bid')
    })
  })

  describe('getBid - Complete Coverage', () => {
    it('should get bid successfully', async () => {
      const bidId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      const mockTxs = [createMockTx(12345, 'bid-hash')]
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await marketManager.getBid(bidId)

      expect(result).toMatchObject({
        bidId,
        state: BidState.OPEN,
        price: { denom: 'uakt', amount: '100' },
        createdAt: expect.any(Number)
      })
    })

    it('should return null when bid not found', async () => {
      const bidId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await marketManager.getBid(bidId)

      expect(result).toBeNull()
    })

    it('should handle network errors', async () => {
      const bidId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(marketManager.getBid(bidId))
        .rejects.toThrow('Failed to get bid')
    })
  })

  describe('createLease - Complete Coverage', () => {
    it('should create lease successfully', async () => {
      const bidId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      const mockTxs = [createMockTx(12345, 'lease-hash')]
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await marketManager.createLease(bidId)

      expect(result).toMatch(/^lease-\d+$/)
    })

    it('should validate complete bid ID - missing owner', async () => {
      const bidId = {
        owner: '',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      await expect(marketManager.createLease(bidId))
        .rejects.toThrow('Complete bid ID is required')
    })

    it('should validate complete bid ID - missing provider', async () => {
      const bidId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: ''
      }

      await expect(marketManager.createLease(bidId))
        .rejects.toThrow('Complete bid ID is required')
    })

    it('should validate complete bid ID - missing dseq', async () => {
      const bidId = {
        owner: 'akash1owner',
        dseq: '',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      await expect(marketManager.createLease(bidId))
        .rejects.toThrow('Complete bid ID is required')
    })

    it('should handle network errors', async () => {
      const bidId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(marketManager.createLease(bidId))
        .rejects.toThrow('Failed to create lease')
    })
  })

  describe('closeLease - Complete Coverage', () => {
    it('should close lease successfully', async () => {
      const leaseId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      const mockTxs = [createMockTx(12345, 'close-lease-hash')]
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      await expect(marketManager.closeLease(leaseId)).resolves.toBeUndefined()
    })

    it('should validate complete lease ID - missing owner', async () => {
      const leaseId = {
        owner: '',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      await expect(marketManager.closeLease(leaseId))
        .rejects.toThrow('Complete lease ID is required')
    })

    it('should validate complete lease ID - missing provider', async () => {
      const leaseId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: ''
      }

      await expect(marketManager.closeLease(leaseId))
        .rejects.toThrow('Complete lease ID is required')
    })

    it('should validate complete lease ID - missing dseq', async () => {
      const leaseId = {
        owner: 'akash1owner',
        dseq: '',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      await expect(marketManager.closeLease(leaseId))
        .rejects.toThrow('Complete lease ID is required')
    })

    it('should handle network errors', async () => {
      const leaseId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(marketManager.closeLease(leaseId))
        .rejects.toThrow('Failed to close lease')
    })
  })

  describe('getLease - Complete Coverage', () => {
    it('should get lease successfully', async () => {
      const leaseId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      const mockTxs = [createMockTx(12345, 'lease-hash')]
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await marketManager.getLease(leaseId)

      expect(result).toMatchObject({
        leaseId,
        state: 'active',
        price: { denom: 'uakt', amount: '100' },
        createdAt: expect.any(Number),
        closedOn: 0
      })
    })

    it('should return null when lease not found', async () => {
      const leaseId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await marketManager.getLease(leaseId)

      expect(result).toBeNull()
    })

    it('should handle network errors', async () => {
      const leaseId = {
        owner: 'akash1owner',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(marketManager.getLease(leaseId))
        .rejects.toThrow('Failed to get lease')
    })
  })

  describe('getMarketStats - Complete Coverage', () => {
    it('should get market statistics successfully', async () => {
      const mockOrderTxs = [createMockTx(12345), createMockTx(12346)]
      const mockLeaseTxs = [createMockTx(12347)]
      const mockBidTxs = [createMockTx(12348), createMockTx(12349), createMockTx(12350)]

      vi.mocked(mockProvider['client']!.searchTx)
        .mockResolvedValueOnce(mockOrderTxs)
        .mockResolvedValueOnce(mockLeaseTxs)
        .mockResolvedValueOnce(mockBidTxs)

      const result = await marketManager.getMarketStats()

      expect(result).toMatchObject({
        totalOrders: 2,
        activeLeases: 1,
        totalBids: 3,
        averagePrice: { denom: 'uakt', amount: '1000' }
      })
    })

    it('should handle empty results', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await marketManager.getMarketStats()

      expect(result).toMatchObject({
        totalOrders: 0,
        activeLeases: 0,
        totalBids: 0,
        averagePrice: { denom: 'uakt', amount: '1000' }
      })
    })

    it('should handle network errors', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(marketManager.getMarketStats())
        .rejects.toThrow('Failed to get market stats')
    })
  })

  describe('listOrders with filters - Complete Coverage', () => {
    it('should list orders with owner filter', async () => {
      const mockTxs = [createMockTx(12345)]
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const filters = { owner: 'akash1specific' }
      const result = await marketManager.listOrders(filters)

      expect(result).toHaveLength(1)
      expect(result[0].orderId.owner).toBe('akash1specific')
    })

    it('should list orders with dseq filter', async () => {
      const mockTxs = [createMockTx(12345)]
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const filters = { dseq: '999' }
      const result = await marketManager.listOrders(filters)

      expect(result).toHaveLength(1)
      expect(result[0].orderId.dseq).toBe('999')
    })

    it('should handle network errors in listOrders', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(marketManager.listOrders())
        .rejects.toThrow('Failed to list orders')
    })
  })

  describe('listBids with filters - Complete Coverage', () => {
    it('should list bids with all filters', async () => {
      const mockTxs = [createMockTx(12345)]
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const filters = {
        owner: 'akash1owner',
        provider: 'akash1provider',
        dseq: '123',
        state: BidState.OPEN
      }
      const result = await marketManager.listBids(filters)

      expect(result).toHaveLength(1)
      expect(result[0].bidId.owner).toBe('akash1owner')
      expect(result[0].bidId.provider).toBe('akash1provider')
      expect(result[0].bidId.dseq).toBe('123')
      expect(result[0].state).toBe(BidState.OPEN)
    })

    it('should handle network errors in listBids', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(marketManager.listBids())
        .rejects.toThrow('Failed to list bids')
    })
  })

  describe('listLeases with filters - Complete Coverage', () => {
    it('should list leases with all filters', async () => {
      const mockTxs = [createMockTx(12345)]
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const filters = {
        owner: 'akash1owner',
        provider: 'akash1provider',
        dseq: '123',
        state: 'active' as any
      }
      const result = await marketManager.listLeases(filters)

      expect(result).toHaveLength(1)
      expect(result[0].leaseId.owner).toBe('akash1owner')
      expect(result[0].leaseId.provider).toBe('akash1provider')
      expect(result[0].leaseId.dseq).toBe('123')
      expect(result[0].state).toBe('active')
    })

    it('should handle network errors in listLeases', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(marketManager.listLeases())
        .rejects.toThrow('Failed to list leases')
    })
  })
})