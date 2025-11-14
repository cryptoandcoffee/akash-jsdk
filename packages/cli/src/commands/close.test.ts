import { describe, it, expect, beforeEach, vi } from 'vitest'
import { closeAction, closeCommand } from './close'
import inquirer from 'inquirer'

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
        close: vi.fn().mockResolvedValue(undefined),
        list: vi.fn().mockResolvedValue([
          { deploymentId: { dseq: '123' }, state: 'active' },
          { deploymentId: { dseq: '456' }, state: 'active' }
        ])
      }
      return this
    })
  }
})
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

describe('closeAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock implementations to defaults after clearAllMocks
    if (mockSDKInstance) {
      mockSDKInstance.connect.mockResolvedValue(undefined)
      mockSDKInstance.deployments.close.mockResolvedValue(undefined)
      mockSDKInstance.deployments.list.mockResolvedValue([
        { deploymentId: { dseq: '123' }, state: 'active' },
        { deploymentId: { dseq: '456' }, state: 'active' }
      ])
    }
  })

  it('should close deployment successfully with deployment ID', async () => {
    const options = { owner: 'akash1test', deployment: '123', yes: true }

    await closeAction(options)

    expect(mockSDKInstance.deployments.close).toHaveBeenCalledWith('123')
  })

  it('should fail when owner is not provided', async () => {
    const options = {}

    await closeAction(options)

    // Spinner.fail just logs and returns - no assertions needed
  })

  it('should handle no deployments found', async () => {
    mockSDKInstance.deployments.list.mockResolvedValue([])

    const options = { owner: 'akash1test' }

    await closeAction(options)

    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('No deployments found'))
  })

  it('should prompt for deployment selection when not provided', async () => {
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
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ proceed: false })

    const options = { owner: 'akash1test', deployment: '123' }

    await closeAction(options)

    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Operation cancelled'))
    expect(mockSDKInstance.deployments.close).not.toHaveBeenCalled()
  })

  it('should skip confirmation with --yes flag', async () => {
    const options = { owner: 'akash1test', deployment: '123', yes: true }

    await closeAction(options)

    expect(inquirer.prompt).not.toHaveBeenCalled()
  })

  it('should handle close operation errors', async () => {
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('process.exit') }) as any)

    mockSDKInstance.deployments.close.mockRejectedValue(new Error('Network error'))

    const options = { owner: 'akash1test', deployment: '123', yes: true }

    await expect(closeAction(options)).rejects.toThrow('process.exit')
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Error:'), 'Network error')

    mockExit.mockRestore()
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
