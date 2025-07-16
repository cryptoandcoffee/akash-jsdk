import { existsSync } from 'fs'
import { join } from 'path'
import { AkashConfig } from '@cryptoandcoffee/akash-jsdk-core'

export async function loadConfig(): Promise<AkashConfig> {
  const configPath = join(process.cwd(), 'akash.config.js')
  
  if (!existsSync(configPath)) {
    throw new Error('akash.config.js not found. Run "akash-cli init" first.')
  }

  try {
    // Dynamic import for ES modules
    const configModule = await import(`file://${configPath}`)
    return configModule.akashConfig
  } catch (error) {
    throw new Error(`Failed to load config: ${(error as Error).message}`)
  }
}

export function getDefaultConfig(): AkashConfig {
  return {
    rpcEndpoint: 'https://rpc.akashedge.com:443',
    apiEndpoint: 'https://api.akashedge.com:443',
    chainId: 'akashnet-2',
    gasPrice: '0.025uakt',
    gasAdjustment: 1.5,
    prefix: 'akash'
  }
}