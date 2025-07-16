import chalk from 'chalk'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

export async function initCommand(options: any) {
  console.log(chalk.blue('🚀 Initializing Akash CLI...\n'))

  try {
    // Check if config already exists
    const configPath = path.join(os.homedir(), '.akash', 'config.json')
    try {
      await fs.access(configPath)
      console.log(chalk.yellow('⚠️  Config file already exists at ~/.akash/config.json'))
      
      if (!options.force) {
        return
      }
      console.log(chalk.blue('Overwriting existing config...'))
    } catch {
      // Config doesn't exist, continue
    }

    // Create config directory
    const configDir = path.dirname(configPath)
    await fs.mkdir(configDir, { recursive: true })

    // Default config
    const config = {
      wallet: {
        mnemonic: options.mnemonic || 'your mnemonic phrase here'
      },
      network: {
        rpcEndpoint: options.network === 'testnet' 
          ? 'https://rpc-testnet.akashnet.io:443'
          : 'https://rpc.akashnet.io:443',
        chainId: options.network === 'testnet' ? 'testnet-02' : 'akashnet-2'
      }
    }

    // Write config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2))
    console.log(chalk.green('✅ Config file created at ~/.akash/config.json'))

    // Create example SDL if requested
    if (options.example) {
      const exampleSDL = `version: "2.0"

services:
  web:
    image: nginx:latest
    expose:
      - port: 80
        as: 80
        to:
          - global: true

profiles:
  compute:
    web:
      resources:
        cpu:
          units: 0.1
        memory:
          size: 512Mi
        storage:
          size: 1Gi

deployment:
  web:
    westcoast:
      profile: compute
      count: 1`

      await fs.writeFile('example.yaml', exampleSDL)
      console.log(chalk.green('✅ Example SDL file created: example.yaml'))
    }

    console.log(chalk.blue('\n🎉 Initialization complete!'))
    console.log(chalk.gray('\nNext steps:'))
    console.log(chalk.gray('1. Edit ~/.akash/config.json with your wallet mnemonic'))
    console.log(chalk.gray('2. Run "akash-cli deploy example.yaml" to deploy'))
  } catch (error) {
    console.error(chalk.red('Failed to initialize:'), (error as Error).message)
    throw error
  }
}