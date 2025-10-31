import { StorageBackend, MemoryStorage } from './storage'
import { validateRequired, validateTTL } from '../utils/validation'
import { CacheError } from '../errors'
import {
  DEFAULT_STALE_TTL,
  DEFAULT_FALLBACK_TTL
} from './constants'
import type { Logger } from '../utils/logger'

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
  logger?: Logger

  /**
   * Called when cache operations fail
   * Allows custom error handling without throwing
   */
  onError?: (error: Error, operation: string, context?: Record<string, any>) => void

  /**
   * Enable automatic pruning of expired entries
   * Default: true
   */
  autoPrune?: boolean

  /**
   * Interval for automatic pruning in milliseconds
   * Default: DEFAULT_STALE_TTL (1 minute)
   */
  pruneInterval?: number

  /**
   * Maximum cache size before forcing eviction
   * Default: undefined (no limit)
   */
  maxSize?: number
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
  private revalidationControllers = new Map<string, AbortController>()
  private logger: Logger
  private onError?: (error: Error, operation: string, context?: Record<string, any>) => void
  private disposed = false
  private options: CacheOptions
  private pruneTimer?: NodeJS.Timeout

  constructor(options: CacheOptions = {}) {
    this.options = options
    this.storage = options.storage || new MemoryStorage()
    this.staleTTL = options.staleTTL || DEFAULT_STALE_TTL
    this.stats = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      size: 0
    }
    this.revalidationCallbacks = new Map()
    this.pendingRevalidations = new Set()
    this.onError = options.onError

    // Default logger if not provided
    this.logger = options.logger || {
      error: (msg, ctx) => console.error(msg, ctx),
      warn: (msg, ctx) => console.warn(msg, ctx),
      info: (msg, ctx) => console.info(msg, ctx),
      debug: (msg, ctx) => console.debug(msg, ctx)
    }

    // Register global revalidation callback if provided
    if (options.onRevalidate) {
      this.revalidationCallbacks.set('*', options.onRevalidate)
    }

    // Start automatic pruning if enabled
    if (options.autoPrune !== false) {
      this.startAutoPrune()
    }
  }

  /**
   * Handle errors consistently across all cache operations
   */
  private handleError(
    error: Error,
    operation: string,
    context?: Record<string, any>
  ): void {
    if (this.onError) {
      this.onError(error, operation, context)
    } else {
      this.logger.error(`Cache ${operation} failed`, {
        error: error.message,
        stack: error.stack,
        ...context
      })
    }
  }

  /**
   * Get cached value
   * Returns fresh data if available, or stale data while triggering background revalidation
   */
  async get<T>(key: string): Promise<T | null> {
    this.ensureNotDisposed()
    validateRequired(key, 'Cache key')

    try {
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
            this.handleError(
              error instanceof Error ? error : new Error(String(error)),
              'revalidation',
              { key }
            )
          })
        }

        return entry.value
      }

      // Expired
      this.stats.misses++
      await this.storage.delete(key)
      return null
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        'get',
        { key }
      )
      return null
    }
  }

  /**
   * Set cached value with TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in milliseconds
   */
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    this.ensureNotDisposed()
    validateRequired(key, 'Cache key')
    validateTTL(ttl)

    // Check size limit if configured
    if (this.options.maxSize) {
      const keys = await this.storage.keys()
      if (keys.length >= this.options.maxSize && !keys.includes(key)) {
        // Force eviction
        await this.evictOne()
      }
    }

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
    this.ensureNotDisposed()
    validateRequired(key, 'Cache key')

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
            const ttl = remainingTTL > 0 ? remainingTTL : DEFAULT_FALLBACK_TTL
            await this.set(key, freshValue, ttl)
          }
        }
      }
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        'revalidation',
        { key }
      )
      // Don't throw - revalidation failure shouldn't break the app
      // But it should be logged/reported via handleError
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
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        'updateSize',
        {}
      )
    }
  }

  /**
   * Check if a key exists in cache (including stale entries)
   */
  async has(key: string): Promise<boolean> {
    validateRequired(key, 'Cache key')

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
    validateRequired(key, 'Cache key')
    validateRequired(fetcher, 'Fetcher function')
    validateTTL(ttl)

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

  /**
   * Gets current cache statistics including size
   */
  async getStatsWithSize(): Promise<CacheStats & { entryCount: number }> {
    const keys = await this.storage.keys()

    return {
      ...this.stats,
      entryCount: keys.length
    }
  }

  /**
   * Gets cache size information
   */
  async getSizeInfo(): Promise<{
    entryCount: number
    maxSize?: number
    utilizationPercent?: number
  }> {
    const keys = await this.storage.keys()
    const entryCount = keys.length

    const info: any = { entryCount }

    if (this.options.maxSize) {
      info.maxSize = this.options.maxSize
      info.utilizationPercent = (entryCount / this.options.maxSize) * 100
    }

    return info
  }

  /**
   * Starts automatic pruning
   */
  private startAutoPrune(): void {
    const interval = this.options.pruneInterval ?? DEFAULT_STALE_TTL

    this.pruneTimer = setInterval(async () => {
      try {
        const pruned = await this.prune()
        if (pruned > 0) {
          this.logger.debug(`Auto-pruned ${pruned} expired entries`)
        }
      } catch (error) {
        this.handleError(
          error instanceof Error ? error : new Error(String(error)),
          'auto_prune'
        )
      }
    }, interval)

    // Don't keep process alive
    if (this.pruneTimer.unref) {
      this.pruneTimer.unref()
    }
  }

  /**
   * Stops automatic pruning
   */
  private stopAutoPrune(): void {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer)
      this.pruneTimer = undefined
    }
  }

  /**
   * Evicts one entry (oldest expiration)
   */
  private async evictOne(): Promise<void> {
    const keys = await this.storage.keys()

    let oldestKey: string | null = null
    let oldestExpires = Infinity

    for (const key of keys) {
      const entry = await this.storage.get<CacheEntry<any>>(key)
      if (entry && entry.expires < oldestExpires) {
        oldestExpires = entry.expires
        oldestKey = key
      }
    }

    if (oldestKey) {
      await this.storage.delete(oldestKey)
      this.logger.debug(`Evicted cache entry: ${oldestKey}`)
    }
  }

  /**
   * Ensures cache is not disposed
   */
  private ensureNotDisposed(): void {
    if (this.disposed) {
      throw new CacheError('Cache manager has been disposed')
    }
  }

  /**
   * Disposes the cache manager and releases all resources
   *
   * This method should be called when the cache is no longer needed,
   * typically when shutting down the application or cleaning up a component.
   *
   * After calling dispose():
   * - All pending operations are cancelled
   * - All callbacks are cleared
   * - All cached data is removed
   * - Further operations will throw an error
   *
   * @example
   * ```typescript
   * const cache = new CacheManager()
   * // ... use cache
   * await cache.dispose() // Clean up when done
   * ```
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return
    }

    this.logger.info('Disposing cache manager')

    // Stop auto-pruning
    this.stopAutoPrune()

    // Cancel all pending revalidations
    for (const controller of this.revalidationControllers.values()) {
      controller.abort()
    }
    this.revalidationControllers.clear()

    // Clear all pending operations
    this.pendingRevalidations.clear()

    // Clear all revalidation callbacks to prevent memory leaks
    this.revalidationCallbacks.clear()

    // Clear statistics
    this.stats = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      size: 0
    }

    // Clear the storage
    await this.clear()

    this.disposed = true
    this.logger.info('Cache manager disposed')
  }
}
