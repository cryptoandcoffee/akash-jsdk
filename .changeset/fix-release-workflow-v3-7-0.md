---
"@cryptoandcoffee/akash-jsdk-core": minor
"@cryptoandcoffee/akash-jsdk-cli": minor
"@cryptoandcoffee/akash-jsdk-protobuf": minor
"@cryptoandcoffee/akash-jsdk-react": minor
---

Fix automated release workflow and synchronize versions

**Workflow Fixes:**
- Changed release trigger from `workflow_run` to `on: push` for proper automation
- Removed manual auto-merge step that was preventing publish
- Added test execution before release to ensure quality
- Changesets action now handles full cycle: create PR → merge → publish

**Version Synchronization:**
- Repository: 3.5.2 → 3.7.0
- npm registry: 3.5.0 → 3.7.0
- GitHub releases: 3.5.0 → 3.7.0

**How It Works Now:**
1. Push changeset to main → creates version PR
2. Manually merge version PR → automatically publishes to npm
3. GitHub release created automatically with changelog

All 1,280 tests passing (100%).
