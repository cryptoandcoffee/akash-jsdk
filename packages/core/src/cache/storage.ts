import { CacheError } from '../errors'

/**
 * Abstract storage backend interface for cache
 */
export interface StorageBackend {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  keys(): Promise<string[]>
}

export interface MemoryStorageOptions {
  /**
   * Maximum number of entries (default: 1000)
   */
  maxEntries?: number

  /**
   * Eviction policy to use when max entries reached
   * - 'lru': Least Recently Used (default)
   * - 'fifo': First In First Out
   */
  evictionPolicy?: 'lru' | 'fifo'
}

/**
 * In-memory storage backend with bounded size and eviction policies
 * Suitable for Node.js and browser environments
 */
export class MemoryStorage implements StorageBackend {
  private store = new Map<string, unknown>()
  private accessOrder: string[] = [] // For LRU tracking
  private insertOrder: string[] = [] // For FIFO tracking
  private maxEntries: number
  private evictionPolicy: 'lru' | 'fifo'

  constructor(options: MemoryStorageOptions = {}) {
    this.maxEntries = options.maxEntries ?? 1000
    this.evictionPolicy = options.evictionPolicy ?? 'lru'
  }

  async get<T>(key: string): Promise<T | null> {
    const value = this.store.get(key)

    if (value !== undefined) {
      // Update access order for LRU
      if (this.evictionPolicy === 'lru') {
        this.updateAccessOrder(key)
      }
      return value as T
    }

    return null
  }

  async set<T>(key: string, value: T): Promise<void> {
    const exists = this.store.has(key)

    // Evict if needed (only if adding new key)
    if (!exists && this.store.size >= this.maxEntries) {
      this.evict()
    }

    this.store.set(key, value)

    if (!exists) {
      // Track insert order for FIFO
      this.insertOrder.push(key)
    }

    // Update access order for LRU
    if (this.evictionPolicy === 'lru') {
      this.updateAccessOrder(key)
    }
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
    this.removeFromTracking(key)
  }

  async clear(): Promise<void> {
    this.store.clear()
    this.accessOrder = []
    this.insertOrder = []
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys())
  }

  /**
   * Gets current size
   */
  size(): number {
    return this.store.size
  }

  /**
   * Evicts one entry based on policy
   */
  private evict(): void {
    let keyToRemove: string | undefined

    if (this.evictionPolicy === 'lru') {
      // Remove least recently used
      keyToRemove = this.accessOrder.shift()
    } else {
      // Remove oldest (FIFO)
      keyToRemove = this.insertOrder.shift()
    }

    if (keyToRemove) {
      this.store.delete(keyToRemove)
      this.removeFromTracking(keyToRemove)
    }
  }

  /**
   * Updates access order for LRU
   */
  private updateAccessOrder(key: string): void {
    // Remove if exists
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }

    // Add to end (most recently used)
    this.accessOrder.push(key)
  }

  /**
   * Removes key from all tracking arrays
   */
  private removeFromTracking(key: string): void {
    // Remove from access order
    const accessIndex = this.accessOrder.indexOf(key)
    if (accessIndex > -1) {
      this.accessOrder.splice(accessIndex, 1)
    }

    // Remove from insert order
    const insertIndex = this.insertOrder.indexOf(key)
    if (insertIndex > -1) {
      this.insertOrder.splice(insertIndex, 1)
    }
  }
}

/**
 * LocalStorage backend for browser environments
 * Falls back to MemoryStorage if localStorage is not available
 */
export class LocalStorageBackend implements StorageBackend {
  private fallback: MemoryStorage | null = null
  private fallbackToMemory = false
  private prefix: string
  private accessTimes = new Map<string, number>() // Track for LRU
  private onError?: (error: Error, operation: string) => void

  constructor(
    prefix: string = 'akash_cache_',
    options?: MemoryStorageOptions & { onError?: (error: Error, operation: string) => void }
  ) {
    this.prefix = prefix
    this.onError = options?.onError

    // Check if localStorage is available
    if (!this.isLocalStorageAvailable()) {
      this.fallback = new MemoryStorage(options)
    }
  }

