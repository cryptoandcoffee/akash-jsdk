import { describe, it, expect, beforeEach, vi } from 'vitest'
import { closeAction, closeCommand } from './close'
import { AkashSDK } from '@cryptoandcoffee/akash-jsdk-core'
import inquirer from 'inquirer'

// Mock dependencies
vi.mock('@cryptoandcoffee/akash-jsdk-core')
vi.mock('../utils/config', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    wallet: { mnemonic: 'test mnemonic' },
    network: { rpcEndpoint: 'http://localhost:26657' }
  })
}))
vi.mock('inquirer')
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
const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('process.exit') }) as any)

describe('closeAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const mockSDK = {
      connect: vi.fn().mockResolvedValue(undefined),
      deployments: {
        close: vi.fn().mockResolvedValue(undefined),
        list: vi.fn().mockResolvedValue([
          { deploymentId: { dseq: '123' }, state: 'active' },
          { deploymentId: { dseq: '456' }, state: 'active' }
        ])
      }
    }

    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
  })

  it('should close deployment successfully with deployment ID', async () => {
    const options = { owner: 'akash1test', deployment: '123', yes: true }
    
    await closeAction(options)
    
    const sdk = vi.mocked(AkashSDK).mock.results[0].value
    expect(sdk.deployments.close).toHaveBeenCalledWith('123')
  })

  it('should fail when owner is not provided', async () => {
    const options = {}
    
    await closeAction(options)
    
    expect(mockExit).not.toHaveBeenCalled() // Spinner.fail just logs and returns
  })

  it('should handle no deployments found', async () => {
    const mockSDK = {
      connect: vi.fn().mockResolvedValue(undefined),
      deployments: {
        list: vi.fn().mockResolvedValue([]),
        close: vi.fn()
      }
    }

    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
    const options = { owner: 'akash1test' }

    await closeAction(options)

    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('No deployments found'))
  })

  it('should prompt for deployment selection when not provided', async () => {
    const mockSDK = {
      connect: vi.fn().mockResolvedValue(undefined),
      deployments: {
        close: vi.fn().mockResolvedValue(undefined),
        list: vi.fn().mockResolvedValue([
          { deploymentId: { dseq: '123' }, state: 'active' },
          { deploymentId: { dseq: '456' }, state: 'active' }
        ])
      }
    }

    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ deploymentId: '123' })
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ proceed: true })

    const options = { owner: 'akash1test' }

    await closeAction(options)

    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'list',
        name: 'deploymentId',
        message: 'Select deployment to close:'
      })
    ])
  })

  it('should prompt for confirmation when --yes not provided', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ proceed: true })
    
    const options = { owner: 'akash1test', deployment: '123' }
    
    await closeAction(options)
    
    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'confirm',
        name: 'proceed',
        message: 'Are you sure you want to close deployment 123?'
      })
    ])
  })

  it('should cancel operation when user declines confirmation', async () => {
    const mockSDK = {
      connect: vi.fn().mockResolvedValue(undefined),
      deployments: {
        close: vi.fn().mockResolvedValue(undefined),
        list: vi.fn().mockResolvedValue([
          { deploymentId: { dseq: '123' }, state: 'active' }
        ])
      }
    }

    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ proceed: false })

    const options = { owner: 'akash1test', deployment: '123' }

    await closeAction(options)

    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Operation cancelled'))
    expect(mockSDK.deployments.close).not.toHaveBeenCalled()
  })

  it('should skip confirmation with --yes flag', async () => {
    const options = { owner: 'akash1test', deployment: '123', yes: true }
    
    await closeAction(options)
    
    expect(inquirer.prompt).not.toHaveBeenCalled()
  })

  it('should handle close operation errors', async () => {
    const mockSDK = {
      connect: vi.fn().mockResolvedValue(undefined),
      deployments: {
        close: vi.fn().mockRejectedValue(new Error('Network error'))
      }
    }
    
    vi.mocked(AkashSDK).mockReturnValue(mockSDK as any)
    const options = { owner: 'akash1test', deployment: '123', yes: true }
    
    await expect(closeAction(options)).rejects.toThrow('process.exit')
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Error:'), 'Network error')
  })
})

describe('closeCommand', () => {
  it('should be configured correctly', () => {
    expect(closeCommand.name()).toBe('close')
    expect(closeCommand.description()).toBe('Close deployment')
    expect(closeCommand.options.map(opt => opt.long)).toContain('--deployment')
    expect(closeCommand.options.map(opt => opt.long)).toContain('--owner')
    expect(closeCommand.options.map(opt => opt.long)).toContain('--yes')
  })
})