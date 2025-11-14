import { describe, it, expect, beforeEach, vi } from 'vitest'
import { deployAction, deployCommand } from './deploy'

// Create a shared mock SDK instance that will be used by all tests
let mockSDKInstance: any

// Mock dependencies
vi.mock('@cryptoandcoffee/akash-jsdk-core', () => {
  return {
    AkashSDK: vi.fn(function(this: any, config: any) {
      // Store the instance so tests can access it
      mockSDKInstance = this

      this.connect = vi.fn().mockResolvedValue(undefined)
      this.deployments = {
        create: vi.fn().mockResolvedValue('deployment-123')
      }
      return this
    })
  }
})
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

    // Reset mock implementations to defaults after clearAllMocks
    if (mockSDKInstance) {
      mockSDKInstance.connect.mockResolvedValue(undefined)
      mockSDKInstance.deployments.create.mockResolvedValue('deployment-123')
    }
  })

  it('should deploy from SDL file', async () => {
    const options = { config: '.akash/config.json' }

    await deployAction('./test.sdl', options)

    expect(mockSDKInstance.deployments.create).toHaveBeenCalled()
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('✅ Deployment successful!'))
  })

  it('should load config with custom path', async () => {
    const { loadConfig } = await import('../utils/config-action')
    const options = { config: './custom-config.json' }

    await deployAction('./test.sdl', options)

    expect(loadConfig).toHaveBeenCalledWith('./custom-config.json')
  })

  it('should handle deployment errors', async () => {
    mockSDKInstance.deployments.create.mockRejectedValue(new Error('Insufficient funds'))

    const options = { config: '.akash/config.json' }

    await expect(deployAction('./test.sdl', options)).rejects.toThrow('Insufficient funds')
  })

  it('should handle connection errors', async () => {
    mockSDKInstance.connect.mockRejectedValue(new Error('Network unreachable'))

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
