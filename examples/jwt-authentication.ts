/**
 * JWT Authentication Example for Akash Network
 *
 * This example demonstrates how to:
 * 1. Set up JWT authentication with the Akash SDK
 * 2. Generate JWT tokens from a wallet
 * 3. Use JWT to interact with providers
 * 4. Switch between JWT and certificate-based authentication
 * 5. Handle JWT token expiration and refresh
 *
 * JWT (JSON Web Tokens) are supported on Akash Network Mainnet 14+ as part of
 * AEP-63 (Full API Authentication Abstraction), providing an alternative to
 * certificate-based mutual TLS (mTLS) authentication.
 *
 * Requirements:
 * - Node.js 18+
 * - @cryptoandcoffee/akash-jsdk-core package installed
 * - Access to an Akash Network endpoint (RPC + API)
 *
 * Usage:
 * npx ts-node examples/jwt-authentication.ts
 */

import AkashSDK, {
  AuthMethod,
  AuthConfig,
  JWTAccessType,
  JWTPermissionScope,
  DEFAULT_CONFIG
} from '@cryptoandcoffee/akash-jsdk-core'

// Mock wallet data for demonstration purposes
// In production, this would come from a real wallet provider like Keplr or Cosmostation
const DEMO_WALLET = {
  address: 'akash1example1234567890abcdefghijklmnop',
  // NOTE: This is a mock private key for demonstration only!
  // Never hardcode real private keys in your code.
  privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDFVdXN5KpKS3P9
1k0j+KhJ3TJ7L+1v2X2K1Bz7VVl3L1wZJfJL1zKzKN2pL5ZGP6QKZ2vX8Y3Z0S3Z
...truncated for example...
-----END PRIVATE KEY-----`
}

/**
 * Example 1: Basic JWT Setup
 * Initialize the SDK and set up JWT authentication
 */
async function example1_basicJWTSetup() {
  console.log('\n=== Example 1: Basic JWT Setup ===\n')

  try {
    // Initialize the SDK with default Akash Network configuration
    const sdk = new AkashSDK(DEFAULT_CONFIG)
    console.log('SDK initialized with config:', {
      rpcEndpoint: DEFAULT_CONFIG.rpcEndpoint,
      apiEndpoint: DEFAULT_CONFIG.apiEndpoint,
      chainId: DEFAULT_CONFIG.chainId
    })

    // Connect to the network
    await sdk.connect()
    console.log('Connected to Akash Network')

    // Get the JWT authentication manager
    const jwtManager = sdk.jwtAuth
    console.log('JWT Authentication Manager ready')

    await sdk.disconnect()
  } catch (error) {
    console.error('Error in example 1:', error instanceof Error ? error.message : error)
  }
}

/**
 * Example 2: Generate a JWT Token
 * Create a JWT token from wallet credentials
 */
async function example2_generateJWTToken() {
  console.log('\n=== Example 2: Generate JWT Token ===\n')

  try {
    const sdk = new AkashSDK(DEFAULT_CONFIG)
    await sdk.connect()

    // Generate a JWT token with default settings (15 minute expiration)
    console.log('Generating JWT token for address:', DEMO_WALLET.address)

    const jwtManager = sdk.jwtAuth
    const token = await jwtManager.generateToken({
      address: DEMO_WALLET.address,
      privateKey: DEMO_WALLET.privateKey
      // expiresIn: 900 (default - 15 minutes)
      // accessType: JWTAccessType.Full (default)
    })

    console.log('JWT token generated successfully!')
    console.log('Token (first 50 chars):', token.substring(0, 50) + '...')

    // Decode and inspect the token (without verification)
    const decoded = jwtManager.decodeToken(token)
    console.log('\nToken Claims:')
    console.log('  Issuer (iss):', decoded?.iss)
    console.log('  Subject (sub):', decoded?.sub)
    console.log('  Issued At (iat):', new Date((decoded?.iat || 0) * 1000).toISOString())
    console.log('  Expires At (exp):', new Date((decoded?.exp || 0) * 1000).toISOString())
    console.log('  Not Before (nbf):', decoded?.nbf ? new Date(decoded.nbf * 1000).toISOString() : 'Not set')
    console.log('  Version:', decoded?.version)

    // Check time until expiration
    const secondsUntilExpiration = (decoded?.exp || 0) - Math.floor(Date.now() / 1000)
    console.log(`\nToken expires in ${secondsUntilExpiration} seconds`)

    await sdk.disconnect()
  } catch (error) {
    console.error('Error in example 2:', error instanceof Error ? error.message : error)
  }
}

/**
 * Example 3: Generate JWT with Custom Settings
 * Create a JWT token with specific permissions and expiration
 */
async function example3_customJWTGeneration() {
  console.log('\n=== Example 3: Generate JWT with Custom Settings ===\n')

  try {
    const sdk = new AkashSDK(DEFAULT_CONFIG)
    await sdk.connect()

    const jwtManager = sdk.jwtAuth

    // Generate token with custom expiration (1 hour) and limited permissions
    console.log('Generating JWT token with custom settings:')
    console.log('  Expiration: 3600 seconds (1 hour)')
    console.log('  Access Type: Read-only')
    console.log('  Lease Permissions: Send Manifest, Get Manifest, Logs')

    const token = await jwtManager.generateToken({
      address: DEMO_WALLET.address,
      privateKey: DEMO_WALLET.privateKey,
      expiresIn: 3600, // 1 hour instead of default 15 minutes
      accessType: JWTAccessType.Read, // Read-only access
      leasePermissions: [
        {
          owner: DEMO_WALLET.address,
          dseq: '123456',
          provider: 'akash1provider1234567890abcdefghijklmno',
          scopes: [
            JWTPermissionScope.SendManifest,
            JWTPermissionScope.GetManifest,
            JWTPermissionScope.Logs
          ]
        }
      ]
    })

    console.log('\nToken generated successfully with custom settings!')

    // Decode and display the token details
    const decoded = jwtManager.decodeToken(token)
    console.log('\nToken Claims:')
    console.log('  Access Type:', decoded?.leases?.access)
    console.log('  Lease Permissions:', decoded?.leases?.permissions)
    console.log('  Valid for:', Math.ceil((decoded?.exp || 0) - (decoded?.iat || 0)), 'seconds')

    await sdk.disconnect()
  } catch (error) {
    console.error('Error in example 3:', error instanceof Error ? error.message : error)
  }
}

/**
 * Example 4: Set Authentication Configuration
 * Configure the SDK to use JWT authentication for provider interactions
 */
async function example4_setAuthConfig() {
  console.log('\n=== Example 4: Set Authentication Configuration ===\n')

  try {
    const sdk = new AkashSDK(DEFAULT_CONFIG)
    await sdk.connect()

    // Generate a JWT token first
    const jwtManager = sdk.jwtAuth
    const token = await jwtManager.generateToken({
      address: DEMO_WALLET.address,
      privateKey: DEMO_WALLET.privateKey
    })

    // Configure SDK to use JWT authentication
    const jwtAuthConfig: AuthConfig = {
      method: AuthMethod.JWT,
      jwtToken: token
    }

    sdk.setAuthConfig(jwtAuthConfig)
    console.log('SDK configured to use JWT authentication')

    // Verify configuration
    const currentConfig = sdk.getAuthConfig()
    console.log('Current authentication method:', currentConfig?.method)
    console.log('JWT token is set:', !!currentConfig?.jwtToken)

    // Check if token is expired
    const isExpired = sdk.wallet.isJWTTokenExpired(token)
    console.log('Token is expired:', isExpired)

    // Create authorization header for provider requests
    const authHeader = sdk.wallet.createAuthorizationHeader()
    console.log('Authorization header created:', !!authHeader)
    if (authHeader) {
      console.log('  Format: Bearer <token>')
      console.log('  Header (first 50 chars):', authHeader.substring(0, 50) + '...')
    }

    await sdk.disconnect()
  } catch (error) {
    console.error('Error in example 4:', error instanceof Error ? error.message : error)
  }
}

/**
 * Example 5: Switch Between Authentication Methods
 * Demonstrate switching between JWT and certificate-based authentication
 */
async function example5_switchAuthMethods() {
  console.log('\n=== Example 5: Switch Between Authentication Methods ===\n')

  try {
    const sdk = new AkashSDK(DEFAULT_CONFIG)
    await sdk.connect()

    // Initially use JWT authentication
    console.log('Step 1: Setting up JWT authentication')
    const jwtToken = await sdk.jwtAuth.generateToken({
      address: DEMO_WALLET.address,
      privateKey: DEMO_WALLET.privateKey
    })

    const jwtConfig: AuthConfig = {
      method: AuthMethod.JWT,
      jwtToken
    }

    sdk.setAuthConfig(jwtConfig)
    console.log('Current auth method:', sdk.getAuthConfig()?.method)

    // Switch to certificate-based authentication
    console.log('\nStep 2: Switching to certificate-based authentication')
    const certConfig: AuthConfig = {
      method: AuthMethod.Certificate,
      certificate: {
        cert: 'MIIDXTCCAkWgAwIBAgIJALJ...',
        pubkey: 'MIIBIjANBgkqhkiG...',
        privkey: 'MIIEowIBAAKCAQEA...'
      }
    }

    sdk.setAuthConfig(certConfig)
    console.log('Current auth method:', sdk.getAuthConfig()?.method)
    console.log('Certificate authentication configured (uses mTLS)')

    // Switch back to JWT
    console.log('\nStep 3: Switching back to JWT authentication')
    sdk.setAuthConfig(jwtConfig)
    console.log('Current auth method:', sdk.getAuthConfig()?.method)

    await sdk.disconnect()
  } catch (error) {
    console.error('Error in example 5:', error instanceof Error ? error.message : error)
  }
}

/**
 * Example 6: Handle Token Expiration
 * Check token expiration and implement token refresh logic
 */
async function example6_handleTokenExpiration() {
  console.log('\n=== Example 6: Handle Token Expiration ===\n')

  try {
    const sdk = new AkashSDK(DEFAULT_CONFIG)
    await sdk.connect()

    const jwtManager = sdk.jwtAuth

    // Generate a token with short expiration for demonstration (30 seconds)
    console.log('Generating token with 30-second expiration for demo...')
    const shortLivedToken = await jwtManager.generateToken({
      address: DEMO_WALLET.address,
      privateKey: DEMO_WALLET.privateKey,
      expiresIn: 30 // 30 seconds - short-lived for demo
    })

    // Check token status
    let isExpired = jwtManager.isTokenExpired(shortLivedToken)
    console.log('Token expired:', isExpired)

    // Get expiration time
    const expirationTimestamp = jwtManager.getTokenExpiration(shortLivedToken)
    if (expirationTimestamp) {
      const expirationDate = new Date(expirationTimestamp * 1000)
      const nowDate = new Date()
      const secondsUntilExpiration = Math.floor((expirationDate.getTime() - nowDate.getTime()) / 1000)

      console.log('Token expires at:', expirationDate.toISOString())
      console.log('Seconds until expiration:', Math.max(0, secondsUntilExpiration))
    }

    // Demonstrate token refresh logic
    console.log('\nToken Refresh Strategy:')
    console.log('1. Check token expiration before each provider request')
    console.log('2. If expired, generate a new token')
    console.log('3. Update SDK authentication config with new token')
    console.log('4. Retry the provider request')

    // Example: Check and refresh token
    async function ensureValidToken(): Promise<string> {
      let currentToken = shortLivedToken

      // Check if token is expired or about to expire (within 5 minutes)
      if (jwtManager.isTokenExpired(currentToken)) {
        console.log('\nToken expired, generating new token...')
        currentToken = await jwtManager.generateToken({
          address: DEMO_WALLET.address,
          privateKey: DEMO_WALLET.privateKey
        })
        console.log('New token generated and set in configuration')

        // Update SDK config with new token
        sdk.setAuthConfig({
          method: AuthMethod.JWT,
          jwtToken: currentToken
        })
      }

      return currentToken
    }

    // Use the token refresh function
    const validToken = await ensureValidToken()
    console.log('Using valid token:', validToken.substring(0, 30) + '...')

    await sdk.disconnect()
  } catch (error) {
    console.error('Error in example 6:', error instanceof Error ? error.message : error)
  }
}

/**
 * Example 7: Use JWT with Provider Interactions
 * Demonstrate using JWT tokens when interacting with Akash providers
 */
async function example7_useJWTWithProviders() {
  console.log('\n=== Example 7: Use JWT with Provider Interactions ===\n')

  try {
    const sdk = new AkashSDK(DEFAULT_CONFIG)
    await sdk.connect()

    // Generate JWT token
    const token = await sdk.jwtAuth.generateToken({
      address: DEMO_WALLET.address,
      privateKey: DEMO_WALLET.privateKey,
      expiresIn: 3600 // 1 hour for provider interactions
    })

    // Configure SDK with JWT
    sdk.setAuthConfig({
      method: AuthMethod.JWT,
      jwtToken: token
    })

    console.log('JWT authentication configured')

    // Example provider interaction scenarios
    console.log('\nTypical provider interaction flows with JWT:')

    // Scenario 1: Get deployment status
    console.log('\n1. Get Deployment Status:')
    console.log('   - SDK sends authenticated request with JWT Bearer token')
    console.log('   - Provider verifies JWT signature and claims')
    console.log('   - Returns deployment status if authorized')
    console.log('   Usage: await sdk.deployments.get({ owner, dseq })')

    // Scenario 2: Send deployment manifest
    console.log('\n2. Send Deployment Manifest:')
    console.log('   - Requires SendManifest permission in JWT scope')
    console.log('   - Provider validates JWT permissions match requested action')
    console.log('   - Uploads manifest to provider if authorized')
    console.log('   Usage: await sdk.providerManager.sendManifest(...)')

    // Scenario 3: Monitor lease
    console.log('\n3. Monitor Lease:')
    console.log('   - Use read-only JWT with GetManifest and Status scopes')
    console.log('   - Check lease status, events, and logs')
    console.log('   - Lower security risk with limited permissions')
    console.log('   Usage: await sdk.leases.list({ owner, dseq })')

    // Demonstrate authorization header creation
    const authHeader = sdk.wallet.createAuthorizationHeader()
    console.log('\nAuthorization header for requests:')
    console.log('  Content-Type: application/json')
    console.log('  Authorization:', authHeader?.substring(0, 40) + '...')

    await sdk.disconnect()
  } catch (error) {
    console.error('Error in example 7:', error instanceof Error ? error.message : error)
  }
}

/**
 * Example 8: Error Handling and Security Best Practices
 * Demonstrate proper error handling and security considerations
 */
async function example8_securityBestPractices() {
  console.log('\n=== Example 8: Security Best Practices ===\n')

  try {
    const sdk = new AkashSDK(DEFAULT_CONFIG)
    await sdk.connect()

    const jwtManager = sdk.jwtAuth

    console.log('JWT Security Best Practices:\n')

    // 1. Never hardcode private keys
    console.log('1. Private Key Management:')
    console.log('   - Never hardcode private keys in source code')
    console.log('   - Use environment variables: process.env.PRIVATE_KEY')
    console.log('   - Use hardware wallets for production (Keplr, Ledger)')
    console.log('   - Rotate keys regularly')

    // 2. Use short token lifetimes
    console.log('\n2. Token Lifetime:')
    console.log('   - Use 15-30 minute expiration for interactive use')
    console.log('   - Use 1-4 hour expiration for automated services')
    console.log('   - Avoid tokens that expire after days/months')
    console.log('   - Always implement token refresh logic')

    // 3. Implement minimal permissions
    console.log('\n3. Minimal Permissions (Principle of Least Privilege):')
    console.log('   - Request only needed scopes (SendManifest, Logs, etc.)')
    console.log('   - Use Read access type for monitoring only')
    console.log('   - Specify deployment-specific permissions when possible')
    console.log('   - Avoid full access when limited access suffices')

    // 4. Handle errors gracefully
    console.log('\n4. Error Handling:')
    console.log('   - Validate addresses before token generation')
    console.log('   - Catch and handle token generation failures')
    console.log('   - Implement retry logic with exponential backoff')
    console.log('   - Log security events for audit trail')

    // 5. Validate addresses
    console.log('\n5. Address Validation:')
    const validation = sdk.wallet.validateAddress(DEMO_WALLET.address)
    console.log('   Address:', DEMO_WALLET.address)
    console.log('   Valid:', validation.valid)
    console.log('   Type:', validation.type)
    console.log('   Errors:', validation.errors)

    // 6. Use HTTPS only
    console.log('\n6. Network Security:')
    console.log('   - Always use HTTPS for API endpoints')
    console.log('   - Current RPC:', DEFAULT_CONFIG.rpcEndpoint)
    console.log('   - Current API:', DEFAULT_CONFIG.apiEndpoint)
    console.log('   - Verify SSL certificates in production')

    await sdk.disconnect()
  } catch (error) {
    console.error('Error in example 8:', error instanceof Error ? error.message : error)
  }
}

/**
 * Main execution
 * Run all examples in sequence
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗')
  console.log('║      Akash Network JWT Authentication Examples                    ║')
  console.log('║      SDK v3.0+ with Mainnet 14+ Support                           ║')
  console.log('╚════════════════════════════════════════════════════════════════════╝')

  try {
    // Run all examples
    await example1_basicJWTSetup()
    await example2_generateJWTToken()
    await example3_customJWTGeneration()
    await example4_setAuthConfig()
    await example5_switchAuthMethods()
    await example6_handleTokenExpiration()
    await example7_useJWTWithProviders()
    await example8_securityBestPractices()

    console.log('\n╔════════════════════════════════════════════════════════════════════╗')
    console.log('║                  All Examples Completed Successfully              ║')
    console.log('╚════════════════════════════════════════════════════════════════════╝\n')

    console.log('Next Steps:')
    console.log('1. Replace demo wallet with real wallet connection (Keplr, etc.)')
    console.log('2. Use environment variables for sensitive data')
    console.log('3. Implement token refresh logic for your use case')
    console.log('4. Test with real Akash Network provider endpoints')
    console.log('5. Review security best practices for production deployment\n')
  } catch (error) {
    console.error('Fatal error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Run main function
main().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
