import { describe, it, expect, beforeEach, vi } from 'vitest'
import { initCommand } from './init-action'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

// Mock dependencies
vi.mock('fs/promises')
vi.mock('path')
vi.mock('os')

// Mock console
const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockError = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('initCommand (init-action)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock path and os functions
    vi.mocked(os.homedir).mockReturnValue('/home/user')
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'))
    vi.mocked(path.dirname).mockImplementation((p) => p.split('/').slice(0, -1).join('/'))
  })

  it('should initialize CLI with default config', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    
    const options = {}
    
    await initCommand(options)
    
    expect(fs.mkdir).toHaveBeenCalledWith('/home/user/.akash', { recursive: true })
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/home/user/.akash/config.json',
      expect.stringContaining('"mnemonic": "your mnemonic phrase here"')
    )
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('✅ Config file created'))
  })

  it('should handle existing config file without force flag', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined)
    
    const options = {}
    
    await initCommand(options)
    
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('⚠️  Config file already exists'))
    expect(fs.writeFile).not.toHaveBeenCalled()
  })

  it('should overwrite existing config with force flag', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined)
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    
    const options = { force: true }
    
    await initCommand(options)
    
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('⚠️  Config file already exists'))
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Overwriting existing config'))
    expect(fs.writeFile).toHaveBeenCalled()
  })

  it('should use custom mnemonic when provided', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    
    const options = { mnemonic: 'custom test mnemonic phrase' }
    
    await initCommand(options)
    
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/home/user/.akash/config.json',
      expect.stringContaining('"mnemonic": "custom test mnemonic phrase"')
    )
  })

  it('should use testnet configuration when specified', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    
    const options = { network: 'testnet' }
    
    await initCommand(options)
    
    const writeCall = vi.mocked(fs.writeFile).mock.calls[0]
    const configContent = writeCall[1] as string
    const config = JSON.parse(configContent)
    
    expect(config.network.rpcEndpoint).toBe('https://rpc-testnet.akashnet.io:443')
    expect(config.network.chainId).toBe('testnet-02')
  })

  it('should use mainnet configuration by default', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    
    const options = {}
    
    await initCommand(options)
    
    const writeCall = vi.mocked(fs.writeFile).mock.calls[0]
    const configContent = writeCall[1] as string
    const config = JSON.parse(configContent)
    
    expect(config.network.rpcEndpoint).toBe('https://rpc.akashnet.io:443')
    expect(config.network.chainId).toBe('akashnet-2')
  })

  it('should create example SDL file when requested', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    
    const options = { example: true }
    
    await initCommand(options)
    
    expect(fs.writeFile).toHaveBeenCalledWith(
      'example.yaml',
      expect.stringContaining('version: "2.0"')
    )
    expect(fs.writeFile).toHaveBeenCalledWith(
      'example.yaml',
      expect.stringContaining('services:')
    )
    expect(fs.writeFile).toHaveBeenCalledWith(
      'example.yaml',
      expect.stringContaining('nginx:latest')
    )
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('✅ Example SDL file created'))
  })

  it('should not create example SDL file by default', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    
    const options = {}
    
    await initCommand(options)
    
    expect(fs.writeFile).toHaveBeenCalledTimes(1) // Only config file
    expect(fs.writeFile).not.toHaveBeenCalledWith('example.yaml', expect.anything())
  })

  it('should handle directory creation errors', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
    vi.mocked(fs.mkdir).mockRejectedValue(new Error('Permission denied'))
    
    const options = {}
    
    await expect(initCommand(options)).rejects.toThrow('Permission denied')
    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to initialize:'),
      'Permission denied'
    )
  })

  it('should handle config file write errors', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockRejectedValue(new Error('Disk full'))
    
    const options = {}
    
    await expect(initCommand(options)).rejects.toThrow('Disk full')
    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to initialize:'),
      'Disk full'
    )
  })

  it('should handle example SDL file write errors', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile)
      .mockResolvedValueOnce(undefined) // Config file succeeds
      .mockRejectedValueOnce(new Error('Cannot write example file')) // Example file fails
    
    const options = { example: true }
    
    await expect(initCommand(options)).rejects.toThrow('Cannot write example file')
  })

  it('should create config directory recursively', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    
    const options = {}
    
    await initCommand(options)
    
    expect(fs.mkdir).toHaveBeenCalledWith('/home/user/.akash', { recursive: true })
  })

  it('should display completion message and next steps', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    
    const options = {}
    
    await initCommand(options)
    
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('🎉 Initialization complete!'))
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Next steps:'))
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Edit ~/.akash/config.json'))
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('akash-cli deploy'))
  })

  it('should handle different home directory paths', async () => {
    vi.mocked(os.homedir).mockReturnValue('/Users/testuser')
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    
    const options = {}
    
    await initCommand(options)
    
    expect(fs.mkdir).toHaveBeenCalledWith('/Users/testuser/.akash', { recursive: true })
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/Users/testuser/.akash/config.json',
      expect.any(String)
    )
  })

  it('should generate valid JSON config', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    
    const options = { mnemonic: 'test mnemonic', network: 'testnet' }
    
    await initCommand(options)
    
    const writeCall = vi.mocked(fs.writeFile).mock.calls[0]
    const configContent = writeCall[1] as string
    
    // Should be valid JSON
    expect(() => JSON.parse(configContent)).not.toThrow()
    
    const config = JSON.parse(configContent)
    expect(config).toHaveProperty('wallet')
    expect(config).toHaveProperty('network')
    expect(config.wallet).toHaveProperty('mnemonic')
    expect(config.network).toHaveProperty('rpcEndpoint')
    expect(config.network).toHaveProperty('chainId')
  })

  it('should generate valid YAML SDL example', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    
    const options = { example: true }
    
    await initCommand(options)
    
    const sdlWriteCall = vi.mocked(fs.writeFile).mock.calls.find(call => 
      call[0] === 'example.yaml'
    )
    
    expect(sdlWriteCall).toBeDefined()
    const sdlContent = sdlWriteCall![1] as string
    
    // Should contain valid SDL structure
    expect(sdlContent).toContain('version: "2.0"')
    expect(sdlContent).toContain('services:')
    expect(sdlContent).toContain('profiles:')
    expect(sdlContent).toContain('deployment:')
    expect(sdlContent).toContain('nginx:latest')
    expect(sdlContent).toContain('cpu:')
    expect(sdlContent).toContain('memory:')
    expect(sdlContent).toContain('storage:')
  })
})