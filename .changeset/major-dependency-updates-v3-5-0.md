---
"@cryptoandcoffee/akash-jsdk-core": minor
"@cryptoandcoffee/akash-jsdk-cli": minor
"@cryptoandcoffee/akash-jsdk-protobuf": minor
"@cryptoandcoffee/akash-jsdk-react": minor
---

Major dependency updates and framework compatibility improvements

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
- All 888 core SDK tests passing
- Verified compatibility with upgraded dependencies

**Note:** @bufbuild/protobuf v2 is a breaking change but doesn't affect SDK users since protobuf serialization was never part of the public API
