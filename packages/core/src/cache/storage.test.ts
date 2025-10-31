import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStorage, LocalStorageBackend } from './storage'

describe('MemoryStorage bounded', () => {
  it('should respect max entries limit', async () => {
    const storage = new MemoryStorage({ maxEntries: 3 })

    await storage.set('key1', 'value1')
    await storage.set('key2', 'value2')
    await storage.set('key3', 'value3')
    await storage.set('key4', 'value4') // Should evict key1

    expect(storage.size()).toBe(3)
    expect(await storage.get('key1')).toBeNull()
    expect(await storage.get('key4')).toBe('value4')
  })

  it('should evict LRU when policy is lru', async () => {
    const storage = new MemoryStorage({
      maxEntries: 3,
      evictionPolicy: 'lru'
    })

    await storage.set('key1', 'value1')
    await storage.set('key2', 'value2')
    await storage.set('key3', 'value3')

    // Access key1 to make it recently used
    await storage.get('key1')

    // This should evict key2 (least recently used)
    await storage.set('key4', 'value4')

    expect(await storage.get('key1')).toBe('value1') // Still there
    expect(await storage.get('key2')).toBeNull() // Evicted
    expect(await storage.get('key4')).toBe('value4')
  })

  it('should evict FIFO when policy is fifo', async () => {
    const storage = new MemoryStorage({
      maxEntries: 3,
      evictionPolicy: 'fifo'
    })

    await storage.set('key1', 'value1')
    await storage.set('key2', 'value2')
    await storage.set('key3', 'value3')
    await storage.set('key4', 'value4') // Should evict key1 (oldest)

    expect(await storage.get('key1')).toBeNull()
    expect(await storage.get('key2')).toBe('value2')
  })

  it('should not evict when updating existing key', async () => {
    const storage = new MemoryStorage({ maxEntries: 2 })

    await storage.set('key1', 'value1')
    await storage.set('key2', 'value2')

    // Update key1 - should not trigger eviction
    await storage.set('key1', 'updated1')

    expect(storage.size()).toBe(2)
    expect(await storage.get('key1')).toBe('updated1')
    expect(await storage.get('key2')).toBe('value2')
  })

  it('should properly track after delete', async () => {
    const storage = new MemoryStorage({ maxEntries: 3 })

    await storage.set('key1', 'value1')
    await storage.set('key2', 'value2')
    await storage.delete('key1')
    await storage.set('key3', 'value3')
    await storage.set('key4', 'value4')

    expect(storage.size()).toBe(3)
    expect(await storage.get('key1')).toBeNull()
    expect(await storage.get('key2')).toBe('value2')
    expect(await storage.get('key3')).toBe('value3')
    expect(await storage.get('key4')).toBe('value4')
  })

  it('should clear all tracking on clear', async () => {
    const storage = new MemoryStorage({ maxEntries: 3 })

    await storage.set('key1', 'value1')
    await storage.set('key2', 'value2')
    await storage.clear()

    expect(storage.size()).toBe(0)

    // Should be able to add entries again
    await storage.set('key3', 'value3')
    await storage.set('key4', 'value4')
    await storage.set('key5', 'value5')

    expect(storage.size()).toBe(3)
  })

  it('should handle LRU with multiple accesses', async () => {
    const storage = new MemoryStorage({
      maxEntries: 3,
      evictionPolicy: 'lru'
    })

    await storage.set('key1', 'value1')
    await storage.set('key2', 'value2')
    await storage.set('key3', 'value3')

    // Access pattern: key3, key1, key2
    await storage.get('key3')
    await storage.get('key1')
    await storage.get('key2')

    // key3 is now LRU, should be evicted
    await storage.set('key4', 'value4')

    expect(await storage.get('key3')).toBeNull()
    expect(await storage.get('key1')).toBe('value1')
    expect(await storage.get('key2')).toBe('value2')
    expect(await storage.get('key4')).toBe('value4')
  })

  it('should use default values when no options provided', async () => {
    const storage = new MemoryStorage()

    // Default maxEntries is 1000
    for (let i = 0; i < 1001; i++) {
      await storage.set(`key${i}`, `value${i}`)
    }

    expect(storage.size()).toBe(1000)
    expect(await storage.get('key0')).toBeNull() // First key evicted
    expect(await storage.get('key1000')).toBe('value1000') // Last key exists
  })
})

describe('MemoryStorage basic operations', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
  })

  it('should store and retrieve values', async () => {
    await storage.set('test', 'value')
    expect(await storage.get('test')).toBe('value')
  })

  it('should return null for non-existent keys', async () => {
    expect(await storage.get('nonexistent')).toBeNull()
  })

  it('should delete values', async () => {
    await storage.set('test', 'value')
    await storage.delete('test')
    expect(await storage.get('test')).toBeNull()
  })

  it('should clear all values', async () => {
    await storage.set('key1', 'value1')
    await storage.set('key2', 'value2')
    await storage.clear()
    expect(await storage.get('key1')).toBeNull()
    expect(await storage.get('key2')).toBeNull()
  })

  it('should return all keys', async () => {
    await storage.set('key1', 'value1')
    await storage.set('key2', 'value2')
    const keys = await storage.keys()
    expect(keys).toContain('key1')
    expect(keys).toContain('key2')
    expect(keys.length).toBe(2)
  })
})
