---
"@cryptoandcoffee/akash-jsdk-core": patch
"@cryptoandcoffee/akash-jsdk-cli": patch
"@cryptoandcoffee/akash-jsdk-protobuf": patch
"@cryptoandcoffee/akash-jsdk-react": patch
---

Add GitHub Packages registry support

**New Features:**
- Packages now published to both npm and GitHub Packages registries
- Added repository field to all package.json files for better GitHub integration
- GitHub Packages section will now display published packages

**Configuration:**
- Added `publishConfig` with `access: public` to all packages
- Updated release workflow to publish to GitHub Packages after npm
- Added `packages: write` permission to release workflow

**Installation:**

From npm (default):
```bash
npm install @cryptoandcoffee/akash-jsdk-core
```

From GitHub Packages:
```bash
npm install @cryptoandcoffee/akash-jsdk-core --registry=https://npm.pkg.github.com
```

All 1,280 tests passing (100%).
