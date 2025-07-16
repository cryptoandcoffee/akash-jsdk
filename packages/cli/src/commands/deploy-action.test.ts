import { describe, it, expect, beforeEach, vi } from 'vitest'
import { deployCommand } from './deploy-action'
import { AkashSDK } from '@cryptoandcoffee/akash-jsdk-core'
import fs from 'fs/promises'

// Mock dependencies
vi.mock('@cryptoandcoffee/akash-jsdk-core')
vi.mock('../utils/config-action', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    wallet: { mnemonic: 'test mnemonic' },
    network: { rpcEndpoint: 'http://localhost:26657', chainId: 'testnet' }
  })
}))
vi.mock('fs/promises')
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

describe('deployCommand (deploy-action)', () => {
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
        create: vi.fn().mockResolvedValue('deployment-456')
      },
      sdl: {
        validate: vi.fn().mockReturnValue({ valid: true, errors: [] })
      }
    }
    
    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
    vi.mocked(fs.readFile).mockResolvedValue('version: "2.0"\nservices:\n  web:\n    image: nginx')
  })

  it('should deploy from SDL file successfully', async () => {
    const options = { config: '.akash/config.json' }
    
    const result = await deployCommand('./test.yaml', options)
    
    const sdk = vi.mocked(AkashSDK).mock.results[0].value
    expect(fs.readFile).toHaveBeenCalledWith('./test.yaml', 'utf-8')
    expect(sdk.connect).toHaveBeenCalled()
    expect(sdk.sdl.validate).toHaveBeenCalled()
    expect(sdk.deployments.create).toHaveBeenCalled()
    expect(result).toBe('deployment-456')
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('✅ Deployment successful!'))
  })

  it('should load config with custom path', async () => {
    const { loadConfig } = await import('../utils/config-action')
    const options = { config: './custom-config.json' }
    
    await deployCommand('./test.yaml', options)
    
    expect(loadConfig).toHaveBeenCalledWith('./custom-config.json')
  })

  it('should handle SDL file read errors', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))
    const options = { config: '.akash/config.json' }
    
    await expect(deployCommand('./missing.yaml', options)).rejects.toThrow('File not found')
  })

  it('should handle SDL validation errors', async () => {
    const mockSDK = {
      connect: vi.fn().mockResolvedValue(undefined),
      deployments: {
        create: vi.fn()
      },
      sdl: {
        validate: vi.fn().mockReturnValue({ 
          valid: false, 
          errors: ['Invalid service configuration', 'Missing required field'] 
        })
      }
    }
    
    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
    const options = { config: '.akash/config.json' }
    
    await expect(deployCommand('./invalid.yaml', options)).rejects.toThrow(
      'Invalid SDL: Invalid service configuration, Missing required field'
    )
    
    expect(mockSDK.deployments.create).not.toHaveBeenCalled()
  })

  it('should handle deployment creation errors', async () => {
    const mockSDK = {
      connect: vi.fn().mockResolvedValue(undefined),
      deployments: {
        create: vi.fn().mockRejectedValue(new Error('Insufficient funds'))
      },
      sdl: {
        validate: vi.fn().mockReturnValue({ valid: true, errors: [] })
      }
    }
    
    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
    const options = { config: '.akash/config.json' }
    
    await expect(deployCommand('./test.yaml', options)).rejects.toThrow('Insufficient funds')
  })

  it('should handle connection errors', async () => {
    const mockSDK = {
      connect: vi.fn().mockRejectedValue(new Error('Network unreachable')),
      deployments: {
        create: vi.fn()
      },
      sdl: {
        validate: vi.fn()
      }
    }
    
    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
    const options = { config: '.akash/config.json' }
    
    await expect(deployCommand('./test.yaml', options)).rejects.toThrow('Network unreachable')
    expect(mockSDK.sdl.validate).not.toHaveBeenCalled()
    expect(mockSDK.deployments.create).not.toHaveBeenCalled()
  })

  it('should handle missing SDL validation method gracefully', async () => {
    const mockSDK = {
      connect: vi.fn().mockResolvedValue(undefined),
      deployments: {
        create: vi.fn().mockResolvedValue('deployment-789')
      },
      sdl: undefined // No SDL validation available
    }
    
    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
    const options = { config: '.akash/config.json' }
    
    const result = await deployCommand('./test.yaml', options)
    
    expect(result).toBe('deployment-789')
    expect(mockSDK.deployments.create).toHaveBeenCalled()
  })

  it('should handle config loading errors', async () => {
    const { loadConfig } = await import('../utils/config-action')
    vi.mocked(loadConfig).mockRejectedValue(new Error('Config file not found'))
    
    const options = { config: './missing-config.json' }
    
    await expect(deployCommand('./test.yaml', options)).rejects.toThrow('Config file not found')
  })

  it('should read SDL file with correct encoding', async () => {
    const options = { config: '.akash/config.json' }
    
    await deployCommand('./test.yaml', options)
    
    expect(fs.readFile).toHaveBeenCalledWith('./test.yaml', 'utf-8')
  })

  it('should validate SDL content when validation is available', async () => {
    const mockSDLContent = 'version: "2.0"\nservices:\n  web:\n    image: nginx'
    vi.mocked(fs.readFile).mockResolvedValue(mockSDLContent)
    
    const mockSDK = {
      connect: vi.fn().mockResolvedValue(undefined),
      deployments: {
        create: vi.fn().mockResolvedValue('deployment-123')
      },
      sdl: {
        validate: vi.fn().mockReturnValue({ valid: true, errors: [] })
      }
    }
    
    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
    const options = { config: '.akash/config.json' }
    
    await deployCommand('./test.yaml', options)
    
    expect(mockSDK.sdl.validate).toHaveBeenCalledWith(mockSDLContent)
  })
})