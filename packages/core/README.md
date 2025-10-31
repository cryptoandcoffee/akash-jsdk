# @cryptoandcoffee/akash-jsdk-core

Core SDK for Akash Network with deployment, market, provider, and wallet management.

## ⚠️ CRITICAL: Production Readiness Status

**This package contains modules with varying levels of production readiness. Read carefully before using in production.**

### ❌ NOT Production Ready - ALPHA Modules with Mock Implementations

The following modules contain **MOCK IMPLEMENTATIONS** and **DO NOT** interact with the blockchain:

#### Batch Operations Module (`BatchManager`, `BatchBuilder`)
- **Status**: ⚠️ ALPHA - Mock Implementation
- **What works**: Fluent API, validation, structure
- **What doesn't work**:
  - ❌ `BatchBuilder.execute()` - Returns mock transaction hash, does NOT broadcast to chain
  - ❌ `BatchManager.executeBatch()` - Simulates execution without blockchain interaction
  - ❌ `BatchManager.simulateBatch()` - Returns mock gas estimates
  - ❌ `BatchManager.getTransactionDetails()` - Returns mock transaction data
- **Required for production**: Real `@cosmjs/stargate` integration, actual protobuf message creation, real transaction broadcasting
- **Runtime warnings**: Enabled in development/test environments

#### IBC Module (`IBCManager`)
- **Status**: ⚠️ ALPHA - Mock Implementation
- **What works**: Parameter validation, timeout calculations, type-safe structures
- **What doesn't work**:
  - ❌ `IBCManager.transfer()` - Returns mock transaction, does NOT execute IBC transfer
  - ❌ `IBCManager.getChannels()` - Returns mock channel data
  - ❌ `IBCManager.getChannel()` - Returns mock channel info
  - ❌ `IBCManager.getTransferStatus()` - Returns mock status
  - ❌ `IBCManager.getDenomTrace()` - Returns hardcoded mock data
- **Required for production**: Real IBC client integration, actual channel queries, real transfer execution
- **Runtime warnings**: Enabled in development/test environments

#### Staking Module (`StakingManager`)
- **Status**: ⚠️ ALPHA - Mock Implementation
- **What works**: Parameter validation, type-safe structures, unbonding time calculations
- **What doesn't work**:
  - ❌ `StakingManager.delegate()` - Returns mock transaction, does NOT stake tokens
  - ❌ `StakingManager.undelegate()` - Returns mock transaction, does NOT undelegate
  - ❌ `StakingManager.redelegate()` - Returns mock transaction, does NOT redelegate
  - ❌ `StakingManager.getValidators()` - Returns mock validator data
  - ❌ `StakingManager.getValidator()` - Returns mock validator info
  - ❌ `StakingManager.getDelegations()` - Returns mock delegation data
  - ❌ `StakingManager.getUnbondingDelegations()` - Returns mock data
  - ❌ `StakingManager.getRedelegations()` - Returns mock data
  - ❌ `StakingManager.getRewards()` - Returns mock rewards data
  - ❌ `StakingManager.withdrawRewards()` - Returns mock transaction, does NOT withdraw
  - ❌ `StakingManager.withdrawAllRewards()` - Returns mock transaction, does NOT withdraw
  - ❌ `StakingManager.getPool()` - Returns hardcoded pool data
  - ❌ `StakingManager.getParams()` - Returns hardcoded parameters
- **Required for production**: Real staking module integration, actual transaction broadcasting, real query implementation
- **Runtime warnings**: Enabled in development/test environments

### ✅ Production Ready - Fully Implemented Modules

The following modules are **PRODUCTION READY** and fully interact with the blockchain:

- **DeploymentManager** - Complete deployment lifecycle management
- **MarketManager** - Marketplace operations including AEP-75 multi-depositor escrow
- **ProviderManager** - Provider interactions and manifest deployment
- **WalletManager** - Wallet integration (Keplr, Leap, Cosmostation, MetaMask Snap)
- **WalletAdapter** - Multi-wallet JWT authentication with ADR-36 signing
- **SDLManager** - SDL parsing, validation, and template generation
- **JWTAuthManager** - AEP-63 JWT authentication for Mainnet 14
- **CertificateManager** - Client certificate management (legacy)
- **EscrowManager** - AEP-75 multi-depositor escrow support
- **GovernanceManager** - Governance participation and voting
- **AuditManager** - Provider audit and certification

## Installation

```bash
npm install @cryptoandcoffee/akash-jsdk-core
```

## Usage

### Safe Production Usage

Use only the production-ready modules for applications handling real funds:

```typescript
import { AkashSDK } from '@cryptoandcoffee/akash-jsdk-core'

const sdk = new AkashSDK({
  rpcEndpoint: 'https://rpc.akashedge.com:443',
  apiEndpoint: 'https://api.akashedge.com:443',
  chainId: 'akashnet-2',
  gasPrice: '0.025uakt'
})

await sdk.connect()

// ✅ Safe to use in production
const deployments = await sdk.deployments.list('akash1...')
const providers = await sdk.providers.list()
const balance = await sdk.wallet.getBalance()

// ✅ Safe to use - AEP-63 JWT Auth (Mainnet 14)
import { WalletAdapter } from '@cryptoandcoffee/akash-jsdk-core'

const walletAdapter = new WalletAdapter()
const token = await walletAdapter.generateJWTWithKeplr(
  'akashnet-2',
  'akash1...',
  { expiresIn: 900, accessType: 'full' }
)
sdk.setAuthConfig({ method: 'jwt', jwtToken: token })

// ✅ Safe to use - AEP-75 Multi-Depositor Escrow (Mainnet 14)
const depositConfig = sdk.market.createDepositConfig(
  '5000000',
  'uakt',
  ['balance', 'grant'],
  ['akash1depositor1...', 'akash1depositor2...']
)
```

