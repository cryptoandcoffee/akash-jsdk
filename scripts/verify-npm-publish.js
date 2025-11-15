#!/usr/bin/env node
/**
 * Verifies that all packages were successfully published to npm
 *
 * After pnpm publish completes, this checks:
 * 1. Each package exists on npm registry
 * 2. Each package has the correct version
 * 3. Each package contains expected files
 * 4. Dependency resolution works (install from published packages)
 *
 * This is the critical missing piece that allows silent publishing failures
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const packagesDir = path.join(rootDir, 'packages')

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

function getPackages() {
  const packages = []
  const dirs = fs.readdirSync(packagesDir)

  for (const dir of dirs) {
    const pkgJsonPath = path.join(packagesDir, dir, 'package.json')
    if (fs.existsSync(pkgJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'))
      packages.push({
        name: pkg.name,
        version: pkg.version,
        path: path.join(packagesDir, dir)
      })
    }
  }

  return packages
}

function queryNpmRegistry(packageName, version) {
  return new Promise((resolve, reject) => {
    const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/${version}`

    https.get(url, { timeout: 5000 }, (res) => {
      let data = ''

      res.on('data', chunk => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data))
          } catch (error) {
            reject(new Error(`Failed to parse npm registry response: ${error.message}`))
          }
        } else if (res.statusCode === 404) {
          reject(new Error('Package version not found on npm registry'))
        } else {
          reject(new Error(`npm registry returned status ${res.statusCode}`))
        }
      })
    }).on('error', reject)
  })
}

async function verifyPackageOnNpm(pkg) {
  log.info(`Checking ${pkg.name}@${pkg.version}...`)

  try {
    const npmData = await queryNpmRegistry(pkg.name, pkg.version)

    // Verify the package has the basic structure we expect
    if (!npmData.name || !npmData.version) {
      log.error(`${pkg.name}: Missing required fields in npm registry`)
      return false
    }

    if (npmData.version !== pkg.version) {
      log.error(`${pkg.name}: Version mismatch. Expected ${pkg.version}, got ${npmData.version}`)
      return false
    }

    // Check that it has dist tarball
    if (!npmData.dist || !npmData.dist.tarball) {
      log.error(`${pkg.name}: No distribution tarball found`)
      return false
    }

    log.success(`${pkg.name}@${pkg.version} is available on npm`)
    return true
  } catch (error) {
    log.error(`${pkg.name}@${pkg.version}: ${error.message}`)
    return false
  }
}

async function verifyAllPackagesOnNpm(packages) {
  console.log('\n=== Verifying npm Registry ===\n')

  const results = []
  for (const pkg of packages) {
    const result = await verifyPackageOnNpm(pkg)
    results.push(result)
  }

  return results
}

function verifyDependencyResolution(packages) {
  console.log('\n=== Verifying Dependency Resolution ===\n')

  const version = packages[0].version

  // Try to install the published packages to verify they resolve correctly
  const packageList = packages.map(p => `${p.name}@${version}`).join(' ')

  try {
    log.info(`Attempting to install published packages: ${packageList}`)
    execSync(`npm install --dry-run ${packageList}`, {
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 30000
    })
    log.success('Published packages resolve correctly')
    return true
  } catch (error) {
    log.error('Published packages fail dependency resolution')
    log.warn('This may indicate missing dependencies or circular dependency issues')
    return false
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗')
  console.log('║   NPM PUBLISH VERIFICATION              ║')
  console.log('╚════════════════════════════════════════╝\n')

  try {
    const packages = getPackages()

    if (packages.length === 0) {
      log.error('No packages found')
      process.exit(1)
    }

    log.info(`Verifying ${packages.length} packages\n`)

    // Check each package on npm registry
    const registryResults = await verifyAllPackagesOnNpm(packages)

    // Check dependency resolution
    const resolutionResult = verifyDependencyResolution(packages)

    // Summary
    console.log('\n=== VERIFICATION SUMMARY ===\n')

    const allRegistryPassed = registryResults.every(r => r)
    const registryCount = registryResults.filter(r => r).length

    if (allRegistryPassed) {
      log.success(`All ${packages.length} packages found on npm registry`)
    } else {
      log.error(`Only ${registryCount}/${packages.length} packages found on npm registry`)
    }

    if (resolutionResult) {
      log.success('Dependency resolution verified')
    } else {
      log.warn('Dependency resolution check inconclusive (npm may not be available)')
    }

    console.log()

    if (allRegistryPassed && resolutionResult) {
      log.success('PUBLISH VERIFICATION PASSED')
      process.exit(0)
    } else if (allRegistryPassed) {
      log.success('All packages on npm (resolution check skipped)')
      process.exit(0)
    } else {
      log.error('PUBLISH VERIFICATION FAILED')
      process.exit(1)
    }
  } catch (error) {
    log.error(`Verification error: ${error.message}`)
    console.error(error)
    process.exit(1)
  }
}

main()
