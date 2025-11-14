# @cryptoandcoffee/akash-jsdk-protobuf

Protobuf type definitions for Akash Network using @bufbuild/protobuf v2.

## Overview

This package provides TypeScript type definitions generated from Akash Network protobuf schemas using the modern @bufbuild/protobuf v2 library. It includes types for deployments, leases, providers, certificates, and all Akash-specific messages.

**Important**: This package uses @bufbuild/protobuf v2, which has significant differences from v1. Most notably, **serialization is NOT supported in v2** - this package provides type definitions only.

## Installation

```bash
npm install @cryptoandcoffee/akash-jsdk-protobuf
```

## What's Included

### Akash Types

All Akash Network protobuf types from the following modules:

- **Deployment**: Deployment messages and types
- **Market**: Order, bid, and lease types
- **Provider**: Provider registration and attributes
- **Certificate**: Certificate types (legacy)
- **Escrow**: Escrow account types (AEP-75 multi-depositor support)
- **Audit**: Provider audit types
- **Inflation**: Inflation parameter types

### Cosmos SDK Types

Common Cosmos SDK types used throughout the Akash ecosystem:

- **Base**: Coin, DecCoin, and other base types
- **Auth**: Account types
- **Bank**: Bank message types
- **Staking**: Validator and delegation types
- **Distribution**: Reward distribution types
- **Gov**: Governance types

### IBC Types

IBC (Inter-Blockchain Communication) protocol types:

- **Transfer**: IBC transfer messages
- **Channel**: Channel types
- **Client**: Client types

## Usage

### Importing Types

```typescript
import {
  Deployment,
  DeploymentID,
  Lease,
  LeaseID,
  Order,
  OrderID,
  Bid,
  BidID,
  Provider,
  Certificate,
  EscrowAccount
} from '@cryptoandcoffee/akash-jsdk-protobuf'
```

### Type Examples

#### Deployment Types

```typescript
import { Deployment, DeploymentID } from '@cryptoandcoffee/akash-jsdk-protobuf'

// DeploymentID uniquely identifies a deployment
const deploymentId: DeploymentID = {
  owner: 'akash1...',
  dseq: '12345'
}

// Deployment contains full deployment information
const deployment: Deployment = {
  deploymentId: {
    owner: 'akash1...',
    dseq: '12345'
  },
  state: 1, // active
  version: Buffer.from('...'),
  createdAt: BigInt(Date.now())
}
```

#### Lease Types

```typescript
import { Lease, LeaseID } from '@cryptoandcoffee/akash-jsdk-protobuf'

// LeaseID uniquely identifies a lease
const leaseId: LeaseID = {
  owner: 'akash1...',
  dseq: '12345',
  gseq: 1,
  oseq: 1,
  provider: 'akash1provider...'
}

// Lease contains full lease information
const lease: Lease = {
  leaseId: {
    owner: 'akash1...',
    dseq: '12345',
    gseq: 1,
    oseq: 1,
    provider: 'akash1provider...'
  },
  state: 1, // active
  price: {
    denom: 'uakt',
    amount: '100'
  },
  createdAt: BigInt(Date.now())
}
```

#### Provider Types

```typescript
import { Provider, ProviderInfo } from '@cryptoandcoffee/akash-jsdk-protobuf'

const provider: Provider = {
  owner: 'akash1provider...',
  hostUri: 'https://provider.akash.network',
  attributes: [
    { key: 'region', value: 'us-west' },
    { key: 'tier', value: 'datacenter' }
  ],
  info: {
    email: 'admin@provider.com',
    website: 'https://provider.com'
  }
}
```

#### Escrow Types (AEP-75)

```typescript
import { EscrowAccount, AccountID } from '@cryptoandcoffee/akash-jsdk-protobuf'

// Multi-depositor escrow account
const escrowAccount: EscrowAccount = {
  id: {
    scope: 'deployment',
    xid: '12345'
  },
  owner: 'akash1...',
  state: 1, // open
  balance: {
    denom: 'uakt',
    amount: '5000000'
  },
  transferred: {
    denom: 'uakt',
    amount: '0'
  },
  settledAt: BigInt(0),
  depositor: 'akash1depositor...', // Primary depositor
  funds: {
    denom: 'uakt',
    amount: '5000000'
  }
}
```

#### Cosmos SDK Types

```typescript
import { Coin, DecCoin } from '@cryptoandcoffee/akash-jsdk-protobuf'

const coin: Coin = {
  denom: 'uakt',
  amount: '1000000' // 1 AKT
}

const decCoin: DecCoin = {
  denom: 'uakt',
  amount: '1000000.5'
}
```

## Important Notes About @bufbuild/protobuf v2

### Serialization NOT Supported

**@bufbuild/protobuf v2 does NOT support serialization.** This package provides type definitions only.

If you need to:
- Serialize messages to binary
- Create protobuf wire format
- Encode/decode from bytes

You should use one of these alternatives:
1. **@cosmjs/proto-signing** - For Cosmos SDK messages
2. **@bufbuild/protobuf v1** - For full serialization support
3. **protobufjs** - Classic protobuf library

### Type-Only Package

This package is designed to provide TypeScript types for:
- Type checking
- IntelliSense/autocomplete
- Documentation
- Interface definitions

```typescript
// ✅ Supported: Type definitions
const deployment: Deployment = {
  deploymentId: { owner: 'akash1...', dseq: '12345' },
  state: 1,
  version: Buffer.from('...'),
  createdAt: BigInt(Date.now())
}

// ❌ NOT Supported: Serialization
// const bytes = Deployment.encode(deployment).finish() // Not available in v2
```

