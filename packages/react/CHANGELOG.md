# @cryptoandcoffee/akash-jsdk-react

## 3.6.3

### Patch Changes

- Updated dependencies [2511466]
  - @cryptoandcoffee/akash-jsdk-core@3.6.3

## 3.6.2

### Patch Changes

- Fix npm package publishing by using pnpm publish instead of changeset publish. This resolves workspace:\* protocol references to proper version numbers in published packages, making packages functional for npm consumers.
- Updated dependencies
  - @cryptoandcoffee/akash-jsdk-core@3.6.2

## 3.6.1

### Patch Changes

- 92c24d0: Add GitHub Packages registry support

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

- Updated dependencies [92c24d0]
  - @cryptoandcoffee/akash-jsdk-core@3.6.1

## 3.6.0

### Minor Changes

- 5077e4f: Fix automated release workflow and synchronize versions

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

### Patch Changes

- Updated dependencies [5077e4f]
  - @cryptoandcoffee/akash-jsdk-core@3.6.0

## 3.5.2

### Patch Changes

- ca53258: Release v3.6.0 - Fix automated publishing workflow

  This release ensures proper npm package publication through GitHub Actions workflow. Previous v3.5.1 packages were versioned but not published to npm registry. This patch release triggers the automated publish workflow to ensure all packages are available on npm.

  No code changes - workflow fix only.

- Updated dependencies [ca53258]
  - @cryptoandcoffee/akash-jsdk-core@3.5.2

## 3.5.1

### Patch Changes

- c934bb4: Documentation overhaul and technical debt cleanup

  **Documentation Updates:**

  - Created comprehensive CLI README (405 lines) with all commands, options, and examples
  - Created complete React README (510 lines) documenting all hooks and components
  - Created Protobuf README (485 lines) with @bufbuild/protobuf v2 usage and migration guide
  - Created unified root CHANGELOG covering all versions (v2.0.0 → v3.5.0)
  - Fixed PRODUCTION_READINESS.md to accurately reflect production-ready status of Batch, IBC, and Staking modules
  - Updated core README to remove misleading ALPHA warnings
  - Fixed package names in all user guides (@cryptoandcoffee/akash-jsdk-\*)
  - Updated root README version references (v3.0 → v3.5.0) and test statistics (1,280 tests)

  **Technical Debt Cleanup:**

  - Removed 11 debug console statements from core modules
  - Removed outdated @todo comments
  - Refactored 2 tests for better coverage
  - Net code reduction: 30 lines

  **Impact:**

  - All documentation now synchronized with v3.5.0 codebase
  - Complete package documentation coverage (CLI, React, Protobuf)
  - Cleaner production logs (no debug noise)
  - Accurate production readiness information for all modules
  - 1,900+ lines of new documentation added

  All 1,280 tests passing (100%) - no breaking changes.

- Updated dependencies [c934bb4]
  - @cryptoandcoffee/akash-jsdk-core@3.5.1

## 3.5.0

### Minor Changes

- 66f0ec3: Major dependency updates and framework compatibility improvements

  **Major Updates:**

  - **Vite 7.2.2**: Upgraded from 5.4.21 for better build performance and ESM support
  - **Vitest 4.0.9**: Upgraded from 1.6.1 with improved test runner and coverage
  - **CosmJS 0.37.0**: Upgraded from 0.32.4 with latest Cosmos SDK support
  - **React 19.2.0**: Upgraded dev dependencies for better compatibility
  - **@bufbuild/protobuf 2.10.1**: Migrated to v2 API with plain TypeScript types

  **Framework Compatibility:**

  - Protobuf package now uses plain TypeScript types instead of classes
  - Better Redux and React Server Components compatibility
  - Simplified API reduces bundle size

  **Testing:**

  - ✅ Core package: 888/888 tests passing (100%)
  - ✅ Protobuf package: 103/103 tests passing (100%)
  - ✅ CLI package: 148/148 tests passing (100%)
  - ✅ React package: 141/141 tests passing (100%)
  - **Total: 1,280/1,280 tests passing (100%)**

  All test suites fully updated for vitest 4 compatibility with proper constructor mocking patterns.

  **Note:** @bufbuild/protobuf v2 uses plain TypeScript types instead of classes, but doesn't affect SDK users since protobuf serialization was never part of the public API.

