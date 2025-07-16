import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MarketManager } from './market'
import { AkashProvider } from '../providers/akash'

// Mock the provider
const mockProvider = {
  client: {
    searchTx: vi.fn()
  },
  ensureConnected: vi.fn()
} as unknown as AkashProvider

describe('MarketManager', () => {
  let marketManager: MarketManager

  beforeEach(() => {
    marketManager = new MarketManager(mockProvider)
    vi.clearAllMocks()
  })

  describe('listOrders', () => {
    it('should list orders with default filters', async () => {
      const mockTxs = [
        {
          height: 12345,
          hash: 'tx-hash-1',
          gasUsed: 50000,
          gasWanted: 60000,
          events: []
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await marketManager.listOrders()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        orderId: {
          owner: 'akash1mock',
          dseq: '12345',
          gseq: 1,
          oseq: 1
        },
        state: 'open',
        createdAt: expect.any(Number)
      })
    })

    it('should list orders with custom filters', async () => {
      const filters = { state: 'closed' as const }
      
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await marketManager.listOrders(filters)

      expect(result).toEqual([])
    })
  })

  describe('createBid', () => {
    it('should create bid successfully', async () => {
      const bidParams = {
        orderId: {
          owner: 'akash1test',
          dseq: '123',
          gseq: 1,
          oseq: 1
        },
        provider: 'akash1provider',
        price: { denom: 'uakt', amount: '1000' },
        deposit: { denom: 'uakt', amount: '5000' }
      }

      const mockTx = {
        height: 12346,
        hash: 'bid-tx-hash',
        gasUsed: 50000,
        gasWanted: 60000,
        events: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await marketManager.createBid(bidParams)

      expect(result).toMatchObject({
        bidId: {
          ...bidParams.orderId,
          provider: bidParams.provider
        },
        state: 'open',
        price: bidParams.price,
        createdAt: expect.any(Number)
      })
    })
  })

  describe('listLeases', () => {
    it('should list leases with empty filters', async () => {
      const filters = {} // Empty filters to trigger fallback owner
      const mockTxs = [
        {
          height: 12348,
          hash: 'lease-tx-hash',
          gasUsed: 50000,
          gasWanted: 60000,
          events: []
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await marketManager.listLeases(filters)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        leaseId: {
          owner: 'akash1owner', // Should use fallback owner
          dseq: '12348'
        },
        state: 'active',
        createdAt: expect.any(Number)
      })
    })

    it('should list leases for owner', async () => {
      const owner = 'akash1test'
      const mockTxs = [
        {
          height: 12348,
          hash: 'lease-tx-hash',
          gasUsed: 50000,
          gasWanted: 60000,
          events: []
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await marketManager.listLeases({ owner })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        leaseId: {
          owner,
          dseq: '12348'
        },
        state: 'active',
        createdAt: expect.any(Number)
      })
    })
  })

  describe('getOrder', () => {
    it('should get specific order', async () => {
      const orderId = {
        owner: 'akash1test',
        dseq: '123',
        gseq: 1,
        oseq: 1
      }
      const mockTx = {
        height: 12345,
        hash: 'order-tx-hash',
        gasUsed: 50000,
        gasWanted: 60000,
        events: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await marketManager.getOrder(orderId)

      expect(result).toMatchObject({
        orderId,
        state: 'open',
        createdAt: expect.any(Number)
      })
    })

    it('should return null for non-existent order', async () => {
      const orderId = {
        owner: 'akash1test',
        dseq: '999',
        gseq: 1,
        oseq: 1
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await marketManager.getOrder(orderId)

      expect(result).toBeNull()
    })
  })

  describe('closeBid', () => {
    it('should close bid successfully', async () => {
      const bidId = {
        owner: 'akash1test',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      const mockTx = {
        height: 12347,
        hash: 'close-bid-tx',
        gasUsed: 40000,
        gasWanted: 50000,
        events: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      await marketManager.closeBid(bidId)

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'market' },
        { key: 'message.action', value: 'bid-closed' },
        { key: 'bid.provider', value: bidId.provider }
      ])
    })
  })

  describe('getBid', () => {
    it('should get specific bid', async () => {
      const bidId = {
        owner: 'akash1test',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }
      const mockTx = {
        height: 12348,
        hash: 'bid-tx-hash',
        gasUsed: 50000,
        gasWanted: 60000,
        events: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await marketManager.getBid(bidId)

      expect(result).toMatchObject({
        bidId,
        state: expect.any(Number), // BidState enum value
        price: { denom: 'uakt', amount: '100' },
        createdAt: expect.any(Number)
      })
    })

    it('should return null for non-existent bid', async () => {
      const bidId = {
        owner: 'akash1test',
        dseq: '999',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await marketManager.getBid(bidId)

      expect(result).toBeNull()
    })
  })

  describe('listBids', () => {
    it('should list bids with empty filters', async () => {
      const filters = {} // Empty filters to trigger fallback owner
      const mockTxs = [
        {
          height: 12349,
          hash: 'bid-tx-1',
          gasUsed: 50000,
          gasWanted: 60000,
          events: []
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await marketManager.listBids(filters)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        bidId: {
          owner: 'akash1owner', // Should use fallback owner
          dseq: '12349'
        }
      })
    })

    it('should list bids with filters', async () => {
      const filters = { owner: 'akash1test' }
      const mockTxs = [
        {
          height: 12349,
          hash: 'bid-tx-1',
          gasUsed: 50000,
          gasWanted: 60000,
          events: []
        },
        {
          height: 12350,
          hash: 'bid-tx-2',
          gasUsed: 55000,
          gasWanted: 65000,
          events: []
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await marketManager.listBids(filters)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        bidId: {
          owner: 'akash1test',
          dseq: '12349',
          gseq: 1,
          oseq: 1,
          provider: 'akash1provider0'
        },
        state: expect.any(Number), // BidState enum value
        createdAt: expect.any(Number)
      })
    })
  })

  describe('createLease', () => {
    it('should create lease from bid', async () => {
      const bidId = {
        owner: 'akash1test',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      const mockTx = {
        height: 12351,
        hash: 'create-lease-tx',
        gasUsed: 60000,
        gasWanted: 70000,
        events: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await marketManager.createLease(bidId)

      expect(result).toMatch(/^lease-\d+$/)
      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'market' },
        { key: 'message.action', value: 'lease-created' }
      ])
    })
  })

  describe('closeLease', () => {
    it('should close lease successfully', async () => {
      const leaseId = {
        owner: 'akash1test',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      const mockTx = {
        height: 12352,
        hash: 'close-lease-tx',
        gasUsed: 45000,
        gasWanted: 55000,
        events: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      await marketManager.closeLease(leaseId)

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'market' },
        { key: 'message.action', value: 'lease-closed' },
        { key: 'lease.provider', value: leaseId.provider }
      ])
    })
  })

  describe('getLease', () => {
    it('should get specific lease', async () => {
      const leaseId = {
        owner: 'akash1test',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }
      const mockTx = {
        height: 12353,
        hash: 'lease-tx-hash',
        gasUsed: 50000,
        gasWanted: 60000,
        events: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await marketManager.getLease(leaseId)

      expect(result).toMatchObject({
        leaseId,
        state: 'active',
        price: { denom: 'uakt', amount: '100' },
        createdAt: expect.any(Number)
      })
    })

    it('should return null for non-existent lease', async () => {
      const leaseId = {
        owner: 'akash1test',
        dseq: '999',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await marketManager.getLease(leaseId)

      expect(result).toBeNull()
    })
  })

  describe('getMarketStats', () => {
    it('should return market statistics', async () => {
      // Mock multiple transaction searches for different stats
      vi.mocked(mockProvider['client']!.searchTx)
        .mockResolvedValueOnce([{ height: 1 }, { height: 2 }]) // orders
        .mockResolvedValueOnce([{ height: 3 }]) // leases
        .mockResolvedValueOnce([{ height: 4 }, { height: 5 }, { height: 6 }]) // bids

      const result = await marketManager.getMarketStats()

      expect(result).toMatchObject({
        totalOrders: 2,
        activeLeases: 1,
        totalBids: 3,
        averagePrice: { denom: 'uakt', amount: '1000' }
      })
    })
  })
})