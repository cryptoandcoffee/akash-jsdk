import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CacheManager } from './manager'
import { MemoryStorage, LocalStorageBackend, StorageBackend } from './storage'

describe('CacheManager', () => {
  let cache: CacheManager

  beforeEach(() => {
    cache = new CacheManager({ storage: new MemoryStorage() })
  })

  describe('Basic Operations', () => {
    it('should set and get cached values', async () => {
      await cache.set('test-key', 'test-value', 1000)
      const value = await cache.get<string>('test-key')
      expect(value).toBe('test-value')
    })

    it('should return null for non-existent keys', async () => {
      const value = await cache.get('non-existent')
      expect(value).toBeNull()
    })

    it('should handle complex objects', async () => {
      const obj = { name: 'John', age: 30, nested: { value: 'test' } }
      await cache.set('object-key', obj, 1000)
      const value = await cache.get<typeof obj>('object-key')
      expect(value).toEqual(obj)
    })

    it('should handle arrays', async () => {
      const arr = [1, 2, 3, 4, 5]
      await cache.set('array-key', arr, 1000)
      const value = await cache.get<number[]>('array-key')
      expect(value).toEqual(arr)
    })
  })

  describe('TTL Expiration', () => {
    it('should expire entries after TTL', async () => {
      // Use a cache with shorter stale period for testing
      const testCache = new CacheManager({ storage: new MemoryStorage(), staleTTL: 50 })
      await testCache.set('expire-key', 'value', 50)

      // Should be available immediately
      let value = await testCache.get('expire-key')
      expect(value).toBe('value')

      // Wait for expiration (TTL + stale period)
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should be null after expiration
      value = await testCache.get('expire-key')
      expect(value).toBeNull()
    })

    it('should return fresh data within TTL', async () => {
      await cache.set('fresh-key', 'fresh-value', 1000)

      await new Promise(resolve => setTimeout(resolve, 50))

      const value = await cache.get('fresh-key')
      expect(value).toBe('fresh-value')

      const stats = cache.getStats()
      expect(stats.hits).toBeGreaterThan(0)
      expect(stats.staleHits).toBe(0)
    })
  })

  describe('Stale-While-Revalidate', () => {
    it('should return stale data and trigger revalidation', async () => {
      const staleTTL = 100
      cache = new CacheManager({
        storage: new MemoryStorage(),
        staleTTL
      })

      let revalidateCalled = false
      cache.onRevalidate('stale-key', async () => {
        revalidateCalled = true
        return 'revalidated-value'
      })

      // Set with short TTL
      await cache.set('stale-key', 'original-value', 50)

      // Wait for TTL to expire but not stale period
      await new Promise(resolve => setTimeout(resolve, 80))

      // Should return stale value
      const value = await cache.get<string>('stale-key')
      expect(value).toBe('original-value')

      // Wait for revalidation
      await new Promise(resolve => setTimeout(resolve, 100))

      // Revalidation should have been triggered
      expect(revalidateCalled).toBe(true)

      const stats = cache.getStats()
      expect(stats.staleHits).toBeGreaterThan(0)
    })

    it('should not trigger duplicate revalidations', async () => {
      const staleTTL = 100
      cache = new CacheManager({
        storage: new MemoryStorage(),
        staleTTL
      })

      let revalidateCount = 0
      cache.onRevalidate('no-dup-key', async () => {
        revalidateCount++
        await new Promise(resolve => setTimeout(resolve, 50))
        return 'revalidated'
      })

      await cache.set('no-dup-key', 'original', 50)
      await new Promise(resolve => setTimeout(resolve, 80))

      // Multiple gets should only trigger one revalidation
      await Promise.all([
        cache.get('no-dup-key'),
        cache.get('no-dup-key'),
        cache.get('no-dup-key')
      ])

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(revalidateCount).toBe(1)
    })

    it('should use global revalidation callback', async () => {
      let globalRevalidateCalled = false
      cache = new CacheManager({
        storage: new MemoryStorage(),
        staleTTL: 100,
        onRevalidate: async (key) => {
          globalRevalidateCalled = true
          return `revalidated-${key}`
        }
      })

      await cache.set('global-key', 'original', 50)
      await new Promise(resolve => setTimeout(resolve, 80))

      await cache.get('global-key')
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(globalRevalidateCalled).toBe(true)
    })

    it('should handle revalidation errors gracefully', async () => {
      const staleTTL = 100
      cache = new CacheManager({
        storage: new MemoryStorage(),
        staleTTL
      })

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      cache.onRevalidate('error-key', async () => {
        throw new Error('Revalidation failed')
      })

      await cache.set('error-key', 'original', 50)
      await new Promise(resolve => setTimeout(resolve, 80))

      // Should still return stale value even if revalidation fails
      const value = await cache.get<string>('error-key')
      expect(value).toBe('original')

      await new Promise(resolve => setTimeout(resolve, 100))

      consoleWarnSpy.mockRestore()
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate specific cache entry', async () => {
      await cache.set('invalidate-key', 'value', 1000)

      let value = await cache.get('invalidate-key')
      expect(value).toBe('value')

      await cache.invalidate('invalidate-key')

      value = await cache.get('invalidate-key')
      expect(value).toBeNull()
    })

    it('should clear all cache entries', async () => {
      await cache.set('key1', 'value1', 1000)
      await cache.set('key2', 'value2', 1000)
      await cache.set('key3', 'value3', 1000)

      await cache.clear()

      const value1 = await cache.get('key1')
      const value2 = await cache.get('key2')
      const value3 = await cache.get('key3')

      expect(value1).toBeNull()
      expect(value2).toBeNull()
      expect(value3).toBeNull()

      const stats = cache.getStats()
      expect(stats.size).toBe(0)
    })
  })

  describe('Cache Statistics', () => {
    it('should track hits and misses', async () => {
      await cache.set('stat-key', 'value', 1000)

      await cache.get('stat-key') // hit
      await cache.get('stat-key') // hit
      await cache.get('non-existent') // miss
      await cache.get('another-miss') // miss

      const stats = cache.getStats()
      expect(stats.hits).toBe(2)
      expect(stats.misses).toBe(2)
    })

    it('should track stale hits', async () => {
      cache = new CacheManager({
        storage: new MemoryStorage(),
        staleTTL: 100
      })

      await cache.set('stale-stat-key', 'value', 50)
      await new Promise(resolve => setTimeout(resolve, 80))

      await cache.get('stale-stat-key')

      const stats = cache.getStats()
      expect(stats.staleHits).toBe(1)
    })

    it('should track cache size', async () => {
      await cache.set('key1', 'value1', 1000)
      await cache.set('key2', 'value2', 1000)

      const stats = cache.getStats()
      expect(stats.size).toBe(2)

      await cache.invalidate('key1')

      const newStats = cache.getStats()
      expect(newStats.size).toBe(1)
    })

    it('should reset stats on clear', async () => {
      await cache.set('key1', 'value1', 1000)
      await cache.get('key1')
      await cache.get('non-existent')

      await cache.clear()

      const stats = cache.getStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
      expect(stats.staleHits).toBe(0)
      expect(stats.size).toBe(0)
    })
  })

  describe('Storage Backends', () => {
    it('should work with MemoryStorage', async () => {
      const memCache = new CacheManager({ storage: new MemoryStorage() })
      await memCache.set('mem-key', 'mem-value', 1000)
      const value = await memCache.get('mem-key')
      expect(value).toBe('mem-value')
    })

    it('should work with custom storage backend', async () => {
      const customStorage: StorageBackend = {
        data: new Map(),
        async get(key) {
          return this.data.get(key) || null
        },
        async set(key, value) {
          this.data.set(key, value)
        },
        async delete(key) {
          this.data.delete(key)
        },
        async clear() {
          this.data.clear()
        },
        async keys() {
          return Array.from(this.data.keys())
        }
      }

      const customCache = new CacheManager({ storage: customStorage })
      await customCache.set('custom-key', 'custom-value', 1000)
      const value = await customCache.get('custom-key')
      expect(value).toBe('custom-value')
    })
  })

  describe('Revalidation Callbacks', () => {
    it('should register and use revalidation callback', async () => {
      let callbackInvoked = false
      cache.onRevalidate('callback-key', async (key) => {
        callbackInvoked = true
        expect(key).toBe('callback-key')
        return 'new-value'
      })

      await cache.set('callback-key', 'old-value', 50)
      await new Promise(resolve => setTimeout(resolve, 80))

      await cache.get('callback-key')
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(callbackInvoked).toBe(true)
    })

    it('should remove revalidation callback', async () => {
      let callbackInvoked = false
      cache.onRevalidate('remove-key', async () => {
        callbackInvoked = true
        return 'new-value'
      })

      cache.offRevalidate('remove-key')

      await cache.set('remove-key', 'old-value', 50)
      await new Promise(resolve => setTimeout(resolve, 80))

      await cache.get('remove-key')
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(callbackInvoked).toBe(false)
    })
  })

  describe('Utility Methods', () => {
    it('should check if key exists', async () => {
      await cache.set('exists-key', 'value', 1000)

      const exists = await cache.has('exists-key')
      expect(exists).toBe(true)

      const notExists = await cache.has('not-exists')
      expect(notExists).toBe(false)
    })

    it('should return all cache keys', async () => {
      await cache.set('key1', 'value1', 1000)
      await cache.set('key2', 'value2', 1000)
      await cache.set('key3', 'value3', 1000)

      const keys = await cache.keys()
      expect(keys).toHaveLength(3)
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).toContain('key3')
    })

    it('should prune expired entries', async () => {
      // Use a cache with shorter stale period for testing
      const testCache = new CacheManager({ storage: new MemoryStorage(), staleTTL: 50 })
      await testCache.set('prune1', 'value1', 50)
      await testCache.set('prune2', 'value2', 50)
      await testCache.set('prune3', 'value3', 5000) // Long TTL

      // Wait for expiration (TTL + stale period)
      await new Promise(resolve => setTimeout(resolve, 150))

      const prunedCount = await testCache.prune()
      expect(prunedCount).toBe(2)

      const keys = await testCache.keys()
      expect(keys).toHaveLength(1)
      expect(keys).toContain('prune3')
    })

    it('should implement getOrSet pattern', async () => {
      let fetcherCalled = 0
      const fetcher = async () => {
        fetcherCalled++
        return 'fetched-value'
      }

      // First call should fetch
      const value1 = await cache.getOrSet('getOrSet-key', fetcher, 1000)
      expect(value1).toBe('fetched-value')
      expect(fetcherCalled).toBe(1)

      // Second call should use cache
      const value2 = await cache.getOrSet('getOrSet-key', fetcher, 1000)
      expect(value2).toBe('fetched-value')
      expect(fetcherCalled).toBe(1) // Not called again
    })
  })

  describe('Edge Cases', () => {
    it('should handle null values', async () => {
      await cache.set('null-key', null, 1000)
      const value = await cache.get('null-key')
      expect(value).toBeNull()
    })

    it('should handle undefined in storage gracefully', async () => {
      // Test with a storage that might return undefined
      const quirkyStorage: StorageBackend = {
        async get() { return undefined as any },
        async set() {},
        async delete() {},
        async clear() {},
        async keys() { return [] }
      }

      const quirkyCache = new CacheManager({ storage: quirkyStorage })
      const value = await quirkyCache.get('any-key')
      expect(value).toBeNull()
    })

    it('should handle storage errors during size update', async () => {
      const errorStorage: StorageBackend = {
        data: new Map(),
        async get(key) { return this.data.get(key) || null },
        async set(key, value) { this.data.set(key, value) },
        async delete(key) { this.data.delete(key) },
        async clear() { this.data.clear() },
        async keys() { throw new Error('Keys error') }
      }

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const errorCache = new CacheManager({ storage: errorStorage })
      await errorCache.set('error-key', 'value', 1000)

      // Should not throw
      expect(errorCache.getStats().size).toBe(0)

      consoleWarnSpy.mockRestore()
    })

    it('should handle revalidation with no value returned', async () => {
      // Use a cache with shorter stale period for testing
      const testCache = new CacheManager({ storage: new MemoryStorage(), staleTTL: 50 })
      testCache.onRevalidate('no-return-key', async () => {
        return undefined
      })

      await testCache.set('no-return-key', 'original', 50)
      await new Promise(resolve => setTimeout(resolve, 80))

      const value = await testCache.get('no-return-key')
      expect(value).toBe('original')

      await new Promise(resolve => setTimeout(resolve, 100))

      // Original value should still be there (not updated)
      const stillOriginal = await testCache.get('no-return-key')
      expect(stillOriginal).toBeNull() // Expired by now
    })

    it('should handle has() for expired stale entries', async () => {
      // Use a cache with shorter stale period for testing
      const testCache = new CacheManager({ storage: new MemoryStorage(), staleTTL: 50 })
      await testCache.set('stale-has-key', 'value', 50)

      // Wait for full expiration (TTL + stale period)
      await new Promise(resolve => setTimeout(resolve, 150))

      const exists = await testCache.has('stale-has-key')
      expect(exists).toBe(false)
    })
  })
})

