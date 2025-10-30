import { describe, it, expect } from 'vitest'

describe('React hooks index exports', () => {
  it.skipIf(process.env.CI)('should export hook functions', async () => {
    const exports = await import('./index')
    
    expect(exports.useDeployments).toBeDefined()
    expect(exports.useLeases).toBeDefined()
    expect(exports.useProviders).toBeDefined()
    
    expect(typeof exports.useDeployments).toBe('function')
    expect(typeof exports.useLeases).toBe('function')
    expect(typeof exports.useProviders).toBe('function')
  })
})