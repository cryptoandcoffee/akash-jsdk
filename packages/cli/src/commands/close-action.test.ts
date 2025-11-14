import { describe, it, expect, beforeEach, vi } from 'vitest'
import { closeCommand } from './close-action'

// Create a shared mock SDK instance that will be used by all tests
const mockConnect = vi.fn().mockResolvedValue(undefined)
const mockDeploymentsGet = vi.fn().mockResolvedValue({
  id: { owner: 'akash1test', dseq: '123' },
  state: 'active',
  version: '1.0.0',
  createdAt: Date.now()
})
const mockDeploymentsClose = vi.fn().mockResolvedValue(undefined)

const mockSDKInstance: any = {
  connect: mockConnect,
  deployments: {
    get: mockDeploymentsGet,
    close: mockDeploymentsClose
  }
}

// Mock dependencies
vi.mock('@cryptoandcoffee/akash-jsdk-core', () => {
  return {
    AkashSDK: vi.fn(function(this: any, config: any) {
      // Return the shared mock instance
      return mockSDKInstance
    })
  }
})
vi.mock('../utils/config-action', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    wallet: { mnemonic: 'test mnemonic' },
    network: { rpcEndpoint: 'http://localhost:26657', chainId: 'testnet' }
  })
}))
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis()
  }))
}))

// Mock console
const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {})

