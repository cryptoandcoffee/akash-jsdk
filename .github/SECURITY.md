# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 3.6.x   | :white_check_mark: |
| 3.5.x   | :white_check_mark: |
| 3.4.x   | :white_check_mark: |
| < 3.4   | :x:                |

## Reporting a Vulnerability

The Akash JSDK team takes security bugs seriously. We appreciate your efforts to responsibly disclose your findings, and will make every effort to acknowledge your contributions.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via:

1. **GitHub Security Advisories**: [Create a security advisory](https://github.com/cryptoandcoffee/akash-jsdk/security/advisories/new)
2. **Email**: If you prefer email, send details to the repository maintainers via GitHub

Include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

After you submit a report, we will:

1. **Acknowledge** your report within 48 hours
2. **Investigate** the issue and determine its impact
3. **Develop** a fix for the vulnerability
4. **Release** a patched version following our security release process
5. **Credit** you in the security advisory (if desired)

### Security Release Process

1. The security report is received and assigned to a primary handler
2. The problem is confirmed and a list of affected versions is determined
3. Code is audited to find any similar problems
4. Fixes are prepared for all supported versions
5. A security advisory is published
6. Patched versions are released to npm

## Security Best Practices

### For Users

When using the Akash JSDK:

1. **Keep Updated**: Always use the latest stable version
2. **Validate Input**: Sanitize all user inputs before passing to SDK methods
3. **Secure Keys**: Never commit private keys or mnemonics to version control
4. **Use Environment Variables**: Store sensitive configuration in environment variables
5. **Review Dependencies**: Regularly audit your dependencies with `pnpm audit`

### For Contributors

When contributing code:

1. **Input Validation**: Always validate user inputs
2. **Error Handling**: Never expose sensitive information in error messages
3. **Dependencies**: Keep dependencies up-to-date and audit for vulnerabilities
4. **Code Review**: All changes must pass security review
5. **Testing**: Include security-focused tests for new features

## Known Security Considerations

### Private Key Management

The SDK handles sensitive cryptographic material. Users must:

- **Never** hardcode private keys in source code
- Use secure key management systems in production
- Implement proper access controls for wallet functionality
- Rotate keys regularly

### JWT Authentication

When using JWT authentication (AEP-63):

- Tokens should have appropriate expiration times
- Use secure token storage mechanisms
- Implement token rotation for long-running applications
- Validate token signatures on the server side

### Network Communication

All blockchain interactions should:

- Use HTTPS endpoints in production
- Verify TLS certificates
- Implement request signing where required
- Handle rate limiting gracefully

### Dependency Security

We use automated tools to monitor dependencies:

- **Renovate Bot**: Automated dependency updates
- **GitHub Dependabot**: Security vulnerability alerts
- **npm audit**: Manual security audits

## Security Disclosure Timeline

We aim to handle security reports on the following timeline:

- **Day 0**: Report received
- **Day 1-2**: Initial acknowledgment and triage
- **Day 3-7**: Investigation and fix development
- **Day 7-14**: Testing and verification
- **Day 14-21**: Coordinated disclosure and release
- **Day 21+**: Public disclosure (if applicable)

Actual timelines may vary based on severity and complexity.

## Bug Bounty

We currently do not have a bug bounty program. However, we deeply appreciate responsible disclosure and will acknowledge contributors in our security advisories.

## Contact

For questions about this security policy, please open an issue or discussion on GitHub.

## Acknowledgments

We thank the following security researchers for responsibly disclosing vulnerabilities:

(List will be updated as reports are received and addressed)

---

**Last Updated**: 2025-11-14
