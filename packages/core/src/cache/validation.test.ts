import { describe, it, expect, beforeEach } from 'vitest'
import { CacheManager } from './manager'
import { MemoryStorage } from './storage'

describe('CacheManager Input Validation', () => {
  let cache: CacheManager

  beforeEach(() => {
    cache = new CacheManager({ storage: new MemoryStorage() })
  })

  it('should throw ValidationError for null/undefined key in get', async () => {
    await expect(cache.get(null as any)).rejects.toThrow('Cache key is required')
    await expect(cache.get(undefined as any)).rejects.toThrow('Cache key is required')
  })

  it('should throw ValidationError for null/undefined key in set', async () => {
    await expect(cache.set(null as any, 'value', 1000)).rejects.toThrow('Cache key is required')
    await expect(cache.set(undefined as any, 'value', 1000)).rejects.toThrow('Cache key is required')
  })

  it('should throw ValidationError for invalid TTL', async () => {
    await expect(cache.set('key', 'value', 0)).rejects.toThrow('TTL must be a positive number')
    await expect(cache.set('key', 'value', -1000)).rejects.toThrow('TTL must be a positive number')
    await expect(cache.set('key', 'value', NaN)).rejects.toThrow('TTL must be a positive number')
  })

  it('should throw ValidationError for TTL exceeding MAX_SAFE_INTEGER', async () => {
    await expect(cache.set('key', 'value', Number.MAX_SAFE_INTEGER + 1)).rejects.toThrow('TTL value too large')
  })

  it('should throw ValidationError for null key in invalidate', async () => {
    await expect(cache.invalidate(null as any)).rejects.toThrow('Cache key is required')
  })

  it('should throw ValidationError for null key in has', async () => {
    await expect(cache.has(null as any)).rejects.toThrow('Cache key is required')
  })

  it('should throw ValidationError for invalid getOrSet parameters', async () => {
    await expect(cache.getOrSet(null as any, async () => 'value', 1000)).rejects.toThrow('Cache key is required')
    await expect(cache.getOrSet('key', null as any, 1000)).rejects.toThrow('Fetcher function is required')
    await expect(cache.getOrSet('key', async () => 'value', 0)).rejects.toThrow('TTL must be a positive number')
  })
})
