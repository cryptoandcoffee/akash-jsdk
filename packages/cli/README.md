# @cryptoandcoffee/akash-jsdk-cli

Command-line interface for Akash Network deployments and management operations.

## Installation

### Global Installation (Recommended)

```bash
npm install -g @cryptoandcoffee/akash-jsdk-cli
```

### Local Installation

```bash
npm install @cryptoandcoffee/akash-jsdk-cli
```

## Commands

### `init` - Initialize Project

Initialize a new Akash SDK project with interactive prompts.

```bash
akash-cli init [options]
```

**Options:**
- `-n, --name <name>` - Project name (default: "my-akash-app")
- `-f, --framework <framework>` - Framework choice: vanilla, react, next (default: "vanilla")

**Interactive Prompts:**
- Project name
- Framework (Vanilla JavaScript/TypeScript, React, Next.js)
- Akash RPC endpoint (default: `https://rpc.akashedge.com:443`)
- Chain ID (default: `akashnet-2`)

**Example:**

```bash
# Interactive mode
akash-cli init

# With options
akash-cli init --name my-project --framework react
```

**Generated Files:**
- `package.json` - Project dependencies
- `akash.config.json` - Akash SDK configuration
- Framework-specific starter files

---

### `deploy` - Deploy Application

Deploy an SDL file to Akash Network.

```bash
akash-cli deploy <sdl-file> [options]
```

**Arguments:**
- `<sdl-file>` - Path to SDL (Service Definition Language) file

**Options:**
- `-c, --config <path>` - Config file path (default: `.akash/config.json`)

**Example:**

```bash
# Deploy with default config
akash-cli deploy app.yml

# Deploy with custom config
akash-cli deploy app.yml --config /path/to/config.json
```

**Configuration File Format:**

```json
{
  "rpcEndpoint": "https://rpc.akashedge.com:443",
  "apiEndpoint": "https://api.akashedge.com:443",
  "chainId": "akashnet-2",
  "gasPrice": "0.025uakt"
}
```

**Output:**
```
✓ Connected to Akash Network
✓ Deployment created: 12345

✅ Deployment successful!
Deployment ID: 12345

Use "akash-cli status" to check deployment status
```

---

### `status` - Check Deployment Status

Check the status of deployments and leases for an owner address.

```bash
akash-cli status [options]
```

**Options:**
- `-o, --owner <address>` - Owner address (required)
- `-c, --config <path>` - Config file path (default: `.akash/config.json`)

**Example:**

```bash
akash-cli status --owner akash1...
```

**Output:**
```
✓ Connected to Akash Network

📊 Deployment Status

1. Deployment 12345
   Owner: akash1...
   State: active
   Created: 2025-11-14T12:00:00.000Z

💰 Active Leases

1. Lease 12345-1-1
   Provider: akash1provider...
   State: active
   Price: 100 uakt
```

---

### `close` - Close Deployment

Close an active deployment.

```bash
akash-cli close [options]
```

**Options:**
- `-o, --owner <address>` - Owner address (required)
- `-d, --deployment <dseq>` - Deployment sequence number
- `-y, --yes` - Skip confirmation prompt
- `-c, --config <path>` - Config file path (default: `.akash/config.json`)

**Examples:**

```bash
# Interactive mode - select deployment from list
akash-cli close --owner akash1...

# Close specific deployment with confirmation
akash-cli close --owner akash1... --deployment 12345

# Close without confirmation
akash-cli close --owner akash1... --deployment 12345 --yes
```

**Interactive Selection:**
```
✓ Connected to Akash Network
? Select deployment to close:
  12345 (active)
> 12346 (active)
  12347 (closed)
```

**Confirmation Prompt:**
```
? Are you sure you want to close deployment 12345? (y/N)
```

**Output:**
```
✓ Connected to Akash Network
✓ Deployment 12345 closed successfully

✅ Deployment closed!
```

---

## Configuration

### Default Configuration File

The CLI looks for configuration in `.akash/config.json` by default. You can override this with the `--config` option on any command.

**Location:**
```
.akash/config.json
```

