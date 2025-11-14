# Contributing to Akash JSDK

Thank you for your interest in contributing to the Akash JavaScript SDK! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a new branch for your feature or bugfix
4. Make your changes
5. Test your changes
6. Submit a pull request

## Development Setup

### Prerequisites

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **Git**: Latest version

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/akash-jsdk.git
cd akash-jsdk

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feat/your-feature-name` - For new features
- `fix/bug-description` - For bug fixes
- `docs/update-description` - For documentation updates
- `chore/task-description` - For maintenance tasks

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `chore`: Maintenance tasks
- `test`: Test updates
- `refactor`: Code refactoring
- `perf`: Performance improvements

**Examples:**
```
feat(core): add support for multi-depositor escrow

fix(cli): resolve deployment status query error

docs(react): update hooks usage examples
```

## Submitting Changes

### Pull Request Process

1. **Update Documentation**: Ensure README and relevant docs are updated
2. **Add Tests**: Include tests for new features or bug fixes
3. **Run Tests**: Verify all tests pass (`pnpm test`)
4. **Build**: Ensure build succeeds (`pnpm build`)
5. **Lint**: Fix any linting issues
6. **Create Changeset**: Run `pnpm changeset` to document your changes
7. **Submit PR**: Create a pull request with a clear description

### Pull Request Template

Your PR should include:
- **Description**: What does this PR do?
- **Motivation**: Why is this change needed?
- **Testing**: How was this tested?
- **Breaking Changes**: Any breaking changes?
- **Related Issues**: Link to related issues

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` types when possible
- Document public APIs with JSDoc comments

### Style Guide

We use automated formatting:

```bash
# Format code
pnpm format

# Check formatting
pnpm lint
```

**Key Points:**
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multiline

### File Organization

```
packages/
  core/
    src/
      modules/      # Feature modules
      types/        # TypeScript types
      utils/        # Utility functions
      providers/    # Provider implementations
    test/           # Test files
```

## Testing

### Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Specific package
cd packages/core && pnpm test

# Coverage
pnpm test --coverage
```

### Writing Tests

- **Unit Tests**: Test individual functions/classes
- **Integration Tests**: Test module interactions
- **E2E Tests**: Test full workflows

**Example:**

```typescript
import { describe, it, expect } from 'vitest'
import { DeploymentManager } from '../src/modules/deployments'

describe('DeploymentManager', () => {
  it('should create deployment', async () => {
    const manager = new DeploymentManager(/* ... */)
    const result = await manager.createDeployment(config)
    expect(result).toBeDefined()
  })
})
```

### Test Coverage

We maintain high test coverage:
- **Core**: > 90%
- **CLI**: > 85%
- **React**: > 90%
- **Protobuf**: > 90%

## Documentation

### Code Documentation

Use JSDoc for public APIs:

```typescript
/**
 * Create a new deployment on Akash Network
 *
 * @param config - Deployment configuration
 * @param wallet - Wallet for signing transactions
 * @returns Promise resolving to deployment ID
 * @throws {ValidationError} If configuration is invalid
 * @throws {NetworkError} If blockchain interaction fails
 */
async createDeployment(
  config: DeploymentConfig,
  wallet: OfflineSigner
): Promise<DeploymentID>
```

### README Updates

Update README files when:
- Adding new features
- Changing APIs
- Adding dependencies
- Updating requirements

### Changelog

We use [changesets](https://github.com/changesets/changesets) for changelog management:

```bash
# Create a changeset
pnpm changeset

# Follow prompts to document your changes
```

## Package-Specific Guidelines

### Core Package

- All blockchain interactions must use `SigningStargateClient`
- REST API queries for state retrieval
- Comprehensive error handling required
- Real transaction broadcasting only

### React Package

- Hooks must be pure (no side effects in render)
- Use React 18+ features (concurrent mode safe)
- Provide TypeScript types for all props/returns
- Include usage examples in JSDoc

### CLI Package

- Interactive prompts with `inquirer`
- Colored output with `chalk`
- Progress indicators with `ora`
- Comprehensive help text
- Error messages must be user-friendly

### Protobuf Package

- Generated code from official Akash protos
- Type-only definitions (no serialization)
- Compatible with `@bufbuild/protobuf` v2
- Keep in sync with Akash Network releases

## Questions?

- **Issues**: [GitHub Issues](https://github.com/cryptoandcoffee/akash-jsdk/issues)
- **Discussions**: [GitHub Discussions](https://github.com/cryptoandcoffee/akash-jsdk/discussions)

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.

---

**Thank you for contributing to Akash JSDK!** 🚀
