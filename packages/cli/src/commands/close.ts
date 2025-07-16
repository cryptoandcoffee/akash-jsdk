import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import { AkashSDK } from '@cryptoandcoffee/akash-jsdk-core'
import { loadConfig } from '../utils/config'

export async function closeAction(options: any) {
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

      let deploymentId = options.deployment

      if (!deploymentId) {
        spinner.start('Fetching deployments...')
        const deployments = await sdk.deployments.list(options.owner)
        spinner.stop()

        if (deployments.length === 0) {
          console.log(chalk.yellow('No deployments found'))
          return
        }

        const choices = deployments.map(d => ({
          name: `${d.id.dseq} (${d.state})`,
          value: d.id.dseq
        }))

        const answer = await inquirer.prompt([{
          type: 'list',
          name: 'deploymentId',
          message: 'Select deployment to close:',
          choices
        }])

        deploymentId = answer.deploymentId
      }

      if (!options.yes) {
        const confirm = await inquirer.prompt([{
          type: 'confirm',
          name: 'proceed',
          message: `Are you sure you want to close deployment ${deploymentId}?`,
          default: false
        }])

        if (!confirm.proceed) {
          console.log(chalk.yellow('Operation cancelled'))
          return
        }
      }

      spinner.start(`Closing deployment ${deploymentId}...`)
      
      await sdk.deployments.close(deploymentId)
      
      spinner.succeed(`Deployment ${deploymentId} closed successfully`)
      
      console.log(chalk.green('\n✅ Deployment closed!'))

    } catch (error) {
      spinner.fail('Failed to close deployment')
      console.error(chalk.red('Error:'), (error as Error).message)
      process.exit(1)
    }
}

export const closeCommand = new Command('close')
  .description('Close deployment')
  .option('-d, --deployment <id>', 'Deployment ID to close')
  .option('-o, --owner <owner>', 'Owner address')
  .option('-y, --yes', 'Skip confirmation')
  .action(closeAction)