# Release Process Documentation

## Overview

This document describes the safe, verified release process for the Akash JSDK monorepo.

**Key Principle**: The release system prioritizes safety over automation. All packages must pass comprehensive checks before any npm interaction occurs, and publication is verified before creating git artifacts.

---

## The Problem We Solved

The previous release system had fundamental issues:

1. **Automation Theater**: Automated triggers that checked version numbers but not actual readiness
2. **Silent Failures**: Publishing could fail but the workflow would still "succeed"
3. **No Verification**: No check that packages actually landed on npm
4. **Hidden Errors**: Conditional steps hid failures instead of reporting them clearly
5. **Race Conditions**: Automatic triggers on package.json changes caused unpredictable state

Result: Multiple failed releases (v3.7.0 → v3.7.1 → v3.7.2 → v3.7.3) where some packages were out of sync or publishing silently failed.

---

## New Architecture

The new system uses **explicit manual triggers** with **comprehensive safeguards**:

### Four Safeguard Scripts

#### 1. `scripts/pre-flight-check.js` - 10-Point Safety Check

Runs BEFORE any npm interaction. Checks:

1. **Version Synchronization**: All 4 packages have identical version
2. **No workspace:* Protocols**: Dependencies use explicit versions
3. **Internal Dependencies**: All packages depend on correct versions
4. **Lockfile Synchronized**: `pnpm-lock.yaml` matches `package.json`
5. **Dependencies Installable**: `pnpm install` succeeds with frozen lockfile
6. **Code Builds**: `pnpm run build` succeeds
7. **Tests Pass**: `pnpm run test` succeeds
8. **No Uncommitted Changes**: Git working directory is clean
9. **On Main Branch**: Current branch is main
10. **Synced with Upstream**: Local main matches origin/main

**If ANY check fails, the script exits with error code 1.**

```bash
# Run locally to validate before pushing
pnpm run release:preflight
```

#### 2. `scripts/release.js` - Safe Release Orchestration

The main release script. Steps:

1. Run pre-flight checks (must all pass)
2. Build all packages
3. Publish to npm (atomic: all 4 or none)
4. **Verify all packages on npm** ← Critical verification step
5. Create git tag `v{VERSION}`
6. Create GitHub release
7. Update README with new versions

**Key Safety Features**:
- Each step reports success/failure clearly
- Non-critical steps (README update, GitHub release) don't block the release
- If verification fails, git artifacts are NOT created
- Script can be safely re-run if it fails

```bash
# Run locally to test (requires NPM_TOKEN)
export NPM_TOKEN=your_token
pnpm run release
```

#### 3. `scripts/verify-npm-publish.js` - Publication Verification

Runs after publishing. Checks:

1. **Each package exists on npm**: Queries npm registry
2. **Correct version published**: Version matches what we intended
3. **Dependency resolution works**: Can install published packages

This is the **critical missing piece** that was causing silent publishing failures.

```bash
# Check published packages
pnpm run release:verify
```

#### 4. `.github/workflows/release.yml` - Simplified Workflow

**Before**: 14 steps with complex conditional logic
**After**: Simple 1-step workflow

```yaml
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to release'
        required: true

jobs:
  release:
    steps:
      - Checkout
      - Setup Node.js, pnpm, gh
      - Run Safe Release
        run: node scripts/release.js
```

The entire release logic lives in `scripts/release.js` which:
- Is testable locally
- Has clear error handling
- Provides detailed output
- Can be re-run safely

---

## Release Process: Step by Step

### 1. Prepare Release (Local Development)

Update versions in all package.json files:

```bash
# Root package.json
# packages/core/package.json
# packages/cli/package.json
# packages/protobuf/package.json
# packages/react/package.json
```

All must have the same version. Example: `3.8.0`

Also update internal dependencies in core, cli, react:

```json
{
  "dependencies": {
    "@cryptoandcoffee/akash-jsdk-core": "3.8.0",
    "@cryptoandcoffee/akash-jsdk-protobuf": "3.8.0"
  }
}
```

### 2. Synchronize Lockfile

```bash
pnpm install
```

This updates `pnpm-lock.yaml` to match the new versions. **Critical**: If you skip this, the release will fail at the pre-flight check.

