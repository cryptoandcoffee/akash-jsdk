import { describe, it, expect } from 'vitest'

describe('config utilities (original)', () => {
  it('should export loadConfig function', async () => {
    const exports = await import('./config')
    
    expect(exports.loadConfig).toBeDefined()
    expect(typeof exports.loadConfig).toBe('function')
  })
})