import { describe, it, expect, beforeEach, vi } from 'vitest'
import { statusCommand } from './status-action'

// Create shared mock functions
const mockConnect = vi.fn().mockResolvedValue(undefined)
const mockDeploymentsGet = vi.fn().mockResolvedValue({
  id: { owner: 'akash1test', dseq: '123' },
  state: 'active',
  version: '1.0.0',
  createdAt: Date.now()
})
const mockDeploymentsList = vi.fn().mockResolvedValue([
  {
    deploymentId: { owner: 'akash1test', dseq: '123' },
    state: 'active',
    createdAt: Date.now()
  },
  {
    deploymentId: { owner: 'akash1test', dseq: '456' },
    state: 'closed',
    createdAt: Date.now() - 86400000
  }
])
const mockLeasesList = vi.fn().mockResolvedValue([
  {
    leaseId: { provider: 'akash1provider', dseq: '123', gseq: '1', oseq: '1' },
    state: 'active',
    price: { amount: '100', denom: 'uakt' }
  }
])

const mockSDKInstance: any = {
  connect: mockConnect,
  deployments: {
    get: mockDeploymentsGet,
    list: mockDeploymentsList
  },
  leases: {
    list: mockLeasesList
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
  }),
  getOwnerFromConfig: vi.fn().mockResolvedValue('akash1test')
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

describe('statusCommand (status-action)', () => {
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
    mockDeploymentsList.mockResolvedValue([
      {
        deploymentId: { owner: 'akash1test', dseq: '123' },
        state: 'active',
        createdAt: Date.now()
      },
      {
        deploymentId: { owner: 'akash1test', dseq: '456' },
        state: 'closed',
        createdAt: Date.now() - 86400000
      }
    ])
    mockLeasesList.mockResolvedValue([
      {
        leaseId: { provider: 'akash1provider', dseq: '123', gseq: '1', oseq: '1' },
        state: 'active',
        price: { amount: '100', denom: 'uakt' }
      }
    ])
  })

  it('should get specific deployment status by ID', async () => {
    const deploymentId = 'akash1test/123'
    const options = { config: '.akash/config.json' }

    await statusCommand(deploymentId, options)

    expect(mockConnect).toHaveBeenCalled()
    expect(mockDeploymentsGet).toHaveBeenCalledWith({ owner: 'akash1test', dseq: '123' })
    expect(mockLeasesList).toHaveBeenCalledWith({ owner: 'akash1test', dseq: '123' })
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('📋 Deployment Details'))
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Owner: akash1test'))
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('DSEQ: 123'))
  })

  it('should list all deployments when no ID provided', async () => {
    const options = { config: '.akash/config.json' }

    await statusCommand(undefined, options)

    expect(mockConnect).toHaveBeenCalled()
    expect(mockDeploymentsList).toHaveBeenCalled()
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('📋 Deployments (2)'))
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('akash1test/123'))
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('akash1test/456'))
  })

  it('should handle invalid deployment ID format', async () => {
    const deploymentId = 'invalid-format'
    const options = { config: '.akash/config.json' }

    await expect(statusCommand(deploymentId, options)).rejects.toThrow(
      'Invalid deployment ID format. Expected: owner/dseq'
    )
  })

  it('should handle deployment not found error', async () => {
    mockDeploymentsGet.mockRejectedValueOnce(new Error('deployment not found'))

    const deploymentId = 'akash1test/999'
    const options = { config: '.akash/config.json' }

    await expect(statusCommand(deploymentId, options)).rejects.toThrow(
      'Deployment akash1test/999 not found'
    )
  })

  it('should handle deployment found but null response', async () => {
    mockDeploymentsGet.mockResolvedValueOnce(null)

    const deploymentId = 'akash1test/999'
    const options = { config: '.akash/config.json' }

    await expect(statusCommand(deploymentId, options)).rejects.toThrow(
      'Deployment akash1test/999 not found'
    )
  })

  it('should handle generic deployment get errors', async () => {
    mockDeploymentsGet.mockRejectedValueOnce(new Error('Network error'))

    const deploymentId = 'akash1test/123'
    const options = { config: '.akash/config.json' }

    await expect(statusCommand(deploymentId, options)).rejects.toThrow('Network error')
  })

  it('should handle empty deployments list', async () => {
    mockDeploymentsList.mockResolvedValueOnce([])

    const options = { config: '.akash/config.json' }

    await statusCommand(undefined, options)

    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('⚠️  No deployments found'))
  })

  it('should display lease information when available', async () => {
    const deploymentId = 'akash1test/123'
    const options = { config: '.akash/config.json' }

    await statusCommand(deploymentId, options)

    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('🔗 Leases'))
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Provider: akash1provider'))
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('State: active'))
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Price: 100uakt'))
  })

  it('should handle no leases for deployment', async () => {
    mockLeasesList.mockResolvedValueOnce([])

    const deploymentId = 'akash1test/123'
    const options = { config: '.akash/config.json' }

    await statusCommand(deploymentId, options)

    expect(mockLog).not.toHaveBeenCalledWith(expect.stringContaining('🔗 Leases'))
  })

  it('should handle connection errors', async () => {
    mockConnect.mockRejectedValueOnce(new Error('Network unreachable'))

    const options = { config: '.akash/config.json' }

    await expect(statusCommand(undefined, options)).rejects.toThrow('Network unreachable')
  })

  it('should load config with custom path', async () => {
    const { loadConfig } = await import('../utils/config-action')
    const options = { config: './custom-config.json' }

    await statusCommand(undefined, options)

    expect(loadConfig).toHaveBeenCalledWith('./custom-config.json')
  })

  it('should handle config loading errors', async () => {
    const { loadConfig } = await import('../utils/config-action')
    vi.mocked(loadConfig).mockRejectedValue(new Error('Config file not found'))

    const options = { config: './missing-config.json' }

    await expect(statusCommand(undefined, options)).rejects.toThrow('Config file not found')
  })

  it('should format deployment creation date correctly', async () => {
    const testDate = new Date('2023-01-01T12:00:00Z')
    mockDeploymentsGet.mockResolvedValueOnce({
      id: { owner: 'akash1test', dseq: '123' },
      state: 'active',
      version: '1.0.0',
      createdAt: testDate.getTime()
    })

    const deploymentId = 'akash1test/123'
    const options = { config: '.akash/config.json' }

    await statusCommand(deploymentId, options)

    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining(testDate.toLocaleString()))
  })

  it('should handle missing deployment version gracefully', async () => {
    mockDeploymentsGet.mockResolvedValueOnce({
      id: { owner: 'akash1test', dseq: '123' },
      state: 'active',
      createdAt: Date.now()
      // version is undefined
    })

    const deploymentId = 'akash1test/123'
    const options = { config: '.akash/config.json' }

    await statusCommand(deploymentId, options)

    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Version: N/A'))
  })

  it('should handle deployment ID with multiple slashes', async () => {
    const deploymentId = 'akash1test/123/extra'
    const options = { config: '.akash/config.json' }

    await statusCommand(deploymentId, options)

    // Should split on first slash only
    expect(mockDeploymentsGet).toHaveBeenCalledWith({
      owner: 'akash1test',
      dseq: '123/extra'
    })
    expect(mockLeasesList).toHaveBeenCalledWith({
      owner: 'akash1test',
      dseq: '123/extra'
    })
  })
})
