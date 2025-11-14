---
"@cryptoandcoffee/akash-jsdk-core": patch
"@cryptoandcoffee/akash-jsdk-cli": patch
"@cryptoandcoffee/akash-jsdk-protobuf": patch
"@cryptoandcoffee/akash-jsdk-react": patch
---

Documentation overhaul and technical debt cleanup

**Documentation Updates:**
- Created comprehensive CLI README (405 lines) with all commands, options, and examples
- Created complete React README (510 lines) documenting all hooks and components
- Created Protobuf README (485 lines) with @bufbuild/protobuf v2 usage and migration guide
- Created unified root CHANGELOG covering all versions (v2.0.0 → v3.5.0)
- Fixed PRODUCTION_READINESS.md to accurately reflect production-ready status of Batch, IBC, and Staking modules
- Updated core README to remove misleading ALPHA warnings
- Fixed package names in all user guides (@cryptoandcoffee/akash-jsdk-*)
- Updated root README version references (v3.0 → v3.5.0) and test statistics (1,280 tests)

**Technical Debt Cleanup:**
- Removed 11 debug console statements from core modules
- Removed outdated @todo comments
- Refactored 2 tests for better coverage
- Net code reduction: 30 lines

**Impact:**
- All documentation now synchronized with v3.5.0 codebase
- Complete package documentation coverage (CLI, React, Protobuf)
- Cleaner production logs (no debug noise)
- Accurate production readiness information for all modules
- 1,900+ lines of new documentation added

All 1,280 tests passing (100%) - no breaking changes.
