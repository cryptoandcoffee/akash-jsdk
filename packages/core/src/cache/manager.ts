import { StorageBackend, MemoryStorage } from './storage'

export interface CacheEntry<T> {
  value: T
  expires: number
  staleExpires: number
}

export interface CacheStats {
  hits: number
  misses: number
  staleHits: number
  size: number
}

export interface CacheOptions {
  storage?: StorageBackend
  staleTTL?: number
  onRevalidate?: (key: string) => Promise<any>
}

/**
 * CacheManager provides TTL-based caching with stale-while-revalidate strategy
 *
 * Features:
 * - TTL-based expiration
 * - Stale-while-revalidate pattern for better performance
 * - Multiple storage backends (memory, localStorage)
 * - Cache statistics tracking
 * - Browser and Node.js compatible
 */
export class CacheManager {
  private storage: StorageBackend
  private staleTTL: number
  private stats: CacheStats
  private revalidationCallbacks: Map<string, (key: string) => Promise<any>>
  private pendingRevalidations: Set<string>

  constructor(options: CacheOptions = {}) {
    this.storage = options.storage || new MemoryStorage()
    this.staleTTL = options.staleTTL || 60000 // 1 minute stale period by default
    this.stats = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      size: 0
    }
    this.revalidationCallbacks = new Map()
    this.pendingRevalidations = new Set()

    // Register global revalidation callback if provided
    if (options.onRevalidate) {
      this.revalidationCallbacks.set('*', options.onRevalidate)
    }
  }

  /**
   * Get cached value
   * Returns fresh data if available, or stale data while triggering background revalidation
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = await this.storage.get<CacheEntry<T>>(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    const now = Date.now()

    // Fresh data
    if (now < entry.expires) {
      this.stats.hits++
      return entry.value
    }

    // Stale but acceptable
    if (now < entry.staleExpires) {
      this.stats.staleHits++

      // Trigger background revalidation only if not already pending
      if (!this.pendingRevalidations.has(key)) {
        this.revalidate(key).catch((error) => {
          console.warn(`Revalidation failed for key ${key}:`, error)
        })
      }

      return entry.value
    }

    // Expired
    this.stats.misses++
    await this.storage.delete(key)
    return null
  }

  /**
   * Set cached value with TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in milliseconds
   */
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    const now = Date.now()
    const entry: CacheEntry<T> = {
      value,
      expires: now + ttl,
      staleExpires: now + ttl + this.staleTTL
    }

    await this.storage.set(key, entry)
    await this.updateSize()
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidate(key: string): Promise<void> {
    await this.storage.delete(key)
    this.pendingRevalidations.delete(key)
    await this.updateSize()
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    await this.storage.clear()
    this.pendingRevalidations.clear()
    this.stats = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      size: 0
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Register a revalidation callback for a specific key pattern
   * @param keyPattern - Key or pattern (* for all keys)
   * @param callback - Async function to fetch fresh data
   */
  onRevalidate(keyPattern: string, callback: (key: string) => Promise<any>): void {
    this.revalidationCallbacks.set(keyPattern, callback)
  }

  /**
   * Remove revalidation callback
   */
  offRevalidate(keyPattern: string): void {
    this.revalidationCallbacks.delete(keyPattern)
  }

  /**
   * Trigger background revalidation for a key
   * @private
   */
  private async revalidate(key: string): Promise<void> {
    // Prevent duplicate revalidations
    if (this.pendingRevalidations.has(key)) {
      return
    }

    this.pendingRevalidations.add(key)

    try {
      // Find matching callback
      let callback = this.revalidationCallbacks.get(key)
      if (!callback) {
        callback = this.revalidationCallbacks.get('*')
      }

      if (callback) {
        const freshValue = await callback(key)
        if (freshValue !== undefined && freshValue !== null) {
          // Get current entry to preserve TTL
          const currentEntry = await this.storage.get<CacheEntry<any>>(key)
          if (currentEntry) {
            const remainingTTL = currentEntry.expires - Date.now()
            const ttl = remainingTTL > 0 ? remainingTTL : 60000 // Default to 1 minute if expired
            await this.set(key, freshValue, ttl)
          }
        }
      }
    } finally {
      this.pendingRevalidations.delete(key)
    }
  }

  /**
   * Update cache size stat
   * @private
   */
  private async updateSize(): Promise<void> {
    try {
      const keys = await this.storage.keys()
      this.stats.size = keys.length
    } catch (error) {
      console.warn('Failed to update cache size:', error)
    }
  }

  /**
   * Check if a key exists in cache (including stale entries)
   */
  async has(key: string): Promise<boolean> {
    const entry = await this.storage.get<CacheEntry<any>>(key)
    if (!entry) {
      return false
    }

    const now = Date.now()
    // Return true if entry exists and hasn't expired past stale period
    return now < entry.staleExpires
  }

  /**
   * Get all cache keys
   */
  async keys(): Promise<string[]> {
    return this.storage.keys()
  }

  /**
   * Prune expired entries from cache
   */
  async prune(): Promise<number> {
    const keys = await this.storage.keys()
    const now = Date.now()
    let prunedCount = 0

    for (const key of keys) {
      const entry = await this.storage.get<CacheEntry<any>>(key)
      if (entry && now >= entry.staleExpires) {
        await this.storage.delete(key)
        prunedCount++
      }
    }

    await this.updateSize()
    return prunedCount
  }

  /**
   * Get or set pattern: fetch from cache or execute callback and cache result
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Fetch fresh data
    const value = await fetcher()

    // Cache the result
    await this.set(key, value, ttl)

    return value
  }
}
