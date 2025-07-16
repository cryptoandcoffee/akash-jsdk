import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { AkashConfig } from '@cryptoandcoffee/akash-jsdk-core'

export interface Config {
  wallet: {
    mnemonic: string
  }
  network: {
    rpcEndpoint: string
    chainId: string
  }
}

export async function loadConfig(configPath?: string): Promise<AkashConfig> {
  const filePath = configPath || path.join(os.homedir(), '.akash', 'config.json')
  
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const config = JSON.parse(content)
    
    validateConfig(config)
    
    // Convert to AkashConfig format
    return {
      rpcEndpoint: config.network.rpcEndpoint,
      chainId: config.network.chainId,
      apiEndpoint: config.network.apiEndpoint || `${config.network.rpcEndpoint.replace('rpc', 'api')}`,
      gasPrice: config.network.gasPrice || '0.025uakt',
      gasAdjustment: config.network.gasAdjustment || 1.5,
      prefix: config.network.prefix || 'akash'
    }
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      throw new Error(`Config file not found at ${filePath}. Run 'akash-cli init' first.`)
    }
    throw error
  }
}

export function validateConfig(config: any): void {
  if (!config.wallet?.mnemonic) {
    throw new Error('Invalid config: missing wallet mnemonic')
  }
  
  if (!config.network?.rpcEndpoint) {
    throw new Error('Invalid config: missing RPC endpoint')
  }
  
  if (!config.network?.chainId) {
    throw new Error('Invalid config: missing chain ID')
  }
}

export async function saveConfig(config: Config, configPath?: string): Promise<void> {
  const filePath = configPath || path.join(os.homedir(), '.akash', 'config.json')
  
  // Ensure directory exists
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  
  await fs.writeFile(filePath, JSON.stringify(config, null, 2))
}

export async function getOwnerFromConfig(configPath?: string): Promise<string> {
  const filePath = configPath || path.join(os.homedir(), '.akash', 'config.json')
  
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const config = JSON.parse(content)
    
    // For now, return a placeholder address derived from the mnemonic
    // In a real implementation, this would derive the address from the mnemonic
    const mnemonicHash = config.wallet.mnemonic.split(' ').slice(0, 3).join('')
    return `akash1${mnemonicHash.slice(0, 38).toLowerCase().replace(/[^a-z0-9]/g, '0').padEnd(38, '0')}`
  } catch (error) {
    // Default fallback address for testing
    return 'akash1test'
  }
}