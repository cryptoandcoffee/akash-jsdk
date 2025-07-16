import chalk from 'chalk'
import ora from 'ora'
import { AkashSDK } from '@cryptoandcoffee/akash-jsdk-core'
import { loadConfig, getOwnerFromConfig } from '../utils/config-action'

export async function statusCommand(deploymentId?: string, options?: any) {
  const spinner = ora('Connecting to Akash Network...').start()

  try {
    const config = await loadConfig(options?.config)
    const sdk = new AkashSDK(config)
    
    await sdk.connect()
    spinner.succeed('Connected to Akash Network')

    if (deploymentId) {
      // Validate deployment ID format
      if (!deploymentId.includes('/')) {
        throw new Error('Invalid deployment ID format. Expected: owner/dseq')
      }

      const [owner, ...dseqParts] = deploymentId.split('/')
      const dseq = dseqParts.join('/')
      spinner.start('Fetching deployment details...')
      
      try {
        const deployment = await sdk.deployments.get({ owner, dseq })
        spinner.stop()
        
        if (!deployment) {
          throw new Error(`Deployment ${deploymentId} not found`)
        }
        
        console.log(chalk.blue('\n📋 Deployment Details'))
        console.log(chalk.gray('─'.repeat(40)))
        console.log(`Owner: ${owner}`)
        console.log(`DSEQ: ${dseq}`)
        console.log(`State: ${deployment.state}`)
        console.log(`Version: ${deployment.version || 'N/A'}`)
        console.log(`Created: ${new Date(deployment.createdAt).toLocaleString()}`)
        
        // Get leases
        const leases = await sdk.leases.list({ owner, dseq })
        if (leases.length > 0) {
          console.log(chalk.blue('\n🔗 Leases'))
          console.log(chalk.gray('─'.repeat(40)))
          leases.forEach(lease => {
            console.log(`Provider: ${lease.leaseId.provider}`)
            console.log(`State: ${lease.state}`)
            console.log(`Price: ${lease.price.amount}${lease.price.denom}`)
          })
        }
      } catch (error) {
        if ((error as any).message?.includes('not found')) {
          throw new Error(`Deployment ${deploymentId} not found`)
        }
        throw error
      }
    } else {
      // List all deployments
      spinner.start('Fetching deployments...')
      const owner = await getOwnerFromConfig(options?.config)
      const deployments = await sdk.deployments.list(owner)
      spinner.stop()
      
      if (deployments.length === 0) {
        console.log(chalk.yellow('\n⚠️  No deployments found'))
        return
      }
      
      console.log(chalk.blue(`\n📋 Deployments (${deployments.length})`))
      console.log(chalk.gray('─'.repeat(40)))
      
      deployments.forEach(deployment => {
        const id = `${deployment.id.owner}/${deployment.id.dseq}`
        console.log(`\n${chalk.bold(id)}`)
        console.log(`  State: ${deployment.state}`)
        console.log(`  Created: ${new Date(deployment.createdAt).toLocaleString()}`)
      })
    }
  } catch (error) {
    spinner.fail('Failed to fetch status')
    throw error
  }
}