### ⚠️ Development/Testing Only - Mock Modules

**DO NOT use these in production:**

```typescript
// ❌ NOT SAFE - Mock implementation, does not execute real transactions
const batch = await sdk.batch.createBatch()
await batch
  .addDeployment(sdl)
  .addLease(dseq, provider)
  .execute() // Returns mock transaction hash!

// ❌ NOT SAFE - Mock implementation, does not execute real IBC transfer
const result = await sdk.ibc.transfer({
  sourceChannel: 'channel-0',
  token: { denom: 'uakt', amount: '1000000' },
  receiver: 'cosmos1...'
}) // Returns mock transaction!

// ❌ NOT SAFE - Mock implementation, does not stake real tokens
const result = await sdk.staking.delegate(
  'akashvaloper1...',
  { denom: 'uakt', amount: '1000000' }
) // Returns mock transaction!
```

## Identifying Mock Implementations

All mock methods include:

1. **JSDoc warnings** in TypeScript definitions:
```typescript
/**
 * @warning MOCK IMPLEMENTATION - Does not actually execute on blockchain
 * @todo Implement real transaction broadcasting using @cosmjs/stargate
 */
async executeBatch(): Promise<BatchResult>
```

2. **Runtime warnings** in development environments:
```
⚠️  WARNING: Using mock batch execution.
This will not execute real blockchain transactions.
Do not use in production.
See PRODUCTION_READINESS.md for details.
```

## When to Use Mock Modules

Mock modules ARE suitable for:
- ✅ **UI/UX Development** - Build interfaces without blockchain interaction
- ✅ **Unit Testing** - Test application logic with predictable mock data
- ✅ **Integration Testing** - Test workflows without real transactions
- ✅ **Prototyping** - Demonstrate functionality without real funds
- ✅ **SDK API Exploration** - Learn the SDK interface and structure

Mock modules are NOT suitable for:
- ❌ **Production Applications** - Any environment with real user funds
- ❌ **Testnet Deployments** - Requires actual blockchain interaction
- ❌ **End-to-End Testing** - Against real blockchain networks
- ❌ **Wallet Applications** - Handling real user assets

## Production Roadmap

See [PRODUCTION_READINESS.md](../../PRODUCTION_READINESS.md) for detailed roadmap:

- **v3.2.0** (2-3 weeks): Batch Operations production implementation
- **v3.3.0** (4-5 weeks): IBC Module production implementation
- **v3.4.0** (6-7 weeks): Staking Module production implementation
- **v3.5.0** (8-10 weeks): Production hardening and security audit

## API Documentation

### Production-Ready Modules

Full API documentation for production-ready modules is available in the main repository README.

### Mock Modules (Development Only)

#### BatchManager

```typescript
class BatchManager {
  // ⚠️ MOCK - All methods return mock data
  async createBatch(): Promise<BatchBuilder>
  async executeBatch(operations: EncodeObject[]): Promise<BatchResult>
  async simulateBatch(operations: EncodeObject[]): Promise<GasEstimate>
  async getTransactionDetails(txHash: string): Promise<TxDetails>
}
```

#### IBCManager

```typescript
class IBCManager {
  // ⚠️ MOCK - All methods return mock data
  async transfer(params: IBCTransferParams): Promise<IBCTransferResult>
  async getChannels(): Promise<Channel[]>
  async getChannel(channelId: string): Promise<Channel>
  async getTransferStatus(txHash: string): Promise<TransferStatus>
  async getDenomTrace(denom: string): Promise<DenomTrace | null>
}
```

#### StakingManager

```typescript
class StakingManager {
  // ⚠️ MOCK - All methods return mock data
  async delegate(validator: string, amount: Coin): Promise<StakingResult>
  async undelegate(validator: string, amount: Coin): Promise<StakingResult>
  async redelegate(src: string, dst: string, amount: Coin): Promise<StakingResult>
  async getValidators(status?: BondStatus): Promise<Validator[]>
  async getDelegations(delegator?: string): Promise<Delegation[]>
  async getRewards(delegator?: string): Promise<Rewards>
  async withdrawRewards(validator: string): Promise<StakingResult>
  // ... more mock methods
}
```

## Support

- **Documentation**: [Main README](../../README.md)
- **Production Status**: [PRODUCTION_READINESS.md](../../PRODUCTION_READINESS.md)
- **Issues**: [GitHub Issues](https://github.com/cryptoandcoffee/akash-jsdk/issues)
- **Security**: Report security issues via [SECURITY.md](../../SECURITY.md)

## License

Apache License 2.0

---

**⚠️ Remember: Only use production-ready modules in environments with real funds. Mock modules are for development and testing only.**
