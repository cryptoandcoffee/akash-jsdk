---
'@cryptoandcoffee/akash-jsdk-core': patch
---

Fix critical Registry initialization issue that caused 'Unregistered type url' errors

The SDK was creating empty Protobuf Registry instances without any message type definitions, which caused CosmJS to throw "Unregistered type url" errors when broadcasting transactions. All Registry instances now initialize with defaultRegistryTypes from @cosmjs/stargate, providing support for standard Cosmos message types.

Fixed in modules:
- deployments.ts (1 instance)
- batch.ts (2 instances)
- staking.ts (4 instances)
- ibc.ts (1 instance)
