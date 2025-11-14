#!/usr/bin/env node

/**
 * Script to automatically update all documentation files with current package versions
 * Runs during release workflow to keep version references in sync
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

console.log('📝 Updating documentation with current package versions...')

// Get current versions (all packages should have same version in monorepo)
const versions = {}
let currentVersion = null

for (const pkg of packages) {
  try {
    const packageJson = JSON.parse(readFileSync(join(rootDir, pkg.path), 'utf8'))
    versions[pkg.name] = packageJson.version
    if (!currentVersion) {
      currentVersion = packageJson.version
    }
    console.log(`   ${pkg.name}: ${packageJson.version}`)
  } catch (error) {
    console.error(`❌ Failed to read ${pkg.path}:`, error.message)
    process.exit(1)
  }
}

console.log(`\n🔢 Current version: ${currentVersion}\n`)

/**
 * Update a file with version replacements
 * @param {string} filePath - Path to file relative to root
 * @param {Array<{pattern: RegExp, replacement: string, description: string}>} patterns - Patterns to apply
 * @returns {number} Number of replacements made
 */
function updateFile(filePath, patterns) {
  const fullPath = join(rootDir, filePath)

  try {
    let content = readFileSync(fullPath, 'utf8')
    let totalReplacements = 0

    for (const { pattern, replacement, description } of patterns) {
      const matches = content.match(pattern)
      if (matches) {
        content = content.replace(pattern, replacement)
        totalReplacements += matches.length
        console.log(`   ✓ ${description} (${matches.length} replacement${matches.length > 1 ? 's' : ''})`)
      }
    }

    if (totalReplacements > 0) {
      writeFileSync(fullPath, content)
      return totalReplacements
    }

    return 0
  } catch (error) {
    console.error(`❌ Failed to update ${filePath}:`, error.message)
    return 0
  }
}

// Define version replacement patterns for each file
const filePatterns = {
  'README.md': [
    {
      pattern: /What's New in v\d+\.\d+\.\d+/g,
      replacement: `What's New in v${currentVersion}`,
      description: '"What\'s New" section header'
    },
    {
      pattern: /Version \d+\.\d+\.\d+ (brings|includes)/g,
      replacement: `Version ${currentVersion} $1`,
      description: 'Version description line'
    },
    // Package table (original logic)
    ...packages.map(pkg => ({
      pattern: new RegExp(
        `(\\| \`${pkg.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\` \\|[^|]+\\|) [^|]+ (\\|)`,
        'g'
      ),
      replacement: `$1 ${versions[pkg.name]} $2`,
      description: `Package table: ${pkg.name}`
    }))
  ],

  'PRODUCTION_READINESS.md': [
    {
      pattern: /Akash JSDK v\d+\.\d+\.\d+ includes/g,
      replacement: `Akash JSDK v${currentVersion} includes`,
      description: 'Overview header'
    },
    {
      pattern: /v\d+\.\d+\.\d+ \(Current Release\)/g,
      replacement: `v${currentVersion} (Current Release)`,
      description: 'Roadmap current release'
    },
    {
      pattern: /Install SDK.*version v\d+\.\d+\.\d+/g,
      replacement: `Install SDK version v${currentVersion}`,
      description: 'Production deployment instructions'
    },
    {
      pattern: /Document Version: \d+\.\d+\.\d+/g,
      replacement: `Document Version: ${currentVersion}`,
      description: 'Document version footer'
    },
    {
      pattern: /SDK Version: v\d+\.\d+\.\d+/g,
      replacement: `SDK Version: v${currentVersion}`,
      description: 'SDK version footer'
    }
  ],

  'packages/react/README.md': [
    {
      pattern: /Akash JSDK v\d+\.\d+\.\d+ -/g,
      replacement: `Akash JSDK v${currentVersion} -`,
      description: 'Footer version'
    }
  ],

  'packages/cli/README.md': [
    {
      pattern: /Akash JSDK v\d+\.\d+\.\d+ -/g,
      replacement: `Akash JSDK v${currentVersion} -`,
      description: 'Footer version'
    }
  ],

  'packages/protobuf/README.md': [
    {
      pattern: /akash-jsdk-core.*v\d+\.\d+\.\d+\+/g,
      replacement: `akash-jsdk-core** v${currentVersion}+`,
      description: 'Compatibility version'
    },
    {
      pattern: /Akash JSDK v\d+\.\d+\.\d+ -/g,
      replacement: `Akash JSDK v${currentVersion} -`,
      description: 'Footer version'
    }
  ]
}

// Update all files
let grandTotal = 0
for (const [file, patterns] of Object.entries(filePatterns)) {
  console.log(`\n📄 ${file}`)
  const count = updateFile(file, patterns)
  grandTotal += count
  if (count === 0) {
    console.log('   (no changes)')
  }
}

console.log(`\n✅ Documentation update complete!`)
console.log(`📊 Total: ${grandTotal} version reference${grandTotal !== 1 ? 's' : ''} updated across ${Object.keys(filePatterns).length} files\n`)
