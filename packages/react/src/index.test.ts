import { describe, it, expect } from 'vitest'

describe('React index exports', () => {
  it('should export all modules', async () => {
    const exports = await import('./index')
    
    expect(exports).toBeDefined()
    expect(typeof exports).toBe('object')
  })

  it('should export hooks', async () => {
    const { useDeployments, useLeases, useProviders } = await import('./hooks')
    
    expect(useDeployments).toBeDefined()
    expect(useLeases).toBeDefined()
    expect(useProviders).toBeDefined()
  })

  it('should export providers', async () => {
    const { AkashProvider, useAkashContext } = await import('./providers/AkashProvider')
    
    expect(AkashProvider).toBeDefined()
    expect(useAkashContext).toBeDefined()
  })
})