describe('LocalStorageBackend', () => {
  describe('Browser Environment', () => {
    let originalWindow: any

    beforeEach(() => {
      originalWindow = global.window
    })

    afterEach(() => {
      global.window = originalWindow
    })

    it('should fallback to MemoryStorage when localStorage is not available', async () => {
      // Simulate no window
      global.window = undefined as any

      const storage = new LocalStorageBackend()
      await storage.set('test-key', 'test-value')
      const value = await storage.get('test-key')
      expect(value).toBe('test-value')
    })

    it('should use localStorage when available', async () => {
      const mockStorage = new Map<string, string>()
      global.window = {
        localStorage: {
          getItem: (key: string) => mockStorage.get(key) || null,
          setItem: (key: string, value: string) => mockStorage.set(key, value),
          removeItem: (key: string) => mockStorage.delete(key),
          key: (index: number) => Array.from(mockStorage.keys())[index] || null,
          length: mockStorage.size,
          clear: () => mockStorage.clear()
        }
      } as any

      const storage = new LocalStorageBackend('test_')
      await storage.set('key1', { data: 'value1' })
      const value = await storage.get<{ data: string }>('key1')
      expect(value).toEqual({ data: 'value1' })
    })

    it('should handle localStorage quota exceeded error', async () => {
      const mockStorage = new Map<string, string>()
      let setItemCallCount = 0

      global.window = {
        localStorage: {
          getItem: (key: string) => mockStorage.get(key) || null,
          setItem: (key: string, value: string) => {
            setItemCallCount++
            if (setItemCallCount === 1) {
              const error = new Error('QuotaExceededError')
              error.name = 'QuotaExceededError'
              throw error
            }
            mockStorage.set(key, value)
          },
          removeItem: (key: string) => mockStorage.delete(key),
          key: (index: number) => Array.from(mockStorage.keys())[index] || null,
          length: mockStorage.size,
          clear: () => mockStorage.clear()
        }
      } as any

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const storage = new LocalStorageBackend()
      await storage.set('quota-key', 'value')

      consoleWarnSpy.mockRestore()
    })

    it('should handle localStorage errors gracefully', async () => {
      global.window = {
        localStorage: {
          getItem: () => { throw new Error('Storage error') },
          setItem: () => { throw new Error('Storage error') },
          removeItem: () => { throw new Error('Storage error') },
          key: () => { throw new Error('Storage error') },
          length: 0,
          clear: () => { throw new Error('Storage error') }
        }
      } as any

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const storage = new LocalStorageBackend()

      const value = await storage.get('error-key')
      expect(value).toBeNull()

      await storage.set('error-key', 'value')
      await storage.delete('error-key')
      await storage.clear()

      const keys = await storage.keys()
      expect(keys).toEqual([])

      consoleWarnSpy.mockRestore()
    })

    it('should filter keys by prefix', async () => {
      const mockStorage = new Map<string, string>([
        ['test_key1', 'value1'],
        ['test_key2', 'value2'],
        ['other_key', 'value3']
      ])

      global.window = {
        localStorage: {
          getItem: (key: string) => mockStorage.get(key) || null,
          setItem: (key: string, value: string) => mockStorage.set(key, value),
          removeItem: (key: string) => mockStorage.delete(key),
          key: (index: number) => Array.from(mockStorage.keys())[index] || null,
          length: mockStorage.size,
          clear: () => mockStorage.clear()
        }
      } as any

      const storage = new LocalStorageBackend('test_')
      const keys = await storage.keys()

      expect(keys).toHaveLength(2)
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).not.toContain('other_key')
    })
  })
})
