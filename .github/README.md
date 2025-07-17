# GitHub Workflows & Automation

This directory contains GitHub Actions workflows and configuration for the Akash JSDK project.

## Workflows

### CI Pipeline (`ci.yml`)
- **Triggers**: Push to main, pull requests
- **Features**:
  - Matrix testing across Node.js 18.x, 20.x, 22.x
  - Multi-OS support (Ubuntu, Windows, macOS)
  - Changed package detection for efficient testing
  - Turborepo caching for fast builds
  - Comprehensive test coverage reporting
  - Security scanning with Snyk
  - Automated linting and formatting checks

### Release Pipeline (`release.yml`)
- **Triggers**: Push to main
- **Features**:
  - Changesets-powered semantic versioning
  - Automated NPM publishing with provenance
  - GitHub Packages publishing
  - GitHub Releases creation
  - Slack notifications
  - Post-release verification

### Documentation (`docs.yml`)
- **Triggers**: Changes to source files or docs
- **Features**:
  - TypeDoc API documentation generation
  - Coverage reports compilation
  - GitHub Pages deployment
  - Automatic documentation index creation

### Bundle Analysis (`bundle-analysis.yml`)
- **Triggers**: Pull requests, changes to packages
- **Features**:
  - Bundle size monitoring and limits
  - Performance benchmarking
  - PR comments with size analysis
  - Automated performance regression detection

## Configuration Files

### Renovate (`renovate.json`)
Automated dependency management:
- Weekly dependency updates
- Grouped updates by ecosystem
- Security vulnerability alerts
- Automerge for dev dependencies
- Manual review for major updates

### Code Owners (`CODEOWNERS`)
- Automated review assignments
- Package-specific ownership
- Documentation and configuration oversight

## Features

### 🚀 Performance Optimizations
- **Turborepo Caching**: Intelligent build and test caching
- **pnpm Workspaces**: Efficient dependency management
- **Matrix Optimization**: Selective OS/Node.js combinations
- **Changed Package Detection**: Only test affected packages

### 🔒 Security
- **Dependency Scanning**: Automated vulnerability detection
- **NPM Provenance**: Supply chain attestation
- **Security Audits**: Regular dependency auditing
- **CODEOWNERS**: Required reviews for sensitive changes

### 📊 Quality Gates
- **100% Test Coverage**: Enforced across all packages
- **TypeScript Strict**: Zero compilation errors
- **ESLint + Prettier**: Consistent code formatting
- **Bundle Size Limits**: Prevent bloated packages

### 🤖 Automation
- **Semantic Versioning**: Automated via Changesets
- **Release Notes**: Generated from conventional commits
- **Dependency Updates**: Renovate bot management
- **Documentation**: Auto-generated and deployed

### 📈 Monitoring
- **Bundle Analysis**: Size tracking and regression detection
- **Performance Benchmarks**: Import time and execution metrics
- **Coverage Tracking**: Codecov integration with badges
- **Build Metrics**: Execution time and cache hit rates

## Secrets Required

Set these secrets in your GitHub repository settings:

```bash
# NPM Publishing
NPM_TOKEN=npm_xxx...

# Optional: Enhanced features
CODECOV_TOKEN=xxx...      # Code coverage reporting
SNYK_TOKEN=xxx...         # Security scanning
SLACK_WEBHOOK_URL=xxx...  # Release notifications
GIST_SECRET=xxx...        # Coverage badges
GIST_ID=xxx...            # Coverage badge storage
```

## Usage

### Creating a Release
1. Make changes to packages
2. Run `pnpm changeset` to create changeset files
3. Commit and push to main
4. CI will create a release PR automatically
5. Review and merge the release PR to publish

### Monitoring
- View CI status in the Actions tab
- Check bundle sizes in PR comments
- Monitor dependencies in the Dependency Dashboard
- Review coverage reports on Codecov

### Development
- All PRs trigger full CI pipeline
- Failed checks block merging
- Renovate creates dependency update PRs weekly
- Documentation updates automatically on merge

This automation infrastructure ensures enterprise-grade quality, security, and maintainability for the Akash JSDK.