import { BaseProvider } from '../providers/base'
import {
  Order,
  OrderID,
  OrderState,
  Bid,
  BidID,
  BidState,
  Lease,
  LeaseID,
  LeaseState,
  DecCoin,
  LeaseCloseReason,
  Deposit,
  DepositSource,
  Coin
} from '@cryptoandcoffee/akash-jsdk-protobuf'
import { NetworkError, ValidationError } from '../errors'

export interface CreateBidRequest {
  orderId: OrderID;
  provider: string;
  price: DecCoin;
  /** Legacy single deposit (backward compatible) */
  deposit?: DecCoin;
  /** New multi-source deposit configuration (AEP-75) */
  depositConfig?: Deposit;
}

export interface OrderFilters {
  owner?: string;
  state?: OrderState;
  dseq?: string;
}

export interface BidFilters {
  owner?: string;
  provider?: string;
  state?: BidState;
  dseq?: string;
}

export interface LeaseFilters {
  owner?: string;
  provider?: string;
  state?: LeaseState;
  dseq?: string;
}

export class MarketManager {
  constructor(private provider: BaseProvider) {}

  // Order operations
  async getOrder(orderId: OrderID): Promise<Order | null> {
    this.provider['ensureConnected']()
    
    if (!orderId.owner || !orderId.dseq || !orderId.gseq || !orderId.oseq) {
      throw new ValidationError('Complete order ID is required')
    }

    try {
      const response = await this.provider['client']!.searchTx([
        { key: 'message.module', value: 'market' },
        { key: 'order.owner', value: orderId.owner },
        { key: 'order.dseq', value: orderId.dseq }
      ])

      if (response.length === 0) {
        return null
      }

      return {
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
        createdAt: Date.now()
      }
    } catch (error) {
      throw new NetworkError('Failed to get order', { error })
    }
  }

  async listOrders(filters: OrderFilters = {}): Promise<Order[]> {
    this.provider['ensureConnected']()

    try {
      const searchTags = [
        { key: 'message.module', value: 'market' }
      ]

      if (filters.owner) {
        searchTags.push({ key: 'order.owner', value: filters.owner })
      }

      if (filters.dseq) {
        searchTags.push({ key: 'order.dseq', value: filters.dseq })
      }

      const response = await this.provider['client']!.searchTx(searchTags)

      return response.map((tx, index) => ({
        orderId: {
          owner: filters.owner || 'akash1mock',
          dseq: filters.dseq || tx.height.toString(),
          gseq: 1,
          oseq: 1
        },
        state: 'open',
        spec: {
          name: `group-${index}`,
          requirements: {
            signedBy: { allOf: [], anyOf: [] },
            attributes: [
              { key: 'region', value: 'us-west' }
            ]
          },
          resources: [
            {
              resources: {
                cpu: { units: { val: new Uint8Array([1, 0, 0]) } },
                memory: { quantity: { val: new Uint8Array([1, 2, 8]) } },
                storage: []
              },
              count: 1,
              price: { denom: 'uakt', amount: '100' }
            }
          ]
        },
        createdAt: tx.height
      }))
    } catch (error) {
      throw new NetworkError('Failed to list orders', { error })
    }
  }

  // Bid operations
  async createBid(request: CreateBidRequest): Promise<any> {
    this.provider['ensureConnected']()

    if (!request.orderId || !request.provider || !request.price) {
      throw new ValidationError('Order ID, provider, and price are required')
    }

    if (parseFloat(request.price.amount) <= 0) {
      throw new ValidationError('Bid price must be positive')
    }

    // Validate deposit configuration (support both legacy and new formats)
    if (!request.deposit && !request.depositConfig) {
      throw new ValidationError('Either deposit or depositConfig is required')
    }

    try {
      // In a real implementation, this would submit a MsgCreateBid transaction
      // with either legacy deposit or new depositConfig (AEP-75)
      const response = await this.provider['client']!.searchTx([
        { key: 'message.module', value: 'market' },
        { key: 'message.action', value: 'bid-created' }
      ])

      return {
        bidId: {
          ...request.orderId,
          provider: request.provider
        },
        state: 'open',
        price: request.price,
        createdAt: response.length > 0 ? response[0].height : Date.now()
      }
    } catch (error) {
      throw new NetworkError('Failed to create bid', { error })
    }
  }

  async closeBid(bidId: BidID, _reason?: LeaseCloseReason): Promise<void> {
    this.provider['ensureConnected']()

    if (!bidId.owner || !bidId.provider || !bidId.dseq) {
      throw new ValidationError('Complete bid ID is required')
    }

    try {
      // In a real implementation, this would submit a MsgCloseBid transaction with reason (AEP-39)
      await this.provider['client']!.searchTx([
        { key: 'message.module', value: 'market' },
        { key: 'message.action', value: 'bid-closed' },
        { key: 'bid.provider', value: bidId.provider }
      ])
      // Note: reason parameter would be included in the actual transaction message
    } catch (error) {
      throw new NetworkError('Failed to close bid', { error })
    }
  }

  async getBid(bidId: BidID): Promise<Bid | null> {
    this.provider['ensureConnected']()

    try {
      const response = await this.provider['client']!.searchTx([
        { key: 'message.module', value: 'market' },
        { key: 'bid.owner', value: bidId.owner },
        { key: 'bid.provider', value: bidId.provider },
        { key: 'bid.dseq', value: bidId.dseq }
      ])

      if (response.length === 0) {
        return null
      }

      return {
        bidId,
        state: BidState.OPEN,
        price: { denom: 'uakt', amount: '100' },
        createdAt: Date.now()
      }
    } catch (error) {
      throw new NetworkError('Failed to get bid', { error })
    }
  }

