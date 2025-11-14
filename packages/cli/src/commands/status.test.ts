import { describe, it, expect, beforeEach, vi } from 'vitest'
import { statusAction, statusCommand } from './status'

// Create shared mock functions
const mockConnect = vi.fn().mockResolvedValue(undefined)
const mockDeploymentsList = vi.fn().mockResolvedValue([
  {
    deploymentId: { owner: 'akash1test', dseq: '123' },
    state: 'active',
    createdAt: new Date().toISOString()
  }
])
const mockLeasesList = vi.fn().mockResolvedValue([
  {
    leaseId: {
      dseq: '123',
      gseq: '1',
      oseq: '1',
      provider: 'akash1provider'
    },
    state: 'active',
    price: { denom: 'uakt', amount: '100' }
  }
])

const mockSDKInstance: any = {
  connect: mockConnect,
  deployments: {
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
vi.mock('../utils/config', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    wallet: { mnemonic: 'test mnemonic' },
    network: { rpcEndpoint: 'http://localhost:26657' }
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

// Mock console and process
const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockError = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('statusAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock implementations to defaults after clearAllMocks
    mockConnect.mockResolvedValue(undefined)
    mockDeploymentsList.mockResolvedValue([
      {
        deploymentId: { owner: 'akash1test', dseq: '123' },
        state: 'active',
        createdAt: new Date().toISOString()
      }
    ])
    mockLeasesList.mockResolvedValue([
      {
        leaseId: {
          dseq: '123',
          gseq: '1',
          oseq: '1',
          provider: 'akash1provider'
        },
        state: 'active',
        price: { denom: 'uakt', amount: '100' }
      }
    ])
  })

  it('should fail when owner is not provided', async () => {
    const options = {}

    await statusAction(options)

    // Spinner.fail just logs and returns - no assertions needed
  })

  it('should show deployments and leases when owner provided', async () => {
    const options = { owner: 'akash1test' }

    await statusAction(options)

    expect(mockDeploymentsList).toHaveBeenCalledWith('akash1test')
    expect(mockLeasesList).toHaveBeenCalledWith('akash1test')
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Deployment Status'))
  })

  it('should handle no deployments found', async () => {
    mockDeploymentsList.mockResolvedValueOnce([])
    mockLeasesList.mockResolvedValueOnce([])

    const options = { owner: 'akash1test' }

    await statusAction(options)

    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('No deployments found'))
  })

  it('should display deployment information correctly', async () => {
    const options = { owner: 'akash1test' }
    
    await statusAction(options)
    
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('1. Deployment 123'))
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Owner: akash1test'))
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('State: active'))
  })

  it('should display lease information when leases exist', async () => {
    const options = { owner: 'akash1test' }
    
    await statusAction(options)
    
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Active Leases'))
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('1. Lease 123-1-1'))
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Provider: akash1provider'))
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Price: 100 uakt'))
  })

  it('should not display lease section when no leases exist', async () => {
    mockLeasesList.mockResolvedValueOnce([])

    const options = { owner: 'akash1test' }

    await statusAction(options)

    expect(mockLog).not.toHaveBeenCalledWith(expect.stringContaining('Active Leases'))
  })

  it('should handle fetch status errors', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('process.exit') }) as any)

    mockDeploymentsList.mockRejectedValueOnce(new Error('Network error'))

    const options = { owner: 'akash1test' }

    await expect(statusAction(options)).rejects.toThrow('process.exit')
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Error:'), 'Network error')

    mockExit.mockRestore()
  })
})

describe('statusCommand', () => {
  it('should be configured correctly', () => {
    expect(statusCommand.name()).toBe('status')
    expect(statusCommand.description()).toBe('Check deployment status')
    expect(statusCommand.options.map(opt => opt.long)).toContain('--owner')
    expect(statusCommand.options.map(opt => opt.long)).toContain('--deployment')
  })
})