  private isLocalStorageAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false
      }
      const testKey = '__akash_ls_test__'
      window.localStorage.setItem(testKey, 'test')
      window.localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  private getFullKey(key: string): string {
    return `${this.prefix}${key}`
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.fallback || this.fallbackToMemory) {
      return this.fallback!.get<T>(key)
    }

    try {
      const item = window.localStorage.getItem(this.getFullKey(key))
      if (item === null) {
        return null
      }

      // Update access time for LRU
      this.accessTimes.set(key, Date.now())

      return JSON.parse(item) as T
    } catch (error) {
      this.onError?.(
        error instanceof Error ? error : new Error(String(error)),
        'get'
      )
      return null
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (this.fallback || this.fallbackToMemory) {
      if (!this.fallback) {
        this.fallback = new MemoryStorage()
      }
      return this.fallback.set<T>(key, value)
    }

    try {
      const serialized = JSON.stringify(value)
      window.localStorage.setItem(this.getFullKey(key), serialized)
      this.accessTimes.set(key, Date.now())
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        // Try LRU eviction
        const evicted = await this.evictLRU()

        if (evicted) {
          try {
            const serialized = JSON.stringify(value)
            window.localStorage.setItem(this.getFullKey(key), serialized)
            this.accessTimes.set(key, Date.now())
            return
          } catch (retryError) {
            // Still failing, fall back to memory
            this.handleQuotaExceeded()
            return this.set(key, value)
          }
        } else {
          this.handleQuotaExceeded()
          return this.set(key, value)
        }
      }

      // Other errors
      this.onError?.(
        error instanceof Error ? error : new Error(String(error)),
        'set'
      )
      throw new CacheError('Failed to set cache value', { key }, error as Error)
    }
  }

  async delete(key: string): Promise<void> {
    if (this.fallback || this.fallbackToMemory) {
      return this.fallback!.delete(key)
    }

    try {
      window.localStorage.removeItem(this.getFullKey(key))
      this.accessTimes.delete(key)
    } catch (error) {
      this.onError?.(
        error instanceof Error ? error : new Error(String(error)),
        'delete'
      )
    }
  }

  async clear(): Promise<void> {
    if (this.fallback || this.fallbackToMemory) {
      return this.fallback!.clear()
    }

    try {
      const keys = await this.keys()
      for (const key of keys) {
        window.localStorage.removeItem(this.getFullKey(key))
      }
      this.accessTimes.clear()
    } catch (error) {
      this.onError?.(
        error instanceof Error ? error : new Error(String(error)),
        'clear'
      )
    }
  }

  async keys(): Promise<string[]> {
    if (this.fallback || this.fallbackToMemory) {
      return this.fallback!.keys()
    }

    try {
      const allKeys: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (key && key.startsWith(this.prefix)) {
          allKeys.push(key.substring(this.prefix.length))
        }
      }
      return allKeys
    } catch (error) {
      this.onError?.(
        error instanceof Error ? error : new Error(String(error)),
        'keys'
      )
      return []
    }
  }

  /**
   * Evicts least recently used entry
   * @returns true if an entry was evicted
   */
  private async evictLRU(): Promise<boolean> {
    const keys = await this.keys()

    if (keys.length === 0) {
      return false
    }

    // Find LRU key
    let lruKey: string | null = null
    let lruTime = Infinity

    for (const key of keys) {
      const accessTime = this.accessTimes.get(key) ?? 0
      if (accessTime < lruTime) {
        lruTime = accessTime
        lruKey = key
      }
    }

    if (lruKey) {
      window.localStorage.removeItem(this.getFullKey(lruKey))
      this.accessTimes.delete(lruKey)
      return true
    }

    return false
  }

  private handleQuotaExceeded(): void {
    this.fallbackToMemory = true
    if (!this.fallback) {
      this.fallback = new MemoryStorage()
    }
    this.onError?.(
      new CacheError('LocalStorage quota exceeded, falling back to memory storage'),
      'quota_exceeded'
    )
  }
}
