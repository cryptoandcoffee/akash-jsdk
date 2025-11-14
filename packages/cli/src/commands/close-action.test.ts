import { describe, it, expect, beforeEach, vi } from 'vitest'
import { closeCommand } from './close-action'
import { AkashSDK } from '@cryptoandcoffee/akash-jsdk-core'

// Mock dependencies
vi.mock('@cryptoandcoffee/akash-jsdk-core')
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
    
    const mockSDK = {
      connect: vi.fn().mockResolvedValue(undefined),
      deployments: {
        get: vi.fn().mockResolvedValue({
          id: { owner: 'akash1test', dseq: '123' },
          state: 'active',
          version: '1.0.0',
          createdAt: Date.now()
        }),
        close: vi.fn().mockResolvedValue(undefined)
      }
    }
    
    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
  })

  it('should close deployment successfully', async () => {
    const deploymentId = 'akash1test/123'
    const options = { config: '.akash/config.json' }
    
    await closeCommand(deploymentId, options)
    
    const sdk = vi.mocked(AkashSDK).mock.results[0].value
    expect(sdk.connect).toHaveBeenCalled()
    expect(sdk.deployments.get).toHaveBeenCalledWith({ owner: 'akash1test', dseq: '123' })
    expect(sdk.deployments.close).toHaveBeenCalledWith({ owner: 'akash1test', dseq: '123' })
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
    const mockSDK = {
      connect: vi.fn().mockResolvedValue(undefined),
      deployments: {
        get: vi.fn().mockRejectedValue(new Error('deployment not found')),
        close: vi.fn()
      }
    }
    
    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
    const deploymentId = 'akash1test/999'
    const options = { config: '.akash/config.json' }
    
    await expect(closeCommand(deploymentId, options)).rejects.toThrow(
      'Deployment akash1test/999 not found'
    )
    
    expect(mockSDK.deployments.close).not.toHaveBeenCalled()
  })

  it('should handle deployment get returning null', async () => {
    const mockSDK = {
      connect: vi.fn().mockResolvedValue(undefined),
      deployments: {
        get: vi.fn().mockResolvedValue(null),
        close: vi.fn()
      }
    }
    
    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
    const deploymentId = 'akash1test/123'
    const options = { config: '.akash/config.json' }
    
    await expect(closeCommand(deploymentId, options)).rejects.toThrow(
      'Deployment akash1test/123 not found'
    )
    
    expect(mockSDK.deployments.close).not.toHaveBeenCalled()
  })

  it('should handle already closed deployment', async () => {
    const mockSDK = {
      connect: vi.fn().mockResolvedValue(undefined),
      deployments: {
        get: vi.fn().mockResolvedValue({
          id: { owner: 'akash1test', dseq: '123' },
          state: 2, // DeploymentState.CLOSED = 2
          version: '1.0.0',
          createdAt: Date.now()
        }),
        close: vi.fn()
      }
    }

    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
    const deploymentId = 'akash1test/123'
    const options = { config: '.akash/config.json' }

    await closeCommand(deploymentId, options)

    expect(mockSDK.deployments.close).not.toHaveBeenCalled()
    // Should warn that deployment is already closed
  })

  it('should handle generic deployment get errors', async () => {
    const mockSDK = {
      connect: vi.fn().mockResolvedValue(undefined),
      deployments: {
        get: vi.fn().mockRejectedValue(new Error('Network error')),
        close: vi.fn()
      }
    }
    
    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
    const deploymentId = 'akash1test/123'
    const options = { config: '.akash/config.json' }
    
    await expect(closeCommand(deploymentId, options)).rejects.toThrow('Network error')
    expect(mockSDK.deployments.close).not.toHaveBeenCalled()
  })

  it('should handle deployment close errors', async () => {
    const mockSDK = {
      connect: vi.fn().mockResolvedValue(undefined),
      deployments: {
        get: vi.fn().mockResolvedValue({
          id: { owner: 'akash1test', dseq: '123' },
          state: 'active',
          version: '1.0.0',
          createdAt: Date.now()
        }),
        close: vi.fn().mockRejectedValue(new Error('Insufficient funds'))
      }
    }
    
    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
    const deploymentId = 'akash1test/123'
    const options = { config: '.akash/config.json' }
    
    await expect(closeCommand(deploymentId, options)).rejects.toThrow('Insufficient funds')
  })

  it('should handle connection errors', async () => {
    const mockSDK = {
      connect: vi.fn().mockRejectedValue(new Error('Network unreachable')),
      deployments: {
        get: vi.fn(),
        close: vi.fn()
      }
    }
    
    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
    const deploymentId = 'akash1test/123'
    const options = { config: '.akash/config.json' }
    
    await expect(closeCommand(deploymentId, options)).rejects.toThrow('Network unreachable')
    expect(mockSDK.deployments.get).not.toHaveBeenCalled()
    expect(mockSDK.deployments.close).not.toHaveBeenCalled()
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
    
    const sdk = vi.mocked(AkashSDK).mock.results[0].value
    expect(sdk.deployments.get).toHaveBeenCalledWith({ 
      owner: 'akash1longaddress123', 
      dseq: '456789' 
    })
    expect(sdk.deployments.close).toHaveBeenCalledWith({ 
      owner: 'akash1longaddress123', 
      dseq: '456789' 
    })
  })

  it('should handle deployment ID with multiple slashes', async () => {
    const deploymentId = 'akash1test/123/extra'
    const options = { config: '.akash/config.json' }
    
    await closeCommand(deploymentId, options)
    
    const sdk = vi.mocked(AkashSDK).mock.results[0].value
    // Should split on first slash only
    expect(sdk.deployments.get).toHaveBeenCalledWith({ 
      owner: 'akash1test', 
      dseq: '123/extra' 
    })
  })

  it('should handle empty deployment ID parts', async () => {
    const deploymentId = '/123'
    const options = { config: '.akash/config.json' }
    
    await closeCommand(deploymentId, options)
    
    const sdk = vi.mocked(AkashSDK).mock.results[0].value
    expect(sdk.deployments.get).toHaveBeenCalledWith({ 
      owner: '', 
      dseq: '123' 
    })
  })

  it('should handle deployment with different states', async () => {
    const testStates = ['paused', 'pending', 'active']
    
    for (const state of testStates) {
      vi.clearAllMocks()
      
      const mockSDK = {
        connect: vi.fn().mockResolvedValue(undefined),
        deployments: {
          get: vi.fn().mockResolvedValue({
            id: { owner: 'akash1test', dseq: '123' },
            state: state,
            version: '1.0.0',
            createdAt: Date.now()
          }),
          close: vi.fn().mockResolvedValue(undefined)
        }
      }
      
      vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
      
      const deploymentId = 'akash1test/123'
      const options = { config: '.akash/config.json' }
      
      await closeCommand(deploymentId, options)
      
      expect(mockSDK.deployments.close).toHaveBeenCalled()
    }
  })
})