### 3. Test Pre-Flight Locally

```bash
pnpm run release:preflight
```

This runs all 10 safety checks. Output shows:

```
═══ Check 1: Version Synchronization ═══
✓ All 4 packages at version: 3.8.0

═══ Check 2: No workspace:* Protocols ═══
✓ No workspace:* protocols found

... (8 more checks)

═══ SUMMARY ═══
✓ All 10 checks passed - READY TO RELEASE
```

If ANY check fails, fix it before proceeding.

### 4. Commit Version Changes

```bash
git add package.json packages/*/package.json pnpm-lock.yaml
git commit -m "chore: Bump to version 3.8.0"
git push
```

**Important**: Don't trigger release yet. Just push the version change.

### 5. Verify Build Works (Optional)

```bash
pnpm run build
pnpm run test
```

These are also checked by pre-flight, but you can verify locally.

### 6. Trigger Release Workflow

Go to GitHub Actions → Release workflow → Click "Run workflow"

Enter the version number (e.g., `3.8.0`) and click "Run workflow"

The workflow will:
1. Check out main
2. Run `node scripts/release.js`
3. Execute all 4 safeguard checks
4. Build packages
5. Publish to npm
6. Verify on npm
7. Create git tag and GitHub release

### 7. Monitor Workflow

Watch the workflow run. You should see output like:

```
═══ STEP 1: Pre-Flight Checks ═══
✓ Running comprehensive checks

═══ STEP 2: Build All Packages ═══
✓ Building all packages - done

═══ STEP 3: Publish to npm ═══
ℹ Publishing all 4 packages atomically...
✓ Publishing packages - done

═══ STEP 4: Verify Packages on npm ═══
ℹ Checking @cryptoandcoffee/akash-jsdk-core@3.8.0...
✓ @cryptoandcoffee/akash-jsdk-core@3.8.0 is available on npm
... (3 more packages)

═══ STEP 5: Create Git Tag ═══
✓ Creating git tag v3.8.0 - done

═══ RELEASE COMPLETE ═══
✓ Successfully released v3.8.0
```

### 8. Verify Release Complete

- [ ] Packages appear on npmjs.com
- [ ] GitHub release exists with all 4 packages listed
- [ ] Git tag `v3.8.0` exists
- [ ] README.md updated with new versions

---

## Troubleshooting

### Pre-Flight Check Fails

The check that fails tells you exactly what's wrong:

**"Lockfile is OUT OF DATE"**
```bash
pnpm install
git add pnpm-lock.yaml
git commit -m "chore: Update lockfile"
git push
```

**"Code Builds"**
```bash
pnpm run build
# Fix errors shown
git add packages/*/dist (or whatever changed)
git commit -m "fix: Build errors"
git push
```

**"Tests Pass"**
```bash
pnpm run test
# Fix test failures
git add (test files)
git commit -m "fix: Test failures"
git push
```

**"No Uncommitted Changes"**
```bash
git status
# Commit or discard changes
git add/rm files
git commit
git push
```

**"Synced with Upstream"**
```bash
git pull origin main
# Resolve conflicts if any
git push
```

### Publishing Fails

If npm rejects the publish:

1. Check NPM_TOKEN is valid (GitHub Actions secret)
2. Verify no version already exists on npm
3. Check no invalid files in package.json `"files"` field
4. Try again - the pre-flight already passed, so it's likely temporary

### Workflow Succeeds But Verify Step Fails

This means:
- Build succeeded
- npm accepted the publish command
- But packages didn't actually appear on npm

Likely causes:
- Network timeout (retry workflow)
- npm registry temporarily unavailable (retry workflow)
- Authentication partially failed (check NPM_TOKEN)

**Safe to retry**: The pre-flight guarantees no weird intermediate state.

### Need to Re-Run Release

If anything fails partway through:

1. Fix the issue
2. Push any changes to main
3. Run the workflow again with the same version number
4. The pre-flight check ensures nothing is in a broken state

