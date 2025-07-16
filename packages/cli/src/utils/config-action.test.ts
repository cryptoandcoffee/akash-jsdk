import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadConfig, validateConfig, saveConfig, getOwnerFromConfig } from './config-action'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

// Mock dependencies
vi.mock('fs/promises')
vi.mock('path')
vi.mock('os')

describe('config-action utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock path and os functions
    vi.mocked(os.homedir).mockReturnValue('/home/user')
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'))
    vi.mocked(path.dirname).mockImplementation((p) => p.split('/').slice(0, -1).join('/'))
  })

  describe('loadConfig', () => {
    it('should load config from default path', async () => {
      const mockConfig = {
        wallet: { mnemonic: 'test mnemonic phrase' },
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      const expectedAkashConfig = {
        rpcEndpoint: 'https://rpc.akashnet.io:443',
        chainId: 'akashnet-2',
        apiEndpoint: 'https://api.akashnet.io:443',
        gasPrice: '0.025uakt',
        gasAdjustment: 1.5,
        prefix: 'akash'
      }
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig))
      
      const config = await loadConfig()
      
      expect(fs.readFile).toHaveBeenCalledWith('/home/user/.akash/config.json', 'utf-8')
      expect(config).toEqual(expectedAkashConfig)
    })

    it('should load config from custom path', async () => {
      const mockConfig = {
        wallet: { mnemonic: 'custom mnemonic' },
        network: { rpcEndpoint: 'https://custom-rpc.com:443', chainId: 'testnet' }
      }
      
      const expectedAkashConfig = {
        rpcEndpoint: 'https://custom-rpc.com:443',
        chainId: 'testnet',
        apiEndpoint: 'https://custom-api.com:443',
        gasPrice: '0.025uakt',
        gasAdjustment: 1.5,
        prefix: 'akash'
      }
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig))
      
      const config = await loadConfig('./custom-config.json')
      
      expect(fs.readFile).toHaveBeenCalledWith('./custom-config.json', 'utf-8')
      expect(config).toEqual(expectedAkashConfig)
    })

    it('should handle file not found error', async () => {
      const error = new Error('File not found')
      ;(error as any).code = 'ENOENT'
      vi.mocked(fs.readFile).mockRejectedValue(error)
      
      await expect(loadConfig()).rejects.toThrow(
        "Config file not found at /home/user/.akash/config.json. Run 'akash-cli init' first."
      )
    })

    it('should handle JSON parse errors', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('invalid json content')
      
      await expect(loadConfig()).rejects.toThrow()
    })

    it('should handle other file read errors', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Permission denied'))
      
      await expect(loadConfig()).rejects.toThrow('Permission denied')
    })

    it('should validate config after loading', async () => {
      const invalidConfig = {
        wallet: {}, // Missing mnemonic
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443' } // Missing chainId
      }
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(invalidConfig))
      
      await expect(loadConfig()).rejects.toThrow('Invalid config: missing wallet mnemonic')
    })
  })

  describe('validateConfig', () => {
    it('should validate valid config', () => {
      const validConfig = {
        wallet: { mnemonic: 'test mnemonic phrase' },
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      expect(() => validateConfig(validConfig)).not.toThrow()
    })

    it('should throw error for missing wallet mnemonic', () => {
      const invalidConfig = {
        wallet: {},
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      expect(() => validateConfig(invalidConfig)).toThrow('Invalid config: missing wallet mnemonic')
    })

    it('should throw error for missing wallet object', () => {
      const invalidConfig = {
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      expect(() => validateConfig(invalidConfig)).toThrow('Invalid config: missing wallet mnemonic')
    })

    it('should throw error for missing RPC endpoint', () => {
      const invalidConfig = {
        wallet: { mnemonic: 'test mnemonic phrase' },
        network: { chainId: 'akashnet-2' }
      }
      
      expect(() => validateConfig(invalidConfig)).toThrow('Invalid config: missing RPC endpoint')
    })

    it('should throw error for missing network object', () => {
      const invalidConfig = {
        wallet: { mnemonic: 'test mnemonic phrase' }
      }
      
      expect(() => validateConfig(invalidConfig)).toThrow('Invalid config: missing RPC endpoint')
    })

    it('should throw error for missing chain ID', () => {
      const invalidConfig = {
        wallet: { mnemonic: 'test mnemonic phrase' },
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443' }
      }
      
      expect(() => validateConfig(invalidConfig)).toThrow('Invalid config: missing chain ID')
    })

    it('should throw error for empty mnemonic', () => {
      const invalidConfig = {
        wallet: { mnemonic: '' },
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      expect(() => validateConfig(invalidConfig)).toThrow('Invalid config: missing wallet mnemonic')
    })

    it('should throw error for empty RPC endpoint', () => {
      const invalidConfig = {
        wallet: { mnemonic: 'test mnemonic phrase' },
        network: { rpcEndpoint: '', chainId: 'akashnet-2' }
      }
      
      expect(() => validateConfig(invalidConfig)).toThrow('Invalid config: missing RPC endpoint')
    })

    it('should throw error for empty chain ID', () => {
      const invalidConfig = {
        wallet: { mnemonic: 'test mnemonic phrase' },
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: '' }
      }
      
      expect(() => validateConfig(invalidConfig)).toThrow('Invalid config: missing chain ID')
    })
  })

  describe('saveConfig', () => {
    it('should save config to default path', async () => {
      const config = {
        wallet: { mnemonic: 'test mnemonic phrase' },
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)
      
      await saveConfig(config)
      
      expect(fs.mkdir).toHaveBeenCalledWith('/home/user/.akash', { recursive: true })
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/home/user/.akash/config.json',
        JSON.stringify(config, null, 2)
      )
    })

    it('should save config to custom path', async () => {
      const config = {
        wallet: { mnemonic: 'custom mnemonic' },
        network: { rpcEndpoint: 'https://custom-rpc.com:443', chainId: 'testnet' }
      }
      
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)
      
      await saveConfig(config, './custom-config.json')
      
      expect(fs.mkdir).toHaveBeenCalledWith('.', { recursive: true })
      expect(fs.writeFile).toHaveBeenCalledWith(
        './custom-config.json',
        JSON.stringify(config, null, 2)
      )
    })

    it('should handle directory creation errors', async () => {
      const config = {
        wallet: { mnemonic: 'test mnemonic phrase' },
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      vi.mocked(fs.mkdir).mockRejectedValue(new Error('Permission denied'))
      
      await expect(saveConfig(config)).rejects.toThrow('Permission denied')
    })

    it('should handle file write errors', async () => {
      const config = {
        wallet: { mnemonic: 'test mnemonic phrase' },
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Disk full'))
      
      await expect(saveConfig(config)).rejects.toThrow('Disk full')
    })

    it('should create directory recursively', async () => {
      const config = {
        wallet: { mnemonic: 'test mnemonic phrase' },
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)
      
      await saveConfig(config, '/deep/nested/path/config.json')
      
      expect(fs.mkdir).toHaveBeenCalledWith('/deep/nested/path', { recursive: true })
    })

    it('should format JSON with proper indentation', async () => {
      const config = {
        wallet: { mnemonic: 'test mnemonic phrase' },
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)
      
      await saveConfig(config)
      
      const expectedJson = JSON.stringify(config, null, 2)
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/home/user/.akash/config.json',
        expectedJson
      )
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete config lifecycle', async () => {
      const originalConfig = {
        wallet: { mnemonic: 'original mnemonic' },
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      const expectedAkashConfig = {
        rpcEndpoint: 'https://rpc.akashnet.io:443',
        chainId: 'akashnet-2',
        apiEndpoint: 'https://api.akashnet.io:443',
        gasPrice: '0.025uakt',
        gasAdjustment: 1.5,
        prefix: 'akash'
      }
      
      // Save config
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)
      await saveConfig(originalConfig)
      
      // Load config
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(originalConfig))
      const loadedConfig = await loadConfig()
      
      expect(loadedConfig).toEqual(expectedAkashConfig)
    })

    it('should handle config with additional properties', async () => {
      const configWithExtra = {
        wallet: { mnemonic: 'test mnemonic phrase' },
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' },
        extra: { customProperty: 'value' }
      }
      
      const expectedAkashConfig = {
        rpcEndpoint: 'https://rpc.akashnet.io:443',
        chainId: 'akashnet-2',
        apiEndpoint: 'https://api.akashnet.io:443',
        gasPrice: '0.025uakt',
        gasAdjustment: 1.5,
        prefix: 'akash'
      }
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(configWithExtra))
      
      const config = await loadConfig()
      expect(config).toEqual(expectedAkashConfig)
      expect(() => validateConfig(configWithExtra)).not.toThrow()
    })
  })

  describe('getOwnerFromConfig', () => {
    it('should get owner from config with default path', async () => {
      const mockConfig = {
        wallet: { mnemonic: 'test mnemonic phrase words example' },
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig))
      
      const owner = await getOwnerFromConfig()
      
      expect(fs.readFile).toHaveBeenCalledWith('/home/user/.akash/config.json', 'utf-8')
      expect(owner).toMatch(/^akash1[a-z0-9]{38}$/)
      // First 3 words: "test", "mnemonic", "phrase" -> "testmnemonicphrase" (18 chars) + padded to 38
      expect(owner).toBe('akash1testmnemonicphrase00000000000000000000')
    })

    it('should get owner from config with custom path', async () => {
      const mockConfig = {
        wallet: { mnemonic: 'custom different seed phrase' },
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig))
      
      const owner = await getOwnerFromConfig('./custom-config.json')
      
      expect(fs.readFile).toHaveBeenCalledWith('./custom-config.json', 'utf-8')
      expect(owner).toMatch(/^akash1[a-z0-9]{38}$/)
    })

    it('should return fallback owner on file read error', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))
      
      const owner = await getOwnerFromConfig()
      
      expect(owner).toBe('akash1test')
    })

    it('should return fallback owner on JSON parse error', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('invalid json')
      
      const owner = await getOwnerFromConfig()
      
      expect(owner).toBe('akash1test')
    })

    it('should handle config with missing wallet', async () => {
      const mockConfig = {
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig))
      
      const owner = await getOwnerFromConfig()
      
      expect(owner).toBe('akash1test')
    })

    it('should handle config with missing mnemonic', async () => {
      const mockConfig = {
        wallet: {},
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig))
      
      const owner = await getOwnerFromConfig()
      
      // This should cause an error accessing config.wallet.mnemonic and fall back to 'akash1test'
      expect(owner).toBe('akash1test')
    })

    it('should generate consistent owner from same mnemonic', async () => {
      const mockConfig = {
        wallet: { mnemonic: 'same test mnemonic phrase' },
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig))
      
      const owner1 = await getOwnerFromConfig()
      const owner2 = await getOwnerFromConfig()
      
      expect(owner1).toBe(owner2)
      // First 3 words: "same", "test", "mnemonic" -> "sametestmnemonic" (15 chars) + padded to 38
      expect(owner1).toBe('akash1sametestmnemonic0000000000000000000000')
    })

    it('should handle short mnemonic phrases', async () => {
      const mockConfig = {
        wallet: { mnemonic: 'a b' },
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig))
      
      const owner = await getOwnerFromConfig()
      
      expect(owner).toMatch(/^akash1[a-z0-9]{38}$/)
      expect(owner).toBe('akash1ab000000000000000000000000000000000000')
    })

    it('should handle mnemonic with special characters', async () => {
      const mockConfig = {
        wallet: { mnemonic: 'test-phrase with_special ch@rs!' },
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig))
      
      const owner = await getOwnerFromConfig()
      
      expect(owner).toMatch(/^akash1[a-z0-9]{38}$/)
      // First 3 words: "test-phrase", "with_special", "ch@rs!" -> "test0phrasewith0specialch0rs0" + padding
      expect(owner).toBe('akash1test0phrasewith0specialch0rs0000000000')
    })

    it('should handle empty mnemonic', async () => {
      const mockConfig = {
        wallet: { mnemonic: '' },
        network: { rpcEndpoint: 'https://rpc.akashnet.io:443', chainId: 'akashnet-2' }
      }
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig))
      
      const owner = await getOwnerFromConfig()
      
      // Empty mnemonic splits to [''], joins to '', padded to 38 zeros
      expect(owner).toBe('akash100000000000000000000000000000000000000')
    })
  })
})