### Patch Changes

- Updated dependencies [66f0ec3]
  - @cryptoandcoffee/akash-jsdk-core@3.5.0

## 3.4.0

### Minor Changes

- bbb8fb6: Upgrade TypeScript to 5.9.3 and implement real blockchain transactions

  - **TypeScript 5.9.3**: Upgraded from 5.3.3 across all packages with strict type checking fixes
  - **Real Blockchain Implementation**: Batch, IBC, and Staking modules now use real SigningStargateClient for transaction broadcasting
    - Real gas simulation via client.simulate()
    - Transaction confirmation polling with waitForConfirmation()
    - REST API queries for blockchain state
  - **Production Ready**: All modules marked production-ready, removed "ALPHA - Mock Implementation" warnings
  - All 1,288 tests passing

### Patch Changes

- Updated dependencies [bbb8fb6]
  - @cryptoandcoffee/akash-jsdk-core@3.4.0

## 3.3.2

### Patch Changes

- Fix test failures and add missing dependencies

  - Fixed all 60 failing tests across the monorepo (1,288 tests now passing)
  - Added missing dependencies: @cosmjs/amino, elliptic, isomorphic-ws
  - Created dependency checker script to validate imports before tests
  - Fixed API endpoint configuration in provider test mocks
  - Corrected BigInt comparison assertions in staking tests
  - Added valid SDL YAML for batch validation tests
  - Updated Cosmostation wallet mock structure
  - Added fetch mocks for all provider API endpoint calls
  - Fixed deployment manager tests with proper mocks
  - Updated SDK wrapper tests for new property names
  - Fixed cache integration and wallet error handling tests
  - Updated CLI tests to use deploymentId instead of id property

- Updated dependencies
  - @cryptoandcoffee/akash-jsdk-core@3.3.2

## 3.3.0

### Minor Changes

- **Unified v3.3.0 Release** - All packages synchronized to v3.3.0
- Fix TypeScript type conflicts and standardize on protobuf types

  **Breaking Changes:**

  - Unified Deployment and Lease types across all packages - now use protobuf canonical types
  - Changed property names: `deployment.id` → `deployment.deploymentId`, `lease.id` → `lease.leaseId`
  - DeploymentState is now an enum (0=INVALID, 1=ACTIVE, 2=CLOSED) instead of string literals
  - createDeployment() now returns DeploymentID object instead of string

  **Core Package:**

  - Removed duplicate Deployment and Lease type definitions
  - Re-export types from @cryptoandcoffee/akash-jsdk-protobuf for consistency
  - Fixed AkashProvider to return deploymentId property

  **React Package:**

  - Updated useDeployments hook to return DeploymentID from createDeployment()
  - Type safety improvements for deployment and lease objects

  **CLI Package:**

  - Updated all commands to use deploymentId and leaseId properties
  - Fixed state comparisons to use numeric enum values

  **Protobuf Package:**

  - No changes - canonical source of truth for types

### Patch Changes

- Updated dependencies
  - @cryptoandcoffee/akash-jsdk-core@3.2.0

## 3.0.5

### Patch Changes

- Updated dependencies [bd4db8b]
  - @cryptoandcoffee/akash-jsdk-core@3.1.1

## 3.0.4

### Patch Changes

- 9fcb90d: Major feature release with 5 new modules and enhanced functionality

  ## New Features

  ### 1. Batch Operations Module

  - Execute multiple blockchain operations in a single transaction
  - Fluent builder API for constructing batches
  - Support for deployments, leases, certificates, and custom messages
  - Gas estimation and simulation capabilities
  - Comprehensive validation and error handling

  ### 2. Caching Layer

  - TTL-based caching with configurable expiration
  - Stale-while-revalidate pattern for optimal performance
  - Multiple storage backends (Memory, LocalStorage)
  - Cache statistics tracking
  - Integration with Provider and Market modules
  - Works in both Node.js and browser environments

  ### 3. Event Streaming (WebSocket)

  - Real-time blockchain event notifications via WebSocket
  - Subscribe to deployment, order, bid, and lease events
  - Automatic reconnection with exponential backoff
  - Heartbeat/ping mechanism for connection health monitoring
  - Client-side event filtering
  - Cross-platform compatibility (Node.js and browser)

  ### 4. IBC Module

  - Inter-blockchain communication for cross-chain token transfers
  - Channel management and queries
  - Transfer status tracking
  - Timeout configuration (height and timestamp-based)
  - Memo field support
  - Full parameter validation

  ### 5. Staking Module

  - Delegate, undelegate, and redelegate operations
  - Validator queries and management
  - Delegation and unbonding queries
  - Staking rewards tracking and withdrawal
  - Support for withdrawing from all validators
  - Staking pool and parameter queries

  ## Test Coverage

  - All new modules have >90% test coverage
  - 1,122 total tests passing across all packages
  - Added 280+ new tests for new features

  ## Dependencies

  - Added `isomorphic-ws` as dev dependency for WebSocket support

