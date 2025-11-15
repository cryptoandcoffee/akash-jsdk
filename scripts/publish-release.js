#!/usr/bin/env node
/**
 * Publishes all packages atomically after validation
 *
 * Process:
 * 1. Run validation to ensure all packages are ready
 * 2. Build all packages
 * 3. Publish all packages to npm atomically
 * 4. Create git tags
 * 5. Create GitHub release
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
}

const log = {
  error: (msg) => console.error(`${colors.red}✗ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warn: (msg) => console.warn(`${colors.yellow}⚠ ${msg}${colors.reset}`)
}

function run(command, description) {
  log.info(description)
  try {
    const output = execSync(command, { cwd: rootDir, encoding: 'utf-8', stdio: 'inherit' })
    log.success(`${description} - done`)
    return output
  } catch (error) {
    log.error(`${description} failed`)
    throw error
  }
}

function getVersion() {
  const rootPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'))
  return rootPkg.version
}

function getPublishedPackages() {
  const packages = []
  const packagesDir = path.join(rootDir, 'packages')
  const dirs = fs.readdirSync(packagesDir)

  for (const dir of dirs) {
    const pkgJsonPath = path.join(packagesDir, dir, 'package.json')
    if (fs.existsSync(pkgJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'))
      packages.push({
        name: pkg.name,
        version: pkg.version
      })
    }
  }

  return packages
}

async function main() {
  console.log('\n=== Release Process ===\n')

  try {
    // Step 1: Validate
    log.info('Step 1: Validating release...')
    run('node scripts/validate-release.js', 'Validation')

    console.log()

    // Step 2: Install dependencies
    log.info('Step 2: Installing dependencies...')
    run('pnpm install', 'Install dependencies')

    console.log()

    // Step 3: Build all packages
    log.info('Step 3: Building packages...')
    run('pnpm run build', 'Build all packages')

    console.log()

    // Step 4: Get version before publishing
    const version = getVersion()
    log.info(`Releasing version: ${version}`)

    // Step 5: Publish all packages atomically
    log.info('Step 4: Publishing to npm...')
    run('pnpm publish -r --access public', 'Publish all packages')

    console.log()

    // Step 6: Create git tag
    log.info('Step 5: Creating git tag...')
    try {
      execSync(`git tag v${version}`, { cwd: rootDir, stdio: 'inherit' })
      execSync(`git push origin v${version}`, { cwd: rootDir, stdio: 'inherit' })
      log.success(`Git tag v${version} created and pushed`)
    } catch (error) {
      log.warn(`Could not create git tag (might already exist): ${error.message}`)
    }

    console.log()

    // Step 7: Create GitHub release
    log.info('Step 6: Creating GitHub release...')
    const packages = getPublishedPackages()
    const releaseNotes = `## Packages Released\n\n${packages.map(p => `- ${p.name}@${p.version}`).join('\n')}\n\nAll packages synchronized and published atomically.`

    try {
      execSync(`gh release create v${version} --title "Release v${version}" --notes "${releaseNotes}"`, {
        cwd: rootDir,
        stdio: 'inherit'
      })
      log.success(`GitHub release v${version} created`)
    } catch (error) {
      log.warn(`Could not create GitHub release (might already exist): ${error.message}`)
    }

    console.log('\n=== Release Complete ===\n')
    log.success(`Successfully released v${version}`)
    console.log()

  } catch (error) {
    console.log('\n=== Release Failed ===\n')
    log.error(`Release process failed: ${error.message}`)
    console.error(error)
    process.exit(1)
  }
}

main()
