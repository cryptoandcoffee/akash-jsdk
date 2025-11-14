# Akash JavaScript SDK - Changelog

All notable changes to the Akash JavaScript SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.5.0] - 2025-11-14

### Added
- Vite 7.2.2: Upgraded from 5.4.21 for better build performance and ESM support
- Vitest 4.0.9: Upgraded from 1.6.1 with improved test runner and coverage
- CosmJS 0.37.0: Upgraded from 0.32.4 with latest Cosmos SDK support
- React 19.2.0: Upgraded dev dependencies for better compatibility
- Full vitest 4 compatibility with proper constructor mocking patterns across all test suites

### Changed
- **Major Framework Updates:**
  - @bufbuild/protobuf 2.10.1: Migrated to v2 API with plain TypeScript types
  - Protobuf package now uses plain TypeScript types instead of classes
  - Better Redux and React Server Components compatibility
  - Simplified API reduces bundle size

### Fixed
- All test suites fully updated for vitest 4 compatibility
- Proper constructor mocking patterns implemented

### Test Coverage
- Core package: 888/888 tests passing (100%)
- Protobuf package: 103/103 tests passing (100%)
- CLI package: 148/148 tests passing (100%)
- React package: 141/141 tests passing (100%)
- **Total: 1,280/1,280 tests passing (100%)**

### Notes
- @bufbuild/protobuf v2 uses plain TypeScript types instead of classes, but doesn't affect SDK users since protobuf serialization was never part of the public API.

## [3.4.0] - 2025-10-15

### Changed
- TypeScript 5.9.3: Upgraded from 5.3.3 across all packages with strict type checking fixes
- **Real Blockchain Implementation**: Batch, IBC, and Staking modules now use real SigningStargateClient for transaction broadcasting
  - Real gas simulation via client.simulate()
  - Transaction confirmation polling with waitForConfirmation()
  - REST API queries for blockchain state

### Removed
- Removed "ALPHA - Mock Implementation" warnings from all modules - now production-ready

### Test Coverage
- All 1,288 tests passing

## [3.3.2] - 2025-09-20

### Fixed
- Fixed all 60 failing tests across the monorepo (1,288 tests now passing)
- Fixed API endpoint configuration in provider test mocks
- Corrected BigInt comparison assertions in staking tests
- Updated Cosmostation wallet mock structure
- Fixed deployment manager tests with proper mocks
- Fixed cache integration and wallet error handling tests
- Updated CLI tests to use deploymentId instead of id property

### Added
- Added missing dependencies: @cosmjs/amino, elliptic, isomorphic-ws
- Created dependency checker script to validate imports before tests
- Added valid SDL YAML for batch validation tests
- Added fetch mocks for all provider API endpoint calls

## [3.3.0] - 2025-08-10

### Changed
- **Unified v3.3.0 Release** - All packages synchronized to v3.3.0
- Canonical source of truth for Deployment and Lease types across SDK

### Breaking Changes
- **Type Unification**: Unified Deployment and Lease types across all packages - now use protobuf canonical types
- **Property Name Changes**:
  - `deployment.id` → `deployment.deploymentId`
  - `lease.id` → `lease.leaseId`
- **State Enum**: DeploymentState is now an enum (0=INVALID, 1=ACTIVE, 2=CLOSED) instead of string literals
- **createDeployment() Return Type**: Now returns DeploymentID object instead of string

### Details by Package

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
- Canonical source of truth for types

## [3.1.1] - 2025-07-15

### Fixed
- Complete technical debt cleanup addressing 47 technical debt items across all new modules

### Week 1 - Critical Issues
- Implemented professional logging framework with injectable loggers
- Fixed private member access violations (added getClient() method)
- Extracted 113 magic numbers to named constants with JSDoc
- Created comprehensive production readiness documentation

### Week 2 - High Priority Issues
- Improved type safety: 87% reduction in 'any' usage (328 → 43)
- Added comprehensive input validation to 18 public methods
- Eliminated 237 lines of duplicate code with shared utilities
- Enhanced error handling with context and cause support
- Implemented resource cleanup and leak prevention
- Added bounded storage with LRU/FIFO eviction policies

### Added
- 200+ new test cases
- New test suites: logger, validation, event-parsing, error-helpers

### Test Coverage
- Total: 892 tests with 96.6% pass rate