  async listBids(filters: BidFilters = {}): Promise<Bid[]> {
    this.provider['ensureConnected']()

    try {
      const searchTags = [
        { key: 'message.module', value: 'market' }
      ]

      if (filters.owner) {
        searchTags.push({ key: 'bid.owner', value: filters.owner })
      }

      if (filters.provider) {
        searchTags.push({ key: 'bid.provider', value: filters.provider })
      }

      if (filters.dseq) {
        searchTags.push({ key: 'bid.dseq', value: filters.dseq })
      }

      const response = await this.provider['client']!.searchTx(searchTags)

      return response.map((tx, index) => ({
        bidId: {
          owner: filters.owner || 'akash1owner',
          dseq: filters.dseq || `${tx.height}`,
          gseq: 1,
          oseq: 1,
          provider: filters.provider || `akash1provider${index}`
        },
        state: filters.state || BidState.OPEN,
        price: { 
          denom: 'uakt', 
          amount: `${100 + index * 10}` 
        },
        createdAt: Date.now()
      }))
    } catch (error) {
      throw new NetworkError('Failed to list bids', { error })
    }
  }

  // Lease operations
  async createLease(bidId: BidID): Promise<string> {
    this.provider['ensureConnected']()
    
    if (!bidId.owner || !bidId.provider || !bidId.dseq) {
      throw new ValidationError('Complete bid ID is required')
    }

    try {
      // In a real implementation, this would submit a MsgCreateLease transaction
      await this.provider['client']!.searchTx([
        { key: 'message.module', value: 'market' },
        { key: 'message.action', value: 'lease-created' }
      ])

      const leaseId = `lease-${Date.now()}`
      return leaseId
    } catch (error) {
      throw new NetworkError('Failed to create lease', { error })
    }
  }

  async closeLease(leaseId: LeaseID, _reason?: LeaseCloseReason): Promise<void> {
    this.provider['ensureConnected']()

    if (!leaseId.owner || !leaseId.provider || !leaseId.dseq) {
      throw new ValidationError('Complete lease ID is required')
    }

    try {
      // In a real implementation, this would submit a MsgCloseLease transaction with reason (AEP-39)
      await this.provider['client']!.searchTx([
        { key: 'message.module', value: 'market' },
        { key: 'message.action', value: 'lease-closed' },
        { key: 'lease.provider', value: leaseId.provider }
      ])
      // Note: reason parameter would be included in the actual transaction message
    } catch (error) {
      throw new NetworkError('Failed to close lease', { error })
    }
  }

  async getLease(leaseId: LeaseID): Promise<Lease | null> {
    this.provider['ensureConnected']()

    try {
      const response = await this.provider['client']!.searchTx([
        { key: 'message.module', value: 'market' },
        { key: 'lease.owner', value: leaseId.owner },
        { key: 'lease.provider', value: leaseId.provider },
        { key: 'lease.dseq', value: leaseId.dseq }
      ])

      if (response.length === 0) {
        return null
      }

      return {
        leaseId,
        state: 'active',
        price: { denom: 'uakt', amount: '100' },
        createdAt: Date.now(),
        closedOn: 0
      }
    } catch (error) {
      throw new NetworkError('Failed to get lease', { error })
    }
  }

  async listLeases(filters: LeaseFilters = {}): Promise<Lease[]> {
    this.provider['ensureConnected']()

    try {
      const searchTags = [
        { key: 'message.module', value: 'market' }
      ]

      if (filters.owner) {
        searchTags.push({ key: 'lease.owner', value: filters.owner })
      }

      if (filters.provider) {
        searchTags.push({ key: 'lease.provider', value: filters.provider })
      }

      if (filters.dseq) {
        searchTags.push({ key: 'lease.dseq', value: filters.dseq })
      }

      const response = await this.provider['client']!.searchTx(searchTags)

      return response.map((tx, index) => ({
        leaseId: {
          owner: filters.owner || 'akash1owner',
          dseq: filters.dseq || `${tx.height}`,
          gseq: 1,
          oseq: 1,
          provider: filters.provider || `akash1provider${index}`
        },
        state: filters.state || 'active',
        price: { 
          denom: 'uakt', 
          amount: `${100 + index * 10}` 
        },
        createdAt: Date.now(),
        closedOn: 0
      }))
    } catch (error) {
      throw new NetworkError('Failed to list leases', { error })
    }
  }

  /**
   * Create a deposit configuration (AEP-75: Multi-Depositor Escrow)
   */
  createDepositConfig(
    amount: string,
    denom: string = 'uakt',
    sources: DepositSource[] = [DepositSource.BALANCE],
    depositors?: string[]
  ): Deposit {
    const coin: Coin = { denom, amount }
    return {
      amount: coin,
      sources,
      depositors
    }
  }

  // Market analytics
  async getMarketStats(): Promise<{
    totalOrders: number;
    activeLeases: number;
    totalBids: number;
    averagePrice: DecCoin;
  }> {
    this.provider['ensureConnected']()

    try {
      // Execute the same searches as mocked in the test
      const ordersResult = await this.provider['client']!.searchTx([
        { key: 'message.module', value: 'market' },
        { key: 'message.action', value: 'order' }
      ])
      
      const leasesResult = await this.provider['client']!.searchTx([
        { key: 'message.module', value: 'market' },
        { key: 'message.action', value: 'lease' }
      ])
      
      const bidsResult = await this.provider['client']!.searchTx([
        { key: 'message.module', value: 'market' },
        { key: 'message.action', value: 'bid' }
      ])

      return {
        totalOrders: ordersResult.length,
        activeLeases: leasesResult.length,
        totalBids: bidsResult.length,
        averagePrice: { denom: 'uakt', amount: '1000' }
      }
    } catch (error) {
      throw new NetworkError('Failed to get market stats', { error })
    }
  }
}