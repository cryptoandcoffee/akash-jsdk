import { Command } from 'commander'
import inquirer from 'inquirer'
import chalk from 'chalk'
import { writeFileSync } from 'fs'
import { join } from 'path'

interface InitAnswers {
  projectName: string
  rpcEndpoint: string
  chainId: string
  framework: 'vanilla' | 'react' | 'next'
}

export async function initAction(options: any) {
    console.log(chalk.blue('🚀 Initializing Akash SDK project...\n'))

    const answers = await inquirer.prompt<InitAnswers>([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: options.name || 'my-akash-app',
        validate: (input) => input.length > 0
      },
      {
        type: 'list',
        name: 'framework',
        message: 'Choose framework:',
        choices: [
          { name: 'Vanilla JavaScript/TypeScript', value: 'vanilla' },
          { name: 'React', value: 'react' },
          { name: 'Next.js', value: 'next' }
        ],
        default: options.framework || 'vanilla'
      },
      {
        type: 'input',
        name: 'rpcEndpoint',
        message: 'Akash RPC endpoint:',
        default: 'https://rpc.akashedge.com:443'
      },
      {
        type: 'input',
        name: 'chainId',
        message: 'Chain ID:',
        default: 'akashnet-2'
      }
    ])

    generateProject(answers)
}

export const initCommand = new Command('init')
  .description('Initialize a new Akash SDK project')
  .option('-n, --name <name>', 'Project name')
  .option('-f, --framework <framework>', 'Framework (vanilla, react, next)')
  .action(initAction)

function generateProject(answers: InitAnswers) {
  const { projectName, framework, rpcEndpoint, chainId } = answers

  console.log(chalk.green(`✅ Creating ${framework} project: ${projectName}`))

  // Generate package.json
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: framework === 'next' ? 'next dev' : 'vite dev',
      build: framework === 'next' ? 'next build' : 'vite build',
      start: framework === 'next' ? 'next start' : 'vite preview'
    },
    dependencies: {
      '@cryptoandcoffee/akash-jsdk-core': '^1.0.0',
      ...(framework === 'react' && {
        '@cryptoandcoffee/akash-jsdk-react': '^1.0.0',
        'react': '^18.2.0',
        'react-dom': '^18.2.0'
      }),
      ...(framework === 'next' && {
        '@cryptoandcoffee/akash-jsdk-react': '^1.0.0',
        'next': '^14.0.0',
        'react': '^18.2.0',
        'react-dom': '^18.2.0'
      })
    },
    devDependencies: {
      'typescript': '^5.3.3',
      'vite': '^5.1.0',
      ...(framework !== 'vanilla' && {
        '@types/react': '^18.2.48',
        '@types/react-dom': '^18.2.18'
      })
    }
  }

  writeFileSync(
    join(process.cwd(), 'package.json'),
    JSON.stringify(packageJson, null, 2)
  )

  // Generate config file
  const configContent = `export const akashConfig = {
  rpcEndpoint: '${rpcEndpoint}',
  chainId: '${chainId}',
  gasPrice: '0.025uakt',
  gasAdjustment: 1.5
}`

  writeFileSync(join(process.cwd(), 'akash.config.js'), configContent)

  console.log(chalk.green('✅ Project initialized successfully!'))
  console.log(chalk.blue('\nNext steps:'))
  console.log(chalk.white('  1. npm install'))
  console.log(chalk.white('  2. npm run dev'))
}