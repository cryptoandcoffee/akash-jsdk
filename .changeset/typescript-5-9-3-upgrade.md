---
"@cryptoandcoffee/akash-jsdk-core": minor
"@cryptoandcoffee/akash-jsdk-cli": minor
"@cryptoandcoffee/akash-jsdk-protobuf": minor
"@cryptoandcoffee/akash-jsdk-react": minor
---

Upgrade TypeScript to 5.9.3 and implement real blockchain transactions

- **TypeScript 5.9.3**: Upgraded from 5.3.3 across all packages with strict type checking fixes
- **Real Blockchain Implementation**: Batch, IBC, and Staking modules now use real SigningStargateClient for transaction broadcasting
  - Real gas simulation via client.simulate()
  - Transaction confirmation polling with waitForConfirmation()
  - REST API queries for blockchain state
- **Production Ready**: All modules marked production-ready, removed "ALPHA - Mock Implementation" warnings
- All 1,288 tests passing
