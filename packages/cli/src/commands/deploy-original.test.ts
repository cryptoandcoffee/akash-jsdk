import { describe, it, expect } from 'vitest'

describe('deploy command (original)', () => {
  it.skipIf(process.env.CI)('should create command with correct properties', async () => {
    const { deployCommand } = await import('./deploy')
    
    expect(deployCommand).toBeDefined()
    expect(deployCommand.name()).toBe('deploy')
    expect(deployCommand.description()).toBe('Deploy to Akash Network')
  })

  it.skipIf(process.env.CI)('should have required options and arguments', async () => {
    const { deployCommand } = await import('./deploy')
    
    const options = deployCommand.options
    expect(options).toBeDefined()
    
    // Check for config option
    const configOption = options.find(opt => opt.long === '--config')
    expect(configOption).toBeDefined()
  })
})