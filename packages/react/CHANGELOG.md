# @cryptoandcoffee/akash-jsdk-react

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