### Migration from v1

If you're migrating from @bufbuild/protobuf v1:

**v1 (with serialization):**
```typescript
import { Deployment } from './generated/akash/deployment/v1beta3/deployment_pb'

// Encode to bytes
const bytes = Deployment.encode(deployment).finish()

// Decode from bytes
const decoded = Deployment.decode(bytes)
```

**v2 (type definitions only):**
```typescript
import { Deployment } from '@cryptoandcoffee/akash-jsdk-protobuf'

// Use as TypeScript types
const deployment: Deployment = {
  deploymentId: { owner: 'akash1...', dseq: '12345' },
  state: 1,
  version: Buffer.from('...'),
  createdAt: BigInt(Date.now())
}

// For serialization, use @cosmjs/proto-signing or other libraries
```

## Available Types

### Akash Deployment Module

- `Deployment` - Deployment message
- `DeploymentID` - Deployment identifier
- `DeploymentFilters` - Deployment query filters
- `GroupSpec` - Group specification
- `GroupID` - Group identifier

### Akash Market Module

- `Order` - Order message
- `OrderID` - Order identifier
- `OrderFilters` - Order query filters
- `Bid` - Bid message
- `BidID` - Bid identifier
- `BidFilters` - Bid query filters
- `Lease` - Lease message
- `LeaseID` - Lease identifier
- `LeaseFilters` - Lease query filters
- `MsgCreateBid` - Create bid message
- `MsgCloseBid` - Close bid message
- `MsgCreateLease` - Create lease message (internal)
- `MsgWithdrawLease` - Withdraw lease message
- `MsgCloseLease` - Close lease message

### Akash Provider Module

- `Provider` - Provider message
- `ProviderInfo` - Provider information
- `MsgCreateProvider` - Create provider message
- `MsgUpdateProvider` - Update provider message
- `MsgDeleteProvider` - Delete provider message

### Akash Escrow Module (AEP-75)

- `EscrowAccount` - Escrow account message
- `AccountID` - Account identifier
- `FractionalPayment` - Fractional payment message
- `MsgDepositDeployment` - Deposit to deployment message

### Akash Certificate Module (Legacy)

- `Certificate` - Certificate message
- `CertificateID` - Certificate identifier
- `CertificateFilter` - Certificate query filters
- `MsgCreateCertificate` - Create certificate message
- `MsgRevokeCertificate` - Revoke certificate message

### Cosmos SDK Types

- `Coin` - Coin type
- `DecCoin` - Decimal coin type
- `BaseAccount` - Base account type
- `ModuleAccount` - Module account type
- `MsgSend` - Bank send message
- `Validator` - Validator type
- `Delegation` - Delegation type
- `Redelegation` - Redelegation type
- `UnbondingDelegation` - Unbonding delegation type

### IBC Types

- `MsgTransfer` - IBC transfer message
- `Height` - IBC height type
- `Channel` - Channel type
- `IdentifiedChannel` - Identified channel type

## Development

### Building from Proto Files

The package includes scripts to download and generate types from Akash proto files:

```bash
# Download proto files
npm run proto:download

# Generate TypeScript types
npm run proto:generate

# Build package
npm run build
```

### Proto File Sources

Proto files are sourced from:
- **Akash Network**: https://github.com/akash-network/node
- **Cosmos SDK**: https://github.com/cosmos/cosmos-sdk
- **IBC Protocol**: https://github.com/cosmos/ibc-go

## TypeScript Configuration

This package is built with TypeScript 5.3+ and exports full type definitions:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true
  }
}
```

## Requirements

- **Node.js**: 18+ (ESM modules required)
- **TypeScript**: 5.3+ (recommended)
- **@bufbuild/protobuf**: ^2.10.0

## Compatibility

This package is compatible with:
- **@cryptoandcoffee/akash-jsdk-core** v3.6.1+
- **@cosmjs/stargate** v0.32.0+
- **@cosmjs/proto-signing** v0.32.0+

## Best Practices

1. **Use for Type Safety**: Import types for TypeScript type checking and IntelliSense
2. **Don't Use for Serialization**: Use @cosmjs/proto-signing or other libraries for encoding/decoding
3. **Keep Updated**: Update regularly to get new Akash Network types
4. **Import Specific Types**: Import only the types you need to minimize bundle size

```typescript
// ✅ Good: Import specific types
import { Deployment, Lease } from '@cryptoandcoffee/akash-jsdk-protobuf'

// ❌ Avoid: Import everything
import * as Protobuf from '@cryptoandcoffee/akash-jsdk-protobuf'
```

## Troubleshooting

### Type Errors

If you encounter type errors:
1. Ensure TypeScript 5.3+ is installed
2. Check that `@bufbuild/protobuf` version matches (^2.10.0)
3. Verify `moduleResolution` is set to `bundler` or `node16`

### Missing Types

If types are missing:
1. Check the package version
2. Update to latest version
3. Open an issue on GitHub

### Build Errors

If build fails:
1. Clear node_modules and reinstall
2. Run `npm run clean && npm run build`
3. Check Node.js version (18+ required)

## Support

- **Documentation**: [Main README](../../README.md)
- **Core SDK**: [Core Package](../core/README.md)
- **Issues**: [GitHub Issues](https://github.com/cryptoandcoffee/akash-jsdk/issues)

## License

Apache License 2.0

---

**Part of the Akash JSDK v3.6.1 - Modern Protobuf Type Definitions**