Safe idempotent operations:
- Publishing the same version again works (or fails consistently)
- Creating the same git tag again fails (but doesn't break anything)
- Creating the same GitHub release again fails (but doesn't break anything)

---

## What Changed From Old System

| Aspect | Old System | New System |
|--------|-----------|-----------|
| Trigger | Automatic on package.json push | Manual `workflow_dispatch` |
| Safety Checks | 5 basic checks | 10 comprehensive checks |
| Verification | None - assumed success | Queries npm registry |
| Build/Test | Optional | **Required** pre-flight |
| Lockfile | `--no-frozen-lockfile` workaround | Enforced frozen-lockfile |
| Git Artifacts | Created before publishing | Created **after** verification |
| Error Handling | Conditional steps hide failures | Explicit error reporting |
| Re-runnable | Risky (might double-publish) | Safe (idempotent) |
| Development | Not testable locally | Fully testable: `pnpm run release` |

---

## Key Principles

### 1. Explicit Over Automatic

Manual triggers prevent accidents. You decide when to release, not a change event.

### 2. Verify Over Trust

We don't assume npm accepted the publish. We verify each package exists and is accessible.

### 3. Fail Fast Over Fail Silent

Any failure stops the process with clear error messages. No hidden failures.

### 4. Safe Over Clever

The system is idempotent and re-runnable. If something fails, you can fix it and re-run.

### 5. Local Over Remote

Test the entire release locally before pushing to GitHub. `pnpm run release:preflight` catches issues early.

---

## Scripts Reference

```bash
# Test if ready to release
pnpm run release:preflight

# Run full release (requires NPM_TOKEN)
pnpm run release

# Verify packages on npm (after publishing)
pnpm run release:verify

# Build, test, lint, etc.
pnpm run build
pnpm run test
pnpm run lint
```

---

## Critical Fixes & Milestones

### v3.10.11 - Critical Protobuf Fix

**Issue**: "Error: no such type: akash.deployment.v1beta3.MsgCreateDeployment"

**Status**: ✅ RESOLVED

**What was fixed**:
- Replaced runtime proto file loading (broken by vite bundling) with in-memory protobuf definitions
- Uses `root.define()` to create proper namespace structures programmatically
- Works reliably in Node.js and browsers
- Immune to path resolution issues

**Changed files**:
- `packages/protobuf/src/message-classes.ts` - New `createMinimalProto()` function

**Testing**:
- `MsgCreateDeployment.encode()` verified working
- Message encoding/decoding tested successfully
- All 4 packages built and tested

**Impact**: Fixes deployment creation failures for all users upgrading from v3.10.0-v3.10.10

---

## Emergency Procedures

### If Something Is Partially Published

If 3 of 4 packages published but something failed:

1. Identify which package failed
2. Fix the issue
3. Re-run the release workflow with the same version
4. Publishing same version again is safe (npm just updates it)

### If Git Tag Exists But npm Never Received Packages

If the workflow created v3.8.0 tag but packages aren't on npm:

1. Check npm registry - are packages there?
2. If yes: Just re-run the verify step, then GitHub release
3. If no: Fix the npm issue, delete the git tag, re-run release

```bash
# Delete local and remote tag
git tag -d v3.8.0
git push origin :v3.8.0

# Then re-run the workflow
```

### If README Update Fails

The release is complete, this is non-critical:

```bash
# Update README manually
node scripts/update-readme-versions.js
git add README.md
git commit -m "docs: Update versions"
git push
```

---

## Success Criteria

A release is successful when:

- [ ] All 4 packages exist on npmjs.com with correct version
- [ ] Versions are listed and installable: `npm install @cryptoandcoffee/akash-jsdk-core@3.8.0`
- [ ] Git tag `v3.8.0` exists on main branch
- [ ] GitHub release `v3.8.0` lists all 4 packages
- [ ] README.md shows new version
- [ ] No workflow errors in GitHub Actions

---

## Performance

Typical release duration:
- Pre-flight checks: 2-3 minutes
- Build: 1-2 minutes
- Publish: 1-2 minutes
- Verification: 30-60 seconds
- Git operations: 10-30 seconds

**Total**: ~5-10 minutes

---

## Questions?

Refer to:
- `CLAUDE.md` - AI assistant guide
- `AGENTS.md` - Multi-agent collaboration guide
- Workflow logs - GitHub Actions shows detailed output
- `scripts/*.js` - Source code comments explain logic
