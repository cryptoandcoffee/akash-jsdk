#!/usr/bin/env node

// This script is designed to execute the CLI and trigger the main module execution
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Execute the CLI directly to trigger main module execution
const cliPath = join(__dirname, 'src', 'cli.ts')

console.log('Executing CLI directly to trigger main module...')

const child = spawn('node', ['--loader', 'tsx', cliPath, '--help'], {
  stdio: 'inherit',
  cwd: process.cwd()
})

child.on('close', (code) => {
  console.log(`CLI executed with exit code: ${code}`)
  process.exit(0)
})

child.on('error', (error) => {
  console.error('Error executing CLI:', error)
  process.exit(1)
})