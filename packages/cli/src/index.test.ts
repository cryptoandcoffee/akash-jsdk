import { describe, it, expect } from 'vitest'

describe('CLI index exports', () => {
  it.skipIf(process.env.CI)('should export command modules', async () => {
    const exports = await import('./index')
    
    // Check that exports are available
    expect(exports).toBeDefined()
    expect(typeof exports).toBe('object')
  })

  it.skipIf(process.env.CI)('should export init command', async () => {
    const { initCommand } = await import('./commands/init')
    expect(initCommand).toBeDefined()
  })

  it.skipIf(process.env.CI)('should export deploy command', async () => {
    const { deployCommand } = await import('./commands/deploy')
    expect(deployCommand).toBeDefined()
  })

  it.skipIf(process.env.CI)('should export status command', async () => {
    const { statusCommand } = await import('./commands/status')
    expect(statusCommand).toBeDefined()
  })

  it.skipIf(process.env.CI)('should export close command', async () => {
    const { closeCommand } = await import('./commands/close')
    expect(closeCommand).toBeDefined()
  })

  it.skipIf(process.env.CI)('should export config utilities', async () => {
    const { loadConfig } = await import('./utils/config')
    expect(loadConfig).toBeDefined()
  })
})