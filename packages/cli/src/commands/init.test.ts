import { describe, it, expect, beforeEach, vi } from 'vitest'
import { initAction, initCommand } from './init'
import inquirer from 'inquirer'
import { writeFileSync } from 'fs'
import { join } from 'path'

// Mock dependencies
vi.mock('inquirer')
vi.mock('fs', () => ({
  writeFileSync: vi.fn()
}))
vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/'))
}))

// Mock console
const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {})

describe('initAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with defaults', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({
      projectName: 'my-akash-app',
      framework: 'vanilla',
      rpcEndpoint: 'https://rpc.akashedge.com:443',
      chainId: 'akashnet-2'
    })

    const options = {}
    await initAction(options)
    
    expect(inquirer.prompt).toHaveBeenCalled()
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('package.json'),
      expect.stringContaining('my-akash-app')
    )
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('akash.config.js'),
      expect.stringContaining('https://rpc.akashedge.com:443')
    )
  })

  it('should use provided options as defaults', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({
      projectName: 'custom-app',
      framework: 'react',
      rpcEndpoint: 'https://rpc.akashedge.com:443',
      chainId: 'akashnet-2'
    })

    const options = { name: 'custom-app', framework: 'react' }
    await initAction(options)
    
    const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as any[]
    expect(promptCall.find(q => q.name === 'projectName').default).toBe('custom-app')
    expect(promptCall.find(q => q.name === 'framework').default).toBe('react')
  })

  it('should generate React project dependencies', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({
      projectName: 'react-app',
      framework: 'react',
      rpcEndpoint: 'https://rpc.akashedge.com:443',
      chainId: 'akashnet-2'
    })

    await initAction({})
    
    const packageJsonCall = vi.mocked(writeFileSync).mock.calls.find(call => 
      call[0].toString().includes('package.json')
    )
    const packageContent = JSON.parse(packageJsonCall![1] as string)
    expect(packageContent.dependencies).toHaveProperty('@cryptoandcoffee/akash-jsdk-react')
    expect(packageContent.dependencies).toHaveProperty('react')
    expect(packageContent.dependencies).toHaveProperty('react-dom')
  })

  it('should generate Next.js project dependencies', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({
      projectName: 'next-app',
      framework: 'next',
      rpcEndpoint: 'https://rpc.akashedge.com:443',
      chainId: 'akashnet-2'
    })

    await initAction({})
    
    const packageJsonCall = vi.mocked(writeFileSync).mock.calls.find(call => 
      call[0].toString().includes('package.json')
    )
    const packageContent = JSON.parse(packageJsonCall![1] as string)
    expect(packageContent.dependencies).toHaveProperty('next')
    expect(packageContent.scripts.dev).toBe('next dev')
    expect(packageContent.scripts.build).toBe('next build')
    expect(packageContent.scripts.start).toBe('next start')
  })

  it('should generate vanilla project dependencies', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({
      projectName: 'vanilla-app',
      framework: 'vanilla',
      rpcEndpoint: 'https://rpc.akashedge.com:443',
      chainId: 'akashnet-2'
    })

    await initAction({})
    
    const packageJsonCall = vi.mocked(writeFileSync).mock.calls.find(call => 
      call[0].toString().includes('package.json')
    )
    const packageContent = JSON.parse(packageJsonCall![1] as string)
    expect(packageContent.dependencies).not.toHaveProperty('react')
    expect(packageContent.scripts.dev).toBe('vite dev')
  })

  it('should generate custom config with provided values', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({
      projectName: 'test-app',
      framework: 'vanilla',
      rpcEndpoint: 'https://custom-rpc.com:443',
      chainId: 'testnet-2'
    })

    await initAction({})
    
    const configCall = vi.mocked(writeFileSync).mock.calls.find(call => 
      call[0].toString().includes('akash.config.js')
    )
    expect(configCall![1]).toContain('https://custom-rpc.com:443')
    expect(configCall![1]).toContain('testnet-2')
  })

  it('should validate project name input', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({
      projectName: 'valid-name',
      framework: 'vanilla',
      rpcEndpoint: 'https://rpc.akashedge.com:443',
      chainId: 'akashnet-2'
    })

    await initAction({})
    
    const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as any[]
    const namePrompt = promptCall.find(q => q.name === 'projectName')
    expect(namePrompt.validate('')).toBe(false)
    expect(namePrompt.validate('valid-name')).toBe(true)
  })
})

describe('initCommand', () => {
  it('should be configured correctly', () => {
    expect(initCommand.name()).toBe('init')
    expect(initCommand.description()).toBe('Initialize a new Akash SDK project')
    expect(initCommand.options.map(opt => opt.long)).toContain('--name')
    expect(initCommand.options.map(opt => opt.long)).toContain('--framework')
  })
})