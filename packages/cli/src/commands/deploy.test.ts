import { describe, it, expect, beforeEach, vi } from 'vitest'
import { deployAction, deployCommand } from './deploy'
import { AkashSDK } from '@cryptoandcoffee/akash-jsdk-core'

// Mock dependencies
vi.mock('@cryptoandcoffee/akash-jsdk-core')
vi.mock('../utils/config-action', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    rpcEndpoint: 'http://localhost:26657',
    chainId: 'testnet',
    apiEndpoint: 'http://localhost:1317',
    gasPrice: '0.025uakt',
    gasAdjustment: 1.5,
    prefix: 'akash'
  })
}))
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis()
  }))
}))

// Mock console
const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {})

describe('deployAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    const mockSDK = {
      connect: vi.fn().mockResolvedValue(undefined),
      deployments: {
        create: vi.fn().mockResolvedValue('deployment-123')
      }
    }
    
    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
  })

  it('should deploy from SDL file', async () => {
    const options = { config: '.akash/config.json' }
    
    await deployAction('./test.sdl', options)
    
    const sdk = vi.mocked(AkashSDK).mock.results[0].value
    expect(sdk.deployments.create).toHaveBeenCalled()
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('✅ Deployment successful!'))
  })

  it('should load config with custom path', async () => {
    const { loadConfig } = await import('../utils/config-action')
    const options = { config: './custom-config.json' }
    
    await deployAction('./test.sdl', options)
    
    expect(loadConfig).toHaveBeenCalledWith('./custom-config.json')
  })

  it('should handle deployment errors', async () => {
    const mockSDK = {
      connect: vi.fn().mockResolvedValue(undefined),
      deployments: {
        create: vi.fn().mockRejectedValue(new Error('Insufficient funds'))
      }
    }
    
    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
    const options = { config: '.akash/config.json' }
    
    await expect(deployAction('./test.sdl', options)).rejects.toThrow('Insufficient funds')
  })

  it('should handle connection errors', async () => {
    const mockSDK = {
      connect: vi.fn().mockRejectedValue(new Error('Network unreachable')),
      deployments: {
        create: vi.fn()
      }
    }
    
    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
    const options = { config: '.akash/config.json' }
    
    await expect(deployAction('./test.sdl', options)).rejects.toThrow('Network unreachable')
  })
})

describe('deployCommand', () => {
  it('should be configured correctly', () => {
    expect(deployCommand.name()).toBe('deploy')
    expect(deployCommand.description()).toBe('Deploy to Akash Network')
    // Check for the argument existence
    expect(deployCommand.args).toBeDefined()
    expect(deployCommand.options.map(opt => opt.long)).toContain('--config')
  })
})