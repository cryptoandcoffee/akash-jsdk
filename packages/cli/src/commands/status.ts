import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { AkashSDK } from '@cryptoandcoffee/akash-jsdk-core'
import { loadConfig } from '../utils/config'

export async function statusAction(options: any) {
    const spinner = ora('Connecting to Akash Network...').start()

    try {
      const config = await loadConfig()
      const sdk = new AkashSDK(config)
      
      await sdk.connect()
      spinner.succeed('Connected to Akash Network')

      if (!options.owner) {
        spinner.fail('Owner address is required')
        return
      }

      spinner.start('Fetching deployments...')
      
      const deployments = await sdk.deployments.list(options.owner)
      const leases = await sdk.leases.list(options.owner)
      
      spinner.stop()

      console.log(chalk.blue('\n📊 Deployment Status\n'))
      
      if (deployments.length === 0) {
        console.log(chalk.yellow('No deployments found'))
        return
      }

      deployments.forEach((deployment, index) => {
        console.log(chalk.green(`${index + 1}. Deployment ${deployment.id.dseq}`))
        console.log(chalk.white(`   Owner: ${deployment.id.owner}`))
        console.log(chalk.white(`   State: ${deployment.state}`))
        console.log(chalk.white(`   Created: ${new Date(deployment.createdAt).toISOString()}`))
        console.log()
      })

      if (leases.length > 0) {
        console.log(chalk.blue('💰 Active Leases\n'))
        leases.forEach((lease, index) => {
          console.log(chalk.green(`${index + 1}. Lease ${lease.id.dseq}-${lease.id.gseq}-${lease.id.oseq}`))
          console.log(chalk.white(`   Provider: ${lease.id.provider}`))
          console.log(chalk.white(`   State: ${lease.state}`))
          console.log(chalk.white(`   Price: ${lease.price.amount} ${lease.price.denom}`))
          console.log()
        })
      }

    } catch (error) {
      spinner.fail('Failed to fetch status')
      console.error(chalk.red('Error:'), (error as Error).message)
      process.exit(1)
    }
}

export const statusCommand = new Command('status')
  .description('Check deployment status')
  .option('-o, --owner <owner>', 'Owner address')
  .option('-d, --deployment <id>', 'Specific deployment ID')
  .action(statusAction)