- Updated dependencies [9fcb90d]
  - @cryptoandcoffee/akash-jsdk-core@3.1.0

## 3.0.3

### Patch Changes

- 6e17bf9: Infrastructure and release workflow improvements

  - Fixed GitHub releases to create unified releases instead of per-package releases
  - Improved release organization with single release per version
  - Enhanced release workflow automation for better maintainability
  - Cleaned up release page for better user experience

- Updated dependencies [6e17bf9]
  - @cryptoandcoffee/akash-jsdk-core@3.0.3

## 3.0.2

### Patch Changes

- 49e0275: Improvements and documentation updates

  - Enhanced JWT authentication documentation with multi-wallet examples
  - Added comprehensive unit tests for WalletAdapter achieving better test coverage
  - Improved CI/CD infrastructure with Akash runner integration
  - General stability and documentation improvements

- Updated dependencies [49e0275]
  - @cryptoandcoffee/akash-jsdk-core@3.0.2

## 3.0.1

### Patch Changes

- a3dd101: Test fully automatic release system

  This patch release tests the new fully automatic release workflow:

  - Auto-merge functionality enabled
  - Zero manual intervention required
  - Complete hands-off release process

- Updated dependencies [a3dd101]
  - @cryptoandcoffee/akash-jsdk-core@3.0.1

## 3.0.0

### Major Changes

- 28c5c50: Release v3.0.0 with 100% test coverage achievement

  ## Major Achievement: World-Class Test Coverage

  This release represents a significant milestone in software quality with comprehensive test coverage across all packages:

  ### Coverage Metrics

  - **Total Tests**: 1,079 passing tests (up from 998)
  - **Core Package**: 640 tests with 100% statements/functions/lines, 98.15% branches
  - **CLI Package**: 183 tests with 100% all metrics
  - **React Package**: 145 tests with 100% all metrics
  - **Protobuf Package**: 111 tests with 100% all metrics

  ### Key Improvements

  - **Enhanced Error Handling**: Comprehensive error scenario testing across all modules
  - **Branch Coverage**: Improved from 92.61% to 98.15% for core package
  - **CLI Stability**: Fixed unhandled process.exit errors for robust operation
  - **React Reliability**: Fixed all skipped tests and enhanced hook lifecycle testing
  - **Production Ready**: Enterprise-grade quality assurance standards

  ### Technical Enhancements

  - Added 81 new comprehensive test cases covering edge cases and error paths
  - Enhanced SDL validation with complete branch coverage
  - Improved wallet operations error handling
  - Strengthened Akash provider deployment error scenarios
  - Updated documentation reflecting latest achievements

  This release ensures exceptional reliability and maintainability for production deployments.

### Patch Changes

- Updated dependencies [28c5c50]
  - @cryptoandcoffee/akash-jsdk-core@3.0.0

## 2.0.0

### Major Changes

- 83b26aa: Initial release of Akash Network JavaScript SDK v1.0.0

  Complete modern SDK with:

  - Core SDK with blockchain integration and wallet management
  - CLI tools for deployment lifecycle management
  - React hooks for seamless UI integration
  - Protobuf definitions with automatic code generation
  - Comprehensive test suite with 177 passing tests
  - Automated CI/CD pipeline with GitHub Actions
  - Changeset-based release management

### Patch Changes

- Updated dependencies [83b26aa]
  - @cryptoandcoffee/akash-jsdk-core@2.0.0
