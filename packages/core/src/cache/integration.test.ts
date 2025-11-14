import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AkashSDK } from '../index'

// Mock isomorphic-ws
vi.mock('isomorphic-ws', () => ({
  default: class MockWebSocket {
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3
    readyState = 0
    onopen: ((event: any) => void) | null = null
    onclose: ((event: any) => void) | null = null
    onerror: ((event: any) => void) | null = null
    onmessage: ((event: any) => void) | null = null
    constructor(public url: string) {}
    send(data: string): void {}
    close(): void {}
  }
}))

// Mock fetch for provider list API calls
global.fetch = vi.fn()

describe('Cache Integration', () => {
  let sdk: AkashSDK

  beforeEach(() => {
    vi.clearAllMocks()
    sdk = new AkashSDK({
      rpcEndpoint: 'https://rpc.akash.network:443',
      apiEndpoint: 'https://api.akash.network:443',
      chainId: 'akashnet-2'
    })
  })

  it('should have cache manager available on SDK', () => {
    expect(sdk.cache).toBeDefined()
    expect(sdk.cache.get).toBeDefined()
    expect(sdk.cache.set).toBeDefined()
    expect(sdk.cache.clear).toBeDefined()
  })

  it('should allow direct cache usage', async () => {
    await sdk.cache.set('test-key', { data: 'value' }, 5000)
    const value = await sdk.cache.get<{ data: string }>('test-key')
    expect(value).toEqual({ data: 'value' })
  })

  it('should provide cache statistics', async () => {
    await sdk.cache.set('key1', 'value1', 5000)
    await sdk.cache.get('key1')
    await sdk.cache.get('non-existent')

    const stats = sdk.cache.getStats()
    expect(stats.hits).toBeGreaterThan(0)
    expect(stats.misses).toBeGreaterThan(0)
  })

  it('should cache provider list results', async () => {
    // Mock fetch to return provider list
    const mockProviders = {
      providers: [
        { owner: 'akash1test1', hostUri: 'https://provider1.com', attributes: [], info: {} },
        { owner: 'akash1test2', hostUri: 'https://provider2.com', attributes: [], info: {} }
      ]
    }

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockProviders
    } as Response)

    // Mock the provider connection
    sdk['provider']['client'] = {} as any
    sdk['provider']['connected'] = true

    // First call should hit the API
    await sdk.providerManager.listProviders()
    expect(global.fetch).toHaveBeenCalledTimes(1)

    // Second call should use cache
    await sdk.providerManager.listProviders()
    expect(global.fetch).toHaveBeenCalledTimes(1) // Still 1, not 2

    const stats = sdk.cache.getStats()
    expect(stats.hits).toBeGreaterThan(0)
  })

  it('should cache market orders results', async () => {
    // Mock the provider's client
    const mockClient = {
      searchTx: vi.fn().mockResolvedValue([
        { height: 1000 },
        { height: 1001 }
      ])
    }

    sdk['provider']['client'] = mockClient
    sdk['provider']['connected'] = true

    const filters = { owner: 'akash1test' }

    // First call should hit the API
    await sdk.market.listOrders(filters)
    expect(mockClient.searchTx).toHaveBeenCalledTimes(1)

    // Second call should use cache
    await sdk.market.listOrders(filters)
    expect(mockClient.searchTx).toHaveBeenCalledTimes(1) // Still 1, not 2

    const stats = sdk.cache.getStats()
    expect(stats.hits).toBeGreaterThan(0)
  })

  it('should cache market bids results', async () => {
    // Mock the provider's client
    const mockClient = {
      searchTx: vi.fn().mockResolvedValue([
        { height: 1000 },
        { height: 1001 }
      ])
    }

    sdk['provider']['client'] = mockClient
    sdk['provider']['connected'] = true

    const filters = { owner: 'akash1test' }

    // First call should hit the API
    await sdk.market.listBids(filters)
    expect(mockClient.searchTx).toHaveBeenCalledTimes(1)

    // Second call should use cache
    await sdk.market.listBids(filters)
    expect(mockClient.searchTx).toHaveBeenCalledTimes(1) // Still 1, not 2

    const stats = sdk.cache.getStats()
    expect(stats.hits).toBeGreaterThan(0)
  })

  it('should allow clearing cache', async () => {
    await sdk.cache.set('key1', 'value1', 5000)
    await sdk.cache.set('key2', 'value2', 5000)

    let stats = sdk.cache.getStats()
    expect(stats.size).toBe(2)

    await sdk.cache.clear()

    stats = sdk.cache.getStats()
    expect(stats.size).toBe(0)
  })

  it('should support getOrSet pattern', async () => {
    let fetchCount = 0
    const fetcher = async () => {
      fetchCount++
      return { data: 'fetched-data' }
    }

    // First call should fetch
    const value1 = await sdk.cache.getOrSet('fetch-key', fetcher, 5000)
    expect(value1).toEqual({ data: 'fetched-data' })
    expect(fetchCount).toBe(1)

    // Second call should use cache
    const value2 = await sdk.cache.getOrSet('fetch-key', fetcher, 5000)
    expect(value2).toEqual({ data: 'fetched-data' })
    expect(fetchCount).toBe(1) // Still 1, not called again
  })

  it('should support cache invalidation', async () => {
    await sdk.cache.set('invalidate-test', 'value', 5000)

    let value = await sdk.cache.get('invalidate-test')
    expect(value).toBe('value')

    await sdk.cache.invalidate('invalidate-test')

    value = await sdk.cache.get('invalidate-test')
    expect(value).toBeNull()
  })

  it('should cache with different filters separately', async () => {
    // Mock fetch to return different provider lists for different owners
    const mockProviders1 = {
      providers: [
        { owner: 'akash1', hostUri: 'https://provider1.com', attributes: [], info: {} }
      ]
    }
    const mockProviders2 = {
      providers: [
        { owner: 'akash2', hostUri: 'https://provider2.com', attributes: [], info: {} }
      ]
    }

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProviders1
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProviders2
      } as Response)

    // Mock the provider connection
    sdk['provider']['client'] = {} as any
    sdk['provider']['connected'] = true

    // Two different filters should hit API twice
    await sdk.providerManager.listProviders({ owner: 'akash1' })
    await sdk.providerManager.listProviders({ owner: 'akash2' })

    expect(global.fetch).toHaveBeenCalledTimes(2)

    // But calling with same filter should use cache
    await sdk.providerManager.listProviders({ owner: 'akash1' })
    expect(global.fetch).toHaveBeenCalledTimes(2) // Still 2
  })
})
