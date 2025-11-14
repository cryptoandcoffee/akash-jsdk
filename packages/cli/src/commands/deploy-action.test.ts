import { describe, it, expect, beforeEach, vi } from 'vitest'
import { deployCommand } from './deploy-action'
import fs from 'fs/promises'

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
        create: vi.fn().mockResolvedValue('deployment-456')
      }
      this.sdl = {
        validate: vi.fn().mockReturnValue({ valid: true, errors: [] })
      }
      return this
    })
  }
})
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

    vi.mocked(fs.readFile).mockResolvedValue('version: "2.0"\nservices:\n  web:\n    image: nginx')

    // Reset mock implementations to defaults after clearAllMocks
    if (mockSDKInstance) {
      mockSDKInstance.connect.mockResolvedValue(undefined)
      mockSDKInstance.deployments.create.mockResolvedValue('deployment-456')
      mockSDKInstance.sdl = {
        validate: vi.fn().mockReturnValue({ valid: true, errors: [] })
      }
    }
  })

  it('should deploy from SDL file successfully', async () => {
    const options = { config: '.akash/config.json' }

    const result = await deployCommand('./test.yaml', options)

    expect(fs.readFile).toHaveBeenCalledWith('./test.yaml', 'utf-8')
    expect(mockSDKInstance.connect).toHaveBeenCalled()
    expect(mockSDKInstance.sdl.validate).toHaveBeenCalled()
    expect(mockSDKInstance.deployments.create).toHaveBeenCalled()
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
    mockSDKInstance.sdl.validate.mockReturnValue({
      valid: false,
      errors: ['Invalid service configuration', 'Missing required field']
    })

    const options = { config: '.akash/config.json' }

    await expect(deployCommand('./invalid.yaml', options)).rejects.toThrow(
      'Invalid SDL: Invalid service configuration, Missing required field'
    )

    expect(mockSDKInstance.deployments.create).not.toHaveBeenCalled()
  })

  it('should handle deployment creation errors', async () => {
    mockSDKInstance.deployments.create.mockRejectedValue(new Error('Insufficient funds'))

    const options = { config: '.akash/config.json' }

    await expect(deployCommand('./test.yaml', options)).rejects.toThrow('Insufficient funds')
  })

  it('should handle connection errors', async () => {
    mockSDKInstance.connect.mockRejectedValue(new Error('Network unreachable'))

    const options = { config: '.akash/config.json' }

    await expect(deployCommand('./test.yaml', options)).rejects.toThrow('Network unreachable')
    expect(mockSDKInstance.sdl.validate).not.toHaveBeenCalled()
    expect(mockSDKInstance.deployments.create).not.toHaveBeenCalled()
  })

  it('should handle missing SDL validation method gracefully', async () => {
    mockSDKInstance.sdl = undefined

    const options = { config: '.akash/config.json' }
    mockSDKInstance.deployments.create.mockResolvedValue('deployment-789')

    const result = await deployCommand('./test.yaml', options)

    expect(result).toBe('deployment-789')
    expect(mockSDKInstance.deployments.create).toHaveBeenCalled()
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

    const options = { config: '.akash/config.json' }

    await deployCommand('./test.yaml', options)

    expect(mockSDKInstance.sdl.validate).toHaveBeenCalledWith(mockSDLContent)
  })
})
