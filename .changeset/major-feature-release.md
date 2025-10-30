---
'@cryptoandcoffee/akash-jsdk-core': minor
'@cryptoandcoffee/akash-jsdk-react': patch
'@cryptoandcoffee/akash-jsdk-cli': patch
'@cryptoandcoffee/akash-jsdk-protobuf': patch
---

Major feature release with 5 new modules and enhanced functionality

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
