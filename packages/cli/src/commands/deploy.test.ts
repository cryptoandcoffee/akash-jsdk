import { describe, it, expect, beforeEach, vi } from 'vitest'
import { deployAction, deployCommand } from './deploy'

// Create shared mock functions
const mockConnect = vi.fn().mockResolvedValue(undefined)
const mockDeploymentsCreate = vi.fn().mockResolvedValue('deployment-123')

const mockSDKInstance: any = {
  connect: mockConnect,
  deployments: {
    create: mockDeploymentsCreate
  }
}

// Mock dependencies
vi.mock('@cryptoandcoffee/akash-jsdk-core', () => {
  return {
    AkashSDK: vi.fn(function(this: any, config: any) {
      return mockSDKInstance
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
    mockConnect.mockResolvedValue(undefined)
    mockDeploymentsCreate.mockResolvedValue('deployment-123')
  })

  it('should deploy from SDL file', async () => {
    const options = { config: '.akash/config.json' }

    await deployAction('./test.sdl', options)

    expect(mockDeploymentsCreate).toHaveBeenCalled()
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('✅ Deployment successful!'))
  })

  it('should load config with custom path', async () => {
    const { loadConfig } = await import('../utils/config-action')
    const options = { config: './custom-config.json' }

    await deployAction('./test.sdl', options)

    expect(loadConfig).toHaveBeenCalledWith('./custom-config.json')
  })

  it('should handle deployment errors', async () => {
    mockDeploymentsCreate.mockRejectedValueOnce(new Error('Insufficient funds'))

    const options = { config: '.akash/config.json' }

    await expect(deployAction('./test.sdl', options)).rejects.toThrow('Insufficient funds')
  })

  it('should handle connection errors', async () => {
    mockConnect.mockRejectedValueOnce(new Error('Network unreachable'))

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
