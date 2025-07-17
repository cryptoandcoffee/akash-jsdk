# Security Policy

## Supported Versions

We actively support the following versions of the Akash JSDK:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability in the Akash JSDK, please report it to us as described below.

### Private Disclosure Process

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email security details to: [security@cryptoandcoffee.com](mailto:security@cryptoandcoffee.com)
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **24 hours**: Initial response acknowledging the report
- **72 hours**: Preliminary assessment and severity classification
- **1 week**: Detailed investigation and mitigation plan
- **2 weeks**: Security patch development and testing
- **Release**: Coordinated disclosure with security advisory

## Security Features

### Supply Chain Security

- **NPM Provenance**: All packages published with provenance attestation
- **Dependency Scanning**: Automated vulnerability detection with Snyk
- **Regular Audits**: Weekly dependency security audits
- **Minimal Dependencies**: Carefully curated dependency tree

### Code Security

- **TypeScript Strict Mode**: Compile-time safety checks
- **ESLint Security Rules**: Automated security linting
- **No Hardcoded Secrets**: All sensitive data via environment variables
- **Input Validation**: Comprehensive parameter validation

### Build Security

- **Reproducible Builds**: Locked dependencies and deterministic builds
- **CI Security**: Isolated build environments with minimal permissions
- **Code Signing**: GitHub Actions provenance and signing
- **Security Scanning**: Automated container and dependency scanning

## Best Practices for Users

### Wallet Security

```typescript
// ✅ Good: Secure wallet handling
const wallet = new WalletManager({
  type: 'keplr',
  // Never hardcode mnemonics or private keys
  autoConnect: false
})

// ❌ Bad: Exposing sensitive data
const wallet = new WalletManager({
  mnemonic: 'word1 word2 ...' // Never do this!
})
```

### Network Configuration

```typescript
// ✅ Good: Use environment variables
const sdk = new AkashSDK({
  rpcEndpoint: process.env.AKASH_RPC_ENDPOINT,
  chainId: process.env.AKASH_CHAIN_ID
})

// ❌ Bad: Hardcoded endpoints
const sdk = new AkashSDK({
  rpcEndpoint: 'https://my-secret-rpc.com'
})
```

### Error Handling

```typescript
// ✅ Good: Safe error handling
try {
  await sdk.deployments.create(config)
} catch (error) {
  // Don't log sensitive data
  console.error('Deployment failed:', error.message)
}

// ❌ Bad: Exposing sensitive data in logs
try {
  await sdk.deployments.create(config)
} catch (error) {
  console.error('Failed with config:', config) // May contain secrets
}
```

## Vulnerability Classifications

### Critical (9.0-10.0)
- Remote code execution
- Privilege escalation
- Data exposure of private keys/mnemonics

### High (7.0-8.9)
- Authentication bypass
- Unauthorized access to funds
- Significant data exposure

### Medium (4.0-6.9)
- Denial of service
- Information disclosure
- Cross-site scripting (XSS)

### Low (1.0-3.9)
- Minor information disclosure
- Non-exploitable vulnerabilities

## Security Contacts

- **Primary**: security@cryptoandcoffee.com
- **GitHub**: @cryptoandcoffee
- **PGP Key**: Available on request

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who report vulnerabilities through proper channels.

### Hall of Fame

*Security researchers who have helped improve the Akash JSDK will be listed here.*

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Guidelines](https://nodejs.org/en/docs/guides/security/)
- [Cosmos SDK Security](https://docs.cosmos.network/main/security)
- [Akash Network Security](https://docs.akash.network/security)

---

*This security policy is regularly reviewed and updated. Last updated: 2025*