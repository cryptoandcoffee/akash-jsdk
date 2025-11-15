---
'@cryptoandcoffee/akash-jsdk-core': minor
---

Add comprehensive Protobuf message type registration for full CosmJS compatibility

Implements proper message type registration for all Akash-specific message types in the Protobuf Registry. This ensures complete compatibility with CosmJS's signing and encoding requirements for production use.

**Key Features:**
- Created `createAkashRegistry()` utility function that registers all Akash message types
- Registers 14 Akash-specific message types across all modules:
  - Deployment messages (MsgCreateDeployment, MsgUpdateDeployment, MsgCloseDeployment, MsgDepositDeployment)
  - Market messages (MsgCreateBid, MsgCloseBid, MsgCreateLease, MsgCloseLease, MsgWithdrawLease)
  - Provider messages (MsgCreateProvider, MsgUpdateProvider, MsgDeleteProvider)
  - Certificate messages (MsgCreateCertificate, MsgRevokeCertificate)
- Includes helper functions for registry validation and message type checking
- Updated all 8 Registry instantiations across 4 modules to use the new utility

**Impact:**
- Eliminates "Unregistered type url" errors when broadcasting Akash transactions
- Provides full compatibility with CosmJS Protobuf encoding/decoding
- Enables production-ready transaction signing for all Akash message types
- Maintains backward compatibility while adding robust message type support

**Files Modified:**
- `packages/core/src/utils/registry.ts` (new) - Core registry utility with all Akash message types
- `packages/core/src/modules/deployments.ts` - Updated to use createAkashRegistry()
- `packages/core/src/modules/batch.ts` - Updated both executeBatch and simulateBatch
- `packages/core/src/modules/staking.ts` - Updated all delegate/undelegate/redelegate/withdraw methods
- `packages/core/src/modules/ibc.ts` - Updated IBC transfer method
- Test files - Updated mocks for proper Registry testing
