import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
vi.mock('inquirer')
vi.mock('fs')
vi.mock('path')

describe('init command (original)', () => {
  it.skipIf(process.env.CI)('should create command with correct properties', async () => {
    const { initCommand } = await import('./init')
    
    expect(initCommand).toBeDefined()
    expect(initCommand.name()).toBe('init')
    expect(initCommand.description()).toBe('Initialize a new Akash SDK project')
  })

  it.skipIf(process.env.CI)('should have required options', async () => {
    const { initCommand } = await import('./init')
    
    const options = initCommand.options
    expect(options).toBeDefined()
    expect(options.length).toBeGreaterThan(0)
    
    // Check for name option
    const nameOption = options.find(opt => opt.long === '--name')
    expect(nameOption).toBeDefined()
    
    // Check for framework option
    const frameworkOption = options.find(opt => opt.long === '--framework')
    expect(frameworkOption).toBeDefined()
  })
})