describe('closeCommand (close-action)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // Reset loadConfig mock to default successful state
    const { loadConfig } = await import('../utils/config-action')
    vi.mocked(loadConfig).mockResolvedValue({
      wallet: { mnemonic: 'test mnemonic' },
      network: { rpcEndpoint: 'http://localhost:26657', chainId: 'testnet' }
    })

    // Reset mock implementations to defaults after clearAllMocks
    mockConnect.mockResolvedValue(undefined)
    mockDeploymentsGet.mockResolvedValue({
      id: { owner: 'akash1test', dseq: '123' },
      state: 'active',
      version: '1.0.0',
      createdAt: Date.now()
    })
    mockDeploymentsClose.mockResolvedValue(undefined)
  })

  it('should close deployment successfully', async () => {
    const deploymentId = 'akash1test/123'
    const options = { config: '.akash/config.json' }

    await closeCommand(deploymentId, options)

    expect(mockConnect).toHaveBeenCalled()
    expect(mockDeploymentsGet).toHaveBeenCalledWith({ owner: 'akash1test', dseq: '123' })
    expect(mockDeploymentsClose).toHaveBeenCalledWith({ owner: 'akash1test', dseq: '123' })
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('✅ Deployment akash1test/123 has been closed'))
  })

  it('should handle invalid deployment ID format', async () => {
    const deploymentId = 'invalid-format'
    const options = { config: '.akash/config.json' }

    await expect(closeCommand(deploymentId, options)).rejects.toThrow(
      'Invalid deployment ID format. Expected: owner/dseq'
    )
  })

  it('should handle deployment not found error', async () => {
    mockDeploymentsGet.mockRejectedValueOnce(new Error('deployment not found'))

    const deploymentId = 'akash1test/999'
    const options = { config: '.akash/config.json' }

    await expect(closeCommand(deploymentId, options)).rejects.toThrow(
      'Deployment akash1test/999 not found'
    )

    expect(mockDeploymentsClose).not.toHaveBeenCalled()
  })

  it('should handle deployment get returning null', async () => {
    mockDeploymentsGet.mockResolvedValueOnce(null)

    const deploymentId = 'akash1test/123'
    const options = { config: '.akash/config.json' }

    await expect(closeCommand(deploymentId, options)).rejects.toThrow(
      'Deployment akash1test/123 not found'
    )

    expect(mockDeploymentsClose).not.toHaveBeenCalled()
  })

  it('should handle already closed deployment', async () => {
    mockDeploymentsGet.mockResolvedValueOnce({
      id: { owner: 'akash1test', dseq: '123' },
      state: 2, // DeploymentState.CLOSED = 2
      version: '1.0.0',
      createdAt: Date.now()
    })

    const deploymentId = 'akash1test/123'
    const options = { config: '.akash/config.json' }

    await closeCommand(deploymentId, options)

    expect(mockDeploymentsClose).not.toHaveBeenCalled()
  })

  it('should handle generic deployment get errors', async () => {
    mockDeploymentsGet.mockRejectedValueOnce(new Error('Network error'))

    const deploymentId = 'akash1test/123'
    const options = { config: '.akash/config.json' }

    await expect(closeCommand(deploymentId, options)).rejects.toThrow('Network error')
    expect(mockDeploymentsClose).not.toHaveBeenCalled()
  })

  it('should handle deployment close errors', async () => {
    mockDeploymentsClose.mockRejectedValueOnce(new Error('Insufficient funds'))

    const deploymentId = 'akash1test/123'
    const options = { config: '.akash/config.json' }

    await expect(closeCommand(deploymentId, options)).rejects.toThrow('Insufficient funds')
  })

  it('should handle connection errors', async () => {
    mockConnect.mockRejectedValueOnce(new Error('Network unreachable'))

    const deploymentId = 'akash1test/123'
    const options = { config: '.akash/config.json' }

    await expect(closeCommand(deploymentId, options)).rejects.toThrow('Network unreachable')
    expect(mockDeploymentsGet).not.toHaveBeenCalled()
    expect(mockDeploymentsClose).not.toHaveBeenCalled()
  })

  it('should load config with custom path', async () => {
    const { loadConfig } = await import('../utils/config-action')
    const deploymentId = 'akash1test/123'
    const options = { config: './custom-config.json' }

    await closeCommand(deploymentId, options)

    expect(loadConfig).toHaveBeenCalledWith('./custom-config.json')
  })

  it('should handle config loading errors', async () => {
    const { loadConfig } = await import('../utils/config-action')
    vi.mocked(loadConfig).mockRejectedValue(new Error('Config file not found'))

    const deploymentId = 'akash1test/123'
    const options = { config: './missing-config.json' }

    await expect(closeCommand(deploymentId, options)).rejects.toThrow('Config file not found')
  })

  it('should parse deployment ID correctly', async () => {
    const deploymentId = 'akash1longaddress123/456789'
    const options = { config: '.akash/config.json' }

    await closeCommand(deploymentId, options)

    expect(mockDeploymentsGet).toHaveBeenCalledWith({
      owner: 'akash1longaddress123',
      dseq: '456789'
    })
    expect(mockDeploymentsClose).toHaveBeenCalledWith({
      owner: 'akash1longaddress123',
      dseq: '456789'
    })
  })

  it('should handle deployment ID with multiple slashes', async () => {
    const deploymentId = 'akash1test/123/extra'
    const options = { config: '.akash/config.json' }

    await closeCommand(deploymentId, options)

    // Should split on first slash only
    expect(mockDeploymentsGet).toHaveBeenCalledWith({
      owner: 'akash1test',
      dseq: '123/extra'
    })
  })

  it('should handle empty deployment ID parts', async () => {
    const deploymentId = '/123'
    const options = { config: '.akash/config.json' }

    await closeCommand(deploymentId, options)

    expect(mockDeploymentsGet).toHaveBeenCalledWith({
      owner: '',
      dseq: '123'
    })
  })

  it('should handle deployment with different states', async () => {
    const testStates = ['paused', 'pending', 'active']

    for (const state of testStates) {
      vi.clearAllMocks()

      mockDeploymentsGet.mockResolvedValue({
        id: { owner: 'akash1test', dseq: '123' },
        state: state,
        version: '1.0.0',
        createdAt: Date.now()
      })

      const deploymentId = 'akash1test/123'
      const options = { config: '.akash/config.json' }

      await closeCommand(deploymentId, options)

      expect(mockDeploymentsClose).toHaveBeenCalled()
    }
  })
})