**Format:**
```json
{
  "rpcEndpoint": "https://rpc.akashedge.com:443",
  "apiEndpoint": "https://api.akashedge.com:443",
  "chainId": "akashnet-2",
  "gasPrice": "0.025uakt"
}
```

### Environment-Specific Configurations

Create multiple configuration files for different environments:

```bash
# Production
akash-cli deploy app.yml --config .akash/config.production.json

# Testnet
akash-cli deploy app.yml --config .akash/config.testnet.json

# Development
akash-cli deploy app.yml --config .akash/config.dev.json
```

**Example Testnet Config:**
```json
{
  "rpcEndpoint": "https://rpc.sandbox-01.aksh.pw:443",
  "apiEndpoint": "https://api.sandbox-01.aksh.pw:443",
  "chainId": "sandbox-01",
  "gasPrice": "0.025uakt"
}
```

---

## SDL File Format

The CLI requires SDL (Service Definition Language) files for deployments. Here's a basic example:

```yaml
version: "2.0"

services:
  web:
    image: nginx:latest
    expose:
      - port: 80
        as: 80
        to:
          - global: true

profiles:
  compute:
    web:
      resources:
        cpu:
          units: 0.5
        memory:
          size: 512Mi
        storage:
          size: 1Gi

  placement:
    westcoast:
      attributes:
        host: akash
      pricing:
        web:
          denom: uakt
          amount: 1000

deployment:
  web:
    westcoast:
      profile: web
      count: 1
```

For more SDL examples and documentation, see the [Akash SDL Documentation](https://docs.akash.network/readme/stack-definition-language).

---

## Error Handling

The CLI provides clear error messages for common issues:

**Connection Errors:**
```
✗ Deployment failed
Error: Failed to connect to RPC endpoint
Check your network connection and RPC endpoint configuration
```

**Missing Configuration:**
```
✗ Config file not found: .akash/config.json
Create a config file or specify with --config option
```

**Invalid Owner Address:**
```
✗ Owner address is required
Use --owner option to specify owner address
```

**Deployment Not Found:**
```
✗ No deployments found
The specified owner has no active deployments
```

---

## Advanced Usage

### Scripting and Automation

The CLI can be used in scripts and CI/CD pipelines:

```bash
#!/bin/bash

# Deploy to testnet
akash-cli deploy app.yml --config .akash/testnet.json

# Wait for deployment
sleep 10

# Check status
akash-cli status --owner akash1...

# Close when done
akash-cli close --owner akash1... --deployment 12345 --yes
```

### NPX Usage

Run without installation using npx:

```bash
npx @cryptoandcoffee/akash-jsdk-cli init
npx @cryptoandcoffee/akash-jsdk-cli deploy app.yml
npx @cryptoandcoffee/akash-jsdk-cli status --owner akash1...
```

### JSON Output (Future Feature)

For programmatic use, JSON output mode is planned:

```bash
# Future feature
akash-cli status --owner akash1... --json
```

---

## Requirements

- **Node.js**: 18+ (ESM modules required)
- **Network Access**: Internet connection to Akash Network RPC endpoints
- **Wallet**: For deployments requiring signatures (future feature)

---

## Troubleshooting

### Command Not Found

If `akash-cli` is not found after global installation:

```bash
# Check npm global bin path
npm config get prefix

# Add to PATH (Linux/macOS)
export PATH=$PATH:$(npm config get prefix)/bin

# On Windows, add to System PATH via Environment Variables
```

### Permission Errors

On Linux/macOS, you may need sudo for global installation:

```bash
sudo npm install -g @cryptoandcoffee/akash-jsdk-cli
```

Or configure npm to install globally without sudo:

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Configuration Issues

If commands fail to load configuration:

1. Check that config file exists at the specified path
2. Verify JSON syntax is valid
3. Ensure RPC endpoints are accessible
4. Try with explicit `--config` option

---

## Support

- **Documentation**: [Main README](../../README.md)
- **Issues**: [GitHub Issues](https://github.com/cryptoandcoffee/akash-jsdk/issues)
- **Examples**: See `examples/` directory in repository

## License

Apache License 2.0

---

**Part of the Akash JSDK v3.6.1 - Production Ready CLI Tools**
