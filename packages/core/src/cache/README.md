# Cache Module

The Cache Module provides TTL-based caching with stale-while-revalidate strategy for the Akash JSDK.

## Features

- **TTL-based expiration**: Set custom time-to-live for cached entries
- **Stale-while-revalidate**: Serve stale data while fetching fresh data in the background
- **Multiple storage backends**: Memory (default) and LocalStorage (browser)
- **Cache statistics**: Track hits, misses, stale hits, and cache size
- **Automatic revalidation**: Background refresh of stale data
- **Browser and Node.js compatible**: Works in all environments

## Usage

### Basic Usage

```typescript
import { AkashSDK } from '@cryptoandcoffee/akash-jsdk-core'

const sdk = new AkashSDK({
  rpcEndpoint: 'https://rpc.akash.network:443',
  apiEndpoint: 'https://api.akash.network:443',
  chainId: 'akashnet-2'
})

// The cache is automatically available on the SDK
await sdk.cache.set('my-key', { data: 'value' }, 5000) // 5 seconds TTL
const value = await sdk.cache.get('my-key')
```

### Get or Set Pattern

```typescript
// Fetch from cache or execute fetcher function
const data = await sdk.cache.getOrSet(
  'expensive-operation',
  async () => {
    // This only runs if cache miss
    return await fetchExpensiveData()
  },
  60000 // 1 minute TTL
)
```

### Cache Statistics

```typescript
const stats = sdk.cache.getStats()
console.log(stats)
// {
//   hits: 10,
//   misses: 2,
//   staleHits: 1,
//   size: 5
// }
```

### Cache Invalidation

```typescript
// Invalidate specific key
await sdk.cache.invalidate('my-key')

// Clear all cache
await sdk.cache.clear()

// Prune expired entries
const prunedCount = await sdk.cache.prune()
```

### Stale-While-Revalidate

The cache implements the stale-while-revalidate pattern:

1. Fresh data (within TTL): Returned immediately
2. Stale data (expired but within stale period): Returned immediately + background revalidation triggered
3. Expired data (past stale period): Returns null

```typescript
// Register revalidation callback for specific keys
sdk.cache.onRevalidate('provider-list', async (key) => {
  // Fetch fresh data
  return await fetchProviderList()
})

// Or register global revalidation callback
const cache = new CacheManager({
  onRevalidate: async (key) => {
    // Handle revalidation for any key
    return await fetchFreshData(key)
  }
})
```

## Integration with SDK Modules

The cache is automatically integrated with key SDK modules:

### Provider Manager

Provider lists are cached for 5 minutes:

```typescript
// First call fetches from network
const providers = await sdk.providerManager.listProviders({ region: 'us-west' })

// Second call uses cache (if within 5 minutes)
const cachedProviders = await sdk.providerManager.listProviders({ region: 'us-west' })
```

### Market Manager

Orders and bids are cached for 2 minutes:

```typescript
// Cached order listing
const orders = await sdk.market.listOrders({ owner: 'akash1...' })

// Cached bid listing
const bids = await sdk.market.listBids({ provider: 'akash1...' })
```

## Storage Backends

### Memory Storage (Default)

```typescript
import { CacheManager, MemoryStorage } from '@cryptoandcoffee/akash-jsdk-core'

const cache = new CacheManager({
  storage: new MemoryStorage()
})
```

### LocalStorage (Browser)

```typescript
import { CacheManager, LocalStorageBackend } from '@cryptoandcoffee/akash-jsdk-core'

const cache = new CacheManager({
  storage: new LocalStorageBackend('my-app-cache_') // prefix for keys
})
```

### Custom Storage

Implement the `StorageBackend` interface:

```typescript
import { CacheManager, StorageBackend } from '@cryptoandcoffee/akash-jsdk-core'

class RedisStorage implements StorageBackend {
  async get<T>(key: string): Promise<T | null> {
    // Implementation
  }

  async set<T>(key: string, value: T): Promise<void> {
    // Implementation
  }

  async delete(key: string): Promise<void> {
    // Implementation
  }

  async clear(): Promise<void> {
    // Implementation
  }

  async keys(): Promise<string[]> {
    // Implementation
  }
}

const cache = new CacheManager({
  storage: new RedisStorage()
})
```

## Configuration

```typescript
const cache = new CacheManager({
  storage: new MemoryStorage(),        // Storage backend
  staleTTL: 60000,                     // Stale period in ms (default: 60000)
  onRevalidate: async (key) => {       // Global revalidation callback
    return await fetchFreshData(key)
  }
})
```

## API Reference

### CacheManager

#### Methods

- `get<T>(key: string): Promise<T | null>` - Get cached value
- `set<T>(key: string, value: T, ttl: number): Promise<void>` - Set cached value with TTL
- `invalidate(key: string): Promise<void>` - Invalidate specific cache entry
- `clear(): Promise<void>` - Clear all cache
- `getStats(): CacheStats` - Get cache statistics
- `has(key: string): Promise<boolean>` - Check if key exists
- `keys(): Promise<string[]>` - Get all cache keys
- `prune(): Promise<number>` - Prune expired entries
- `getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T>` - Get or set pattern
- `onRevalidate(keyPattern: string, callback: (key: string) => Promise<any>): void` - Register revalidation callback
- `offRevalidate(keyPattern: string): void` - Remove revalidation callback

### StorageBackend Interface

```typescript
interface StorageBackend {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  keys(): Promise<string[]>
}
```

## Performance Considerations

- Use appropriate TTL values based on data freshness requirements
- Provider lists: 5 minutes (relatively stable)
- Market data: 2 minutes (more dynamic)
- Critical real-time data: Consider shorter TTLs or no caching

## Browser Compatibility

- **Memory Storage**: Works in all environments
- **LocalStorage**: Works in all modern browsers, automatically falls back to MemoryStorage if unavailable

## Testing

The cache module has >90% test coverage including:
- Basic get/set operations
- TTL expiration
- Stale-while-revalidate behavior
- Cache invalidation
- Storage backends
- Edge cases and error handling
