import { describe, it, expect } from 'vitest'

describe('deploy command (original)', () => {
  it('should create command with correct properties', async () => {
    const { deployCommand } = await import('./deploy')
    
    expect(deployCommand).toBeDefined()
    expect(deployCommand.name()).toBe('deploy')
    expect(deployCommand.description()).toBe('Deploy to Akash Network')
  })

  it('should have required options and arguments', async () => {
    const { deployCommand } = await import('./deploy')
    
    const options = deployCommand.options
    expect(options).toBeDefined()
    
    // Check for config option
    const configOption = options.find(opt => opt.long === '--config')
    expect(configOption).toBeDefined()
  })
})