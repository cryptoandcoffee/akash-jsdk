---
"@cryptoandcoffee/akash-jsdk-core": patch
---

Fix transaction signing to use Direct (Protobuf) mode instead of Amino

**Breaking Change**: None - All modern wallets support Direct signing

**Changes**:
- Replace `Secp256k1HdWallet` (Amino signer) with `DirectSecp256k1HdWallet` (Direct signer)
- Update imports from `@cosmjs/amino` to `@cosmjs/proto-signing`
- Fixes signing failures for Akash-specific messages that weren't registered in AminoTypes

**Why This Fix**:
- Amino signing requires AminoTypes registration for custom messages
- Akash messages (`/akash.deployment.v1beta3.MsgCreateDeployment`, etc.) were not registered
- Direct signing uses Protobuf encoding and doesn't require Amino converters
- All modern wallets (Keplr, Leap, Cosmostation) support Direct signing
- Akash Mainnet 14 supports Direct signing
- More efficient (smaller tx size, faster processing)

**Impact**:
- ✅ Fixes "Type URL does not exist in Amino message type register" errors
- ✅ Works with all modern Cosmos wallets
- ✅ Compatible with Akash Network Mainnet 14
- ✅ All 1,280 tests passing

**Files Modified**:
- `packages/core/src/modules/deployments.ts` - Updated to DirectSecp256k1HdWallet
- `packages/core/src/modules/wallet.ts` - Updated MnemonicWallet implementation
