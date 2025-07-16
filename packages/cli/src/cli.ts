#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { initCommand } from './commands/init'
import { deployCommand } from './commands/deploy'
import { statusCommand } from './commands/status'
import { closeCommand } from './commands/close'

export function createCLI() {
  const program = new Command()

  program
    .name('akash-jsdk')
    .description('CLI for Akash Network JavaScript SDK')
    .version('1.0.0')

  program
    .addCommand(initCommand)
    .addCommand(deployCommand)
    .addCommand(statusCommand)
    .addCommand(closeCommand)

  program.configureHelp({
    helpWidth: 120,
    sortSubcommands: true
  })

  program.on('command:*', () => {
    console.error(chalk.red(`Invalid command: ${program.args.join(' ')}`))
    console.log(chalk.yellow('See --help for available commands'))
    process.exit(1)
  })

  return program
}

// Main execution function - exported for testing
export async function runMainExecution() {
  const program = createCLI()
  return program.parseAsync(process.argv).catch((error) => {
    console.error(chalk.red('CLI Error:'), error.message)
    process.exit(1)
  })
}

// Run CLI if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runMainExecution()
}