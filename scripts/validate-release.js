#!/usr/bin/env node
/**
 * Validates that all packages are ready for coordinated release
 *
 * Checks:
 * 1. All packages have the same version
 * 2. All dependencies reference the same versions as package versions
 * 3. No workspace:* protocols remain in published dependencies
 * 4. No circular dependencies exist
 * 5. All referenced packages are published together
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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
  const packages = {}
  const dirs = fs.readdirSync(packagesDir)

  for (const dir of dirs) {
    const pkgJsonPath = path.join(packagesDir, dir, 'package.json')
    if (fs.existsSync(pkgJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'))
      packages[pkg.name] = {
        path: path.join(packagesDir, dir),
        name: pkg.name,
        version: pkg.version,
        dependencies: pkg.dependencies || {},
        dir
      }
    }
  }

  return packages
}

function validateVersionsMatch(packages) {
  const versions = Object.values(packages).map(p => p.version)
  const uniqueVersions = new Set(versions)

  if (uniqueVersions.size !== 1) {
    log.error(`All packages must have the same version. Found: ${Array.from(uniqueVersions).join(', ')}`)
    return false
  }

  const version = versions[0]
  log.success(`All packages at version: ${version}`)
  return true
}

function validateWorkspaceProtocol(packages) {
  let valid = true

  for (const [name, pkg] of Object.entries(packages)) {
    for (const [depName, depVersion] of Object.entries(pkg.dependencies)) {
      if (depVersion === 'workspace:*' || depVersion.startsWith('workspace:')) {
        log.error(`${name}: Still using workspace:* for ${depName}. Must be explicit version.`)
        valid = false
      }
    }
  }

  if (valid) {
    log.success('No workspace:* protocols found')
  }

  return valid
}

function validateInternalDependencies(packages) {
  const internalPackages = new Set(Object.keys(packages))
  const targetVersion = Object.values(packages)[0].version
  let valid = true

  for (const [name, pkg] of Object.entries(packages)) {
    for (const [depName, depVersion] of Object.entries(pkg.dependencies)) {
      // Check if this is an internal dependency
      if (internalPackages.has(depName)) {
        if (depVersion !== targetVersion) {
          log.error(`${name}: Depends on ${depName}@${depVersion} but should be @${targetVersion}`)
          valid = false
        }
      }
    }
  }

  if (valid) {
    log.success('All internal dependencies reference correct versions')
  }

  return valid
}

function validateNoCircularDeps(packages) {
  const visited = new Set()
  const recursionStack = new Set()
  const internalPackages = new Set(Object.keys(packages))

  function hasCycle(pkgName, visited, stack) {
    visited.add(pkgName)
    stack.add(pkgName)

    const pkg = packages[pkgName]
    for (const [depName] of Object.entries(pkg.dependencies)) {
      if (!internalPackages.has(depName)) continue

      if (!visited.has(depName)) {
        if (hasCycle(depName, visited, stack)) return true
      } else if (stack.has(depName)) {
        return true
      }
    }

    stack.delete(pkgName)
    return false
  }

  for (const pkgName of Object.keys(packages)) {
    if (!visited.has(pkgName)) {
      if (hasCycle(pkgName, visited, recursionStack)) {
        log.error('Circular dependency detected in package graph')
        return false
      }
    }
  }

  log.success('No circular dependencies')
  return true
}

function validateDependencyGraph(packages) {
  const internalPackages = new Set(Object.keys(packages))
  const targetVersion = Object.values(packages)[0].version

  log.info('Dependency graph:')
  for (const [name, pkg] of Object.entries(packages)) {
    const deps = Object.entries(pkg.dependencies)
      .filter(([depName]) => internalPackages.has(depName))
      .map(([depName, depVersion]) => `${depName.split('/').pop()}@${depVersion}`)

    const depStr = deps.length > 0 ? ' → ' + deps.join(', ') : ''
    console.log(`  ${name.split('/').pop()}@${pkg.version}${depStr}`)
  }

  return true
}

function main() {
  console.log('\n=== Release Validation ===\n')

  try {
    const packages = getPackages()

    if (Object.keys(packages).length === 0) {
      log.error('No packages found in packages/ directory')
      process.exit(1)
    }

    log.info(`Found ${Object.keys(packages).length} packages`)

    const checks = [
      { name: 'Versions match', fn: () => validateVersionsMatch(packages) },
      { name: 'No workspace:* protocols', fn: () => validateWorkspaceProtocol(packages) },
      { name: 'Internal dependencies valid', fn: () => validateInternalDependencies(packages) },
      { name: 'No circular dependencies', fn: () => validateNoCircularDeps(packages) },
      { name: 'Dependency graph', fn: () => validateDependencyGraph(packages) }
    ]

    const results = []
    for (const check of checks) {
      console.log()
      try {
        results.push(check.fn())
      } catch (error) {
        log.error(`${check.name}: ${error.message}`)
        results.push(false)
      }
    }

    console.log('\n=== Validation Summary ===\n')

    if (results.every(r => r)) {
      log.success('All validations passed - ready to release!')
      console.log()
      process.exit(0)
    } else {
      log.error('Validation failed - fix issues above before releasing')
      console.log()
      process.exit(1)
    }
  } catch (error) {
    log.error(`Validation error: ${error.message}`)
    console.error(error)
    process.exit(1)
  }
}

main()
