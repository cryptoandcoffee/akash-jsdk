import chalk from 'chalk'
import ora from 'ora'
import { AkashSDK } from '@cryptoandcoffee/akash-jsdk-core'
import { loadConfig } from '../utils/config-action'

export async function closeCommand(deploymentId: string, options: any) {
  // Validate deployment ID format
  if (!deploymentId.includes('/')) {
    throw new Error('Invalid deployment ID format. Expected: owner/dseq')
  }

  const spinner = ora('Connecting to Akash Network...').start()

  try {
    const config = await loadConfig(options.config)
    const sdk = new AkashSDK(config)
    
    await sdk.connect()
    spinner.succeed('Connected to Akash Network')

    const [owner, ...dseqParts] = deploymentId.split('/')
    const dseq = dseqParts.join('/')
    
    // Check if deployment exists
    spinner.start('Checking deployment...')
    let deployment
    try {
      deployment = await sdk.deployments.get({ owner, dseq })
      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`)
      }
    } catch (error) {
      if ((error as any).message?.includes('not found')) {
        throw new Error(`Deployment ${deploymentId} not found`)
      }
      throw error
    }
    
    // Check if already closed
    // DeploymentState is an enum: INVALID = 0, ACTIVE = 1, CLOSED = 2
    if (deployment.state === 2) {
      spinner.warn('Deployment is already closed')
      return
    }
    
    spinner.start('Closing deployment...')
    await sdk.deployments.close({ owner, dseq })
    
    spinner.succeed('Deployment closed successfully')
    console.log(chalk.green(`\n✅ Deployment ${deploymentId} has been closed`))
  } catch (error) {
    spinner.fail('Failed to close deployment')
    throw error
  }
}