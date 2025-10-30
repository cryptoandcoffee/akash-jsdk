import { describe, it, expect } from 'vitest'

describe('close command (original)', () => {
  it.skipIf(process.env.CI)('should create command with correct properties', async () => {
    const { closeCommand } = await import('./close')
    
    expect(closeCommand).toBeDefined()
    expect(closeCommand.name()).toBe('close')
    expect(closeCommand.description()).toBe('Close deployment')
  })

  it.skipIf(process.env.CI)('should have required options and arguments', async () => {
    const { closeCommand } = await import('./close')
    
    const options = closeCommand.options
    expect(options).toBeDefined()
    
    // Check for deployment option
    const deploymentOption = options.find(opt => opt.long === '--deployment')
    expect(deploymentOption).toBeDefined()
    
    // Check for owner option
    const ownerOption = options.find(opt => opt.long === '--owner')
    expect(ownerOption).toBeDefined()
  })
})