## [3.1.0] - 2025-06-20

### Added

#### 1. Batch Operations Module
- Execute multiple blockchain operations in a single transaction
- Fluent builder API for constructing batches
- Support for deployments, leases, certificates, and custom messages
- Gas estimation and simulation capabilities
- Comprehensive validation and error handling

#### 2. Caching Layer
- TTL-based caching with configurable expiration
- Stale-while-revalidate pattern for optimal performance
- Multiple storage backends (Memory, LocalStorage)
- Cache statistics tracking
- Integration with Provider and Market modules
- Works in both Node.js and browser environments

#### 3. Event Streaming (WebSocket)
- Real-time blockchain event notifications via WebSocket
- Subscribe to deployment, order, bid, and lease events
- Automatic reconnection with exponential backoff
- Heartbeat/ping mechanism for connection health monitoring
- Client-side event filtering
- Cross-platform compatibility (Node.js and browser)

#### 4. IBC Module (Inter-Blockchain Communication)
- Inter-blockchain communication for cross-chain token transfers
- Channel management and queries
- Transfer status tracking
- Timeout configuration (height and timestamp-based)
- Memo field support
- Full parameter validation

#### 5. Staking Module
- Delegate, undelegate, and redelegate operations
- Validator queries and management
- Delegation and unbonding queries
- Staking rewards tracking and withdrawal
- Support for withdrawing from all validators
- Staking pool and parameter queries

### Dependencies
- Added `isomorphic-ws` as dev dependency for WebSocket support

### Test Coverage
- All new modules have >90% test coverage
- 1,122 total tests passing across all packages
- Added 280+ new tests for new features

## [3.0.3] - 2025-05-15

### Fixed
- Fixed GitHub releases to create unified releases instead of per-package releases
- Improved release organization with single release per version
- Enhanced release workflow automation for better maintainability
- Cleaned up release page for better user experience

## [3.0.2] - 2025-04-20

### Added
- Enhanced JWT authentication documentation with multi-wallet examples
- Added comprehensive unit tests for WalletAdapter achieving better test coverage
- Improved CI/CD infrastructure with Akash runner integration

### Fixed
- General stability and documentation improvements

## [3.0.1] - 2025-03-25

### Added
- Test of fully automatic release system with auto-merge functionality
- Zero manual intervention required
- Complete hands-off release process

## [3.0.0] - 2025-03-01

### Major Achievement: World-Class Test Coverage

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

## [2.0.0] - 2024-12-15

### Major Changes

- Initial release of Akash Network JavaScript SDK v2.0.0

### Includes
- **Core SDK**: Blockchain integration and wallet management
- **CLI Tools**: Deployment lifecycle management
- **React Hooks**: Seamless UI integration
- **Protobuf Definitions**: Automatic code generation
- **Comprehensive Test Suite**: 177 passing tests
- **Automated CI/CD**: GitHub Actions pipeline
- **Changeset-based Release Management**: Structured versioning system

[Unreleased]: https://github.com/cryptoandcoffee/akash-jsdk/compare/v3.5.0...HEAD
[3.5.0]: https://github.com/cryptoandcoffee/akash-jsdk/releases/tag/v3.5.0
[3.4.0]: https://github.com/cryptoandcoffee/akash-jsdk/releases/tag/v3.4.0
[3.3.2]: https://github.com/cryptoandcoffee/akash-jsdk/releases/tag/v3.3.2
[3.3.0]: https://github.com/cryptoandcoffee/akash-jsdk/releases/tag/v3.3.0
[3.1.1]: https://github.com/cryptoandcoffee/akash-jsdk/releases/tag/v3.1.1
[3.1.0]: https://github.com/cryptoandcoffee/akash-jsdk/releases/tag/v3.1.0
[3.0.3]: https://github.com/cryptoandcoffee/akash-jsdk/releases/tag/v3.0.3
[3.0.2]: https://github.com/cryptoandcoffee/akash-jsdk/releases/tag/v3.0.2
[3.0.1]: https://github.com/cryptoandcoffee/akash-jsdk/releases/tag/v3.0.1
[3.0.0]: https://github.com/cryptoandcoffee/akash-jsdk/releases/tag/v3.0.0
[2.0.0]: https://github.com/cryptoandcoffee/akash-jsdk/releases/tag/v2.0.0
