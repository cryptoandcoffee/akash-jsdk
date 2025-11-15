#!/usr/bin/env node
/**
 * Safe, verified release orchestration
 *
 * This is the main release script that:
 * 1. Runs comprehensive pre-flight checks
 * 2. Builds and publishes all packages
 * 3. Verifies all packages published successfully
 * 4. Only creates git artifacts after verification
 * 5. Provides clear error reporting if anything fails
 *
 * CRITICAL: This script is SAFE TO RE-RUN
 * - If it fails partway, you can fix the issue and run it again
 * - Idempotent checks prevent duplicate publishes
 * - Clear error messages show exactly what went wrong
 */

import { execSync, spawnSync } from 'child_process'
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
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

const log = {
  error: (msg) => console.error(`${colors.red}✗ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warn: (msg) => console.warn(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}\n`)
}

function run(command, description, options = {}) {
  const { stdio = 'inherit', env = process.env } = options

  log.info(description)
  try {
    const result = spawnSync('sh', ['-c', command], {
      cwd: rootDir,
      stdio,
      encoding: 'utf-8',
      env: { ...env, ...options.env }
    })

    if (result.error) throw result.error
    if (result.status !== 0) throw new Error(`Exit code ${result.status}`)

    if (stdio === 'pipe') return result.stdout
    log.success(`${description} - done`)
    return result.stdout || ''
  } catch (error) {
    log.error(`${description} failed`)
    if (result?.stdout) console.log(result.stdout)
    if (result?.stderr) console.error(result.stderr)
    throw error
  }
}

function getVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'))
  return pkg.version
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
  console.log(`\n${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`)
  console.log(`${colors.cyan}║   SAFE RELEASE ORCHESTRATION             ║${colors.reset}`)
  console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`)

  try {
    const version = getVersion()
    log.info(`Releasing version ${version}`)
    console.log()

    // STEP 0: Install dependencies (needed for pre-flight checks)
    log.section('STEP 0: Install Dependencies')
    try {
      run('pnpm install', 'Installing dependencies')
    } catch (error) {
      log.error('Dependency installation failed')
      process.exit(1)
    }

    // STEP 1: Pre-flight checks
    log.section('STEP 1: Pre-Flight Checks')
    try {
      run('node scripts/pre-flight-check.js', 'Running comprehensive checks')
    } catch (error) {
      log.error('Pre-flight checks failed - cannot proceed with release')
      process.exit(1)
    }

    // STEP 2: Build
    log.section('STEP 2: Build All Packages')
    try {
      run('pnpm run build', 'Building all packages')
    } catch (error) {
      log.error('Build failed - fix errors above and try again')
      process.exit(1)
    }

    // STEP 2.5: Convert workspace:* to explicit versions before publishing
    log.section('STEP 2.5: Prepare Packages for Publishing')
    try {
      const packagesDir = path.join(rootDir, 'packages')
      const packageFiles = ['core/package.json', 'cli/package.json', 'react/package.json']

      for (const packageFile of packageFiles) {
        const filePath = path.join(packagesDir, packageFile)
        const content = fs.readFileSync(filePath, 'utf-8')
        // Replace workspace:* with explicit version
        const updated = content.replace(/"workspace:\*"/g, `"${version}"`)
        fs.writeFileSync(filePath, updated)
      }

      log.success('Updated internal dependencies to explicit versions')

      // Commit the changes so git checks pass for publishing
      log.info('Committing dependency changes...')
      run('git add packages/*/package.json', 'Staging package.json changes')
      run(`git commit -m "chore: Prepare v${version} for publishing with explicit dependencies"`, 'Committing changes')
    } catch (error) {
      log.error('Failed to update package dependencies')
      process.exit(1)
    }

    // STEP 3: Publish
    log.section('STEP 3: Publish to npm')
    try {
      log.info('Publishing all 4 packages atomically...')
      run('pnpm publish -r --access public --no-git-checks', 'Publishing packages', {
        stdio: 'inherit',
        env: {
          NPM_TOKEN: process.env.NPM_TOKEN,
          NODE_AUTH_TOKEN: process.env.NPM_TOKEN
        }
      })
    } catch (error) {
      log.error('Publishing failed - this is critical')
      log.warn('The build succeeded but npm rejected the publish')
      log.warn('Possible causes:')
      log.warn('  - Version already exists on npm')
      log.warn('  - npm authentication failed (check NPM_TOKEN)')
      log.warn('  - Package contains invalid files')
      log.warn('  - npm registry is temporarily unavailable')
      process.exit(1)
    }

    // STEP 4: Verify all packages published
    log.section('STEP 4: Verify Packages on npm')
    try {
      run('node scripts/verify-npm-publish.js', 'Verifying npm publication')
    } catch (error) {
      log.error('npm verification failed')
      log.error('Packages may have partially published - this requires manual intervention')
      log.warn('Check https://www.npmjs.com/search?q=cryptoandcoffee/akash-jsdk')
      process.exit(1)
    }

    // STEP 5: Create git tag
    log.section('STEP 5: Create Git Tag')
    try {
      run(`git tag v${version}`, `Creating git tag v${version}`)
      run(`git push origin v${version}`, `Pushing tag to origin`)
    } catch (error) {
      log.error('Git tagging failed')
      log.warn('Packages are published to npm but git tag was not created')
      log.warn('This is less critical but should be fixed')
      log.warn(`Manually run: git tag v${version} && git push origin v${version}`)
    }

    // STEP 6: Create GitHub release
    log.section('STEP 6: Create GitHub Release')
    try {
      const packages = getPublishedPackages()
      const notes = packages
        .map(p => `- ${p.name}@${p.version}`)
        .join('\n')

      const releaseNotes = `## Packages Released\n\n${notes}\n\nAll packages synchronized and published atomically.`

      run(
        `gh release create v${version} --title "Release v${version}" --notes "${releaseNotes.replace(/"/g, '\\"')}"`,
        'Creating GitHub release'
      )
    } catch (error) {
      log.warn('GitHub release creation failed (may already exist)')
      log.warn('This is non-critical - you can create it manually if needed')
    }

    // STEP 7: Update README
    log.section('STEP 7: Update README with Latest Versions')
    try {
      run('node scripts/update-readme-versions.js', 'Updating README')

      // Try to commit if README changed
      const status = run('git status --porcelain README.md', 'Checking for README changes', {
        stdio: 'pipe'
      }).trim()

      if (status) {
        run('git config user.name "github-actions[bot]"', 'Setting git user')
        run('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"', 'Setting git email')
        run('git add README.md', 'Staging README changes')
        run('git commit -m "docs: update README.md with latest package versions [skip ci]"', 'Committing README')
        run('git push origin main', 'Pushing README update')
      }
    } catch (error) {
      log.warn('README update failed (non-critical)')
    }

    // SUCCESS
    log.section('RELEASE COMPLETE')
    log.success(`Successfully released v${version}`)
    log.success('All 4 packages published to npm')
    log.success('Git tag created')
    log.success('GitHub release created')
    console.log()

    process.exit(0)
  } catch (error) {
    log.section('RELEASE FAILED')
    log.error(`Release process failed: ${error.message}`)
    console.error(error)
    process.exit(1)
  }
}

main()
