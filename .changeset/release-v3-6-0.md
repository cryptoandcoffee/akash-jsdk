---
"@cryptoandcoffee/akash-jsdk-core": patch
"@cryptoandcoffee/akash-jsdk-cli": patch
"@cryptoandcoffee/akash-jsdk-protobuf": patch
"@cryptoandcoffee/akash-jsdk-react": patch
---

Release v3.6.0 - Fix automated publishing workflow

This release ensures proper npm package publication through GitHub Actions workflow. Previous v3.5.1 packages were versioned but not published to npm registry. This patch release triggers the automated publish workflow to ensure all packages are available on npm.

No code changes - workflow fix only.
