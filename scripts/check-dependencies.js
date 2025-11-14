#!/usr/bin/env node

/**
 * Checks that all imported packages are declared in dependencies
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

const errors = []

function getAllFiles(dir, fileList = []) {
  const files = readdirSync(dir)

  files.forEach(file => {
    const filePath = join(dir, file)
    const stat = statSync(filePath)

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
      getAllFiles(filePath, fileList)
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath)
    }
  })

  return fileList
}

function checkPackage(packageDir, packageName) {
  const packageJsonPath = join(packageDir, 'package.json')
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  }

  const srcDir = join(packageDir, 'src')
  const files = getAllFiles(srcDir)

  const imports = new Set()

  files.forEach(file => {
    const content = readFileSync(file, 'utf-8')
    const importRegex = /from\s+['"]([^'"]+)['"]/g
    let match

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1]

      // Skip relative imports
      if (importPath.startsWith('.')) continue

      // Extract package name (handle scoped packages)
      let packageName
      if (importPath.startsWith('@')) {
        const parts = importPath.split('/')
        packageName = `${parts[0]}/${parts[1]}`
      } else {
        packageName = importPath.split('/')[0]
      }

      // Skip node built-ins
      if (['fs', 'path', 'crypto', 'url', 'util', 'events', 'stream', 'buffer', 'http', 'https', 'net', 'os', 'child_process', 'fs/promises'].includes(packageName)) {
        continue
      }

      imports.add(packageName)
    }
  })

  // Check if all imports are in dependencies
  imports.forEach(imp => {
    if (!dependencies[imp]) {
      errors.push(`[${packageName}] Missing dependency: ${imp}`)
    }
  })
}

// Check each package
const packagesDir = join(rootDir, 'packages')
const packages = readdirSync(packagesDir)

packages.forEach(pkg => {
  const packageDir = join(packagesDir, pkg)
  const stat = statSync(packageDir)

  if (stat.isDirectory()) {
    console.log(`Checking ${pkg}...`)
    checkPackage(packageDir, pkg)
  }
})

if (errors.length > 0) {
  console.error('\n❌ Dependency check failed:\n')
  errors.forEach(err => console.error(`  ${err}`))
  console.error('\nPlease add the missing dependencies to the appropriate package.json files.\n')
  process.exit(1)
} else {
  console.log('\n✅ All dependencies are properly declared\n')
}
