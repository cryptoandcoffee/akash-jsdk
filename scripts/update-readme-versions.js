#!/usr/bin/env node

/**
 * Script to automatically update README.md with current package versions
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

// Read package.json files to get current versions
const packages = [
  { name: '@cryptoandcoffee/akash-jsdk-core', path: 'packages/core/package.json' },
  { name: '@cryptoandcoffee/akash-jsdk-react', path: 'packages/react/package.json' },
  { name: '@cryptoandcoffee/akash-jsdk-cli', path: 'packages/cli/package.json' },
  { name: '@cryptoandcoffee/akash-jsdk-protobuf', path: 'packages/protobuf/package.json' }
]

console.log('📝 Updating README.md with current package versions...')

// Get current versions
const versions = {}
for (const pkg of packages) {
  try {
    const packageJson = JSON.parse(readFileSync(join(rootDir, pkg.path), 'utf8'))
    versions[pkg.name] = packageJson.version
    console.log(`   ${pkg.name}: ${packageJson.version}`)
  } catch (error) {
    console.error(`❌ Failed to read ${pkg.path}:`, error.message)
    process.exit(1)
  }
}

// Read README.md
let readmeContent
try {
  readmeContent = readFileSync(join(rootDir, 'README.md'), 'utf8')
} catch (error) {
  console.error('❌ Failed to read README.md:', error.message)
  process.exit(1)
}

// Update version table
let updatedContent = readmeContent

// Update each package version in the table
for (const pkg of packages) {
  const version = versions[pkg.name]
  
  // Pattern to match the table row for this package
  const pattern = new RegExp(
    `(\\| \`${pkg.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\` \\|[^|]+\\|) [^|]+ (\\|)`,
    'g'
  )
  
  updatedContent = updatedContent.replace(pattern, `$1 ${version} $2`)
}

// Write updated README.md
try {
  writeFileSync(join(rootDir, 'README.md'), updatedContent)
  console.log('✅ README.md updated successfully!')
} catch (error) {
  console.error('❌ Failed to write README.md:', error.message)
  process.exit(1)
}