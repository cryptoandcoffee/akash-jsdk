---
"@cryptoandcoffee/akash-jsdk-core": patch
"@cryptoandcoffee/akash-jsdk-cli": patch
"@cryptoandcoffee/akash-jsdk-react": patch
"@cryptoandcoffee/akash-jsdk-protobuf": patch
---

# Test automated release process

This changeset tests that GitHub Actions properly handles:
- Building packages
- Version bumping
- NPM publishing
- GitHub release creation

All through CI/CD automation.
EOF < /dev/null