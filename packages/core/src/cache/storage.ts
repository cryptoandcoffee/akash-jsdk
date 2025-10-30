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

/**
 * In-memory storage backend
 * Suitable for Node.js and browser environments
 */
export class MemoryStorage implements StorageBackend {
  private store: Map<string, any> = new Map()

  async get<T>(key: string): Promise<T | null> {
    const value = this.store.get(key)
    return value !== undefined ? value : null
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  async clear(): Promise<void> {
    this.store.clear()
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys())
  }
}

/**
 * LocalStorage backend for browser environments
 * Falls back to MemoryStorage if localStorage is not available
 */
export class LocalStorageBackend implements StorageBackend {
  private fallback: MemoryStorage | null = null
  private prefix: string

  constructor(prefix: string = 'akash_cache_') {
    this.prefix = prefix

    // Check if localStorage is available
    if (!this.isLocalStorageAvailable()) {
      this.fallback = new MemoryStorage()
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
    if (this.fallback) {
      return this.fallback.get<T>(key)
    }

    try {
      const item = window.localStorage.getItem(this.getFullKey(key))
      if (item === null) {
        return null
      }
      return JSON.parse(item) as T
    } catch (error) {
      console.warn('Failed to get item from localStorage:', error)
      return null
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (this.fallback) {
      return this.fallback.set<T>(key, value)
    }

    try {
      window.localStorage.setItem(this.getFullKey(key), JSON.stringify(value))
    } catch (error) {
      console.warn('Failed to set item in localStorage:', error)
      // If quota exceeded, clear old entries and try again
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        await this.clear()
        try {
          window.localStorage.setItem(this.getFullKey(key), JSON.stringify(value))
        } catch {
          // If still fails, ignore
        }
      }
    }
  }

  async delete(key: string): Promise<void> {
    if (this.fallback) {
      return this.fallback.delete(key)
    }

    try {
      window.localStorage.removeItem(this.getFullKey(key))
    } catch (error) {
      console.warn('Failed to delete item from localStorage:', error)
    }
  }

  async clear(): Promise<void> {
    if (this.fallback) {
      return this.fallback.clear()
    }

    try {
      const keys = await this.keys()
      for (const key of keys) {
        window.localStorage.removeItem(this.getFullKey(key))
      }
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  }

  async keys(): Promise<string[]> {
    if (this.fallback) {
      return this.fallback.keys()
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
      console.warn('Failed to get keys from localStorage:', error)
      return []
    }
  }
}
