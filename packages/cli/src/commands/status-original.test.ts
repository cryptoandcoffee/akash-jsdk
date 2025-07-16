import { describe, it, expect } from 'vitest'

describe('status command (original)', () => {
  it('should create command with correct properties', async () => {
    const { statusCommand } = await import('./status')
    
    expect(statusCommand).toBeDefined()
    expect(statusCommand.name()).toBe('status')
    expect(statusCommand.description()).toBe('Check deployment status')
  })

  it('should have required options', async () => {
    const { statusCommand } = await import('./status')
    
    const options = statusCommand.options
    expect(options).toBeDefined()
    
    // Check for owner option
    const ownerOption = options.find(opt => opt.long === '--owner')
    expect(ownerOption).toBeDefined()
    
    // Check for deployment option
    const deploymentOption = options.find(opt => opt.long === '--deployment')
    expect(deploymentOption).toBeDefined()
  })
})