import { describe, it, expect } from 'vitest'
import { JWTAuthManager } from './jwt-auth'
import { JWTAccessType } from '../types/jwt'

describe('JWTAuthManager - ES256K', () => {
  it('should generate a keypair', () => {
    const jwtManager = new JWTAuthManager()
    const keyPair = jwtManager.generateKeyPair()

    expect(keyPair.privateKey).toBeDefined()
    expect(keyPair.publicKey).toBeDefined()
    expect(keyPair.privateKey).toHaveLength(64) // 32 bytes = 64 hex chars
    expect(keyPair.publicKey.length).toBeGreaterThanOrEqual(66) // Compressed public key
  })

  it('should generate and validate a JWT token with ES256K', async () => {
    const jwtManager = new JWTAuthManager()
    const keyPair = jwtManager.generateKeyPair()

    const token = await jwtManager.generateToken({
      address: 'akash1test123456789abcdefghijklmnopqrstuv',
      privateKey: keyPair.privateKey,
      expiresIn: 900,
      accessType: JWTAccessType.Full
    })

    expect(token).toBeDefined()
    expect(token.split('.')).toHaveLength(3)

    // Validate the token
    const result = await jwtManager.validateToken(token, keyPair.publicKey)

    expect(result.valid).toBe(true)
    expect(result.claims).toBeDefined()
    expect(result.claims?.iss).toBe('akash1test123456789abcdefghijklmnopqrstuv')
    expect(result.claims?.version).toBe('v1')
    expect(result.claims?.leases?.access).toBe(JWTAccessType.Full)
  })

  it('should reject invalid signatures', async () => {
    const jwtManager = new JWTAuthManager()
    const keyPair1 = jwtManager.generateKeyPair()
    const keyPair2 = jwtManager.generateKeyPair()

    // Generate token with keyPair1
    const token = await jwtManager.generateToken({
      address: 'akash1test',
      privateKey: keyPair1.privateKey
    })

    // Try to validate with keyPair2's public key (should fail)
    const result = await jwtManager.validateToken(token, keyPair2.publicKey)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid signature')
  })

  it('should decode token without validation', async () => {
    const jwtManager = new JWTAuthManager()
    const keyPair = jwtManager.generateKeyPair()

    const token = await jwtManager.generateToken({
      address: 'akash1test',
      privateKey: keyPair.privateKey,
      expiresIn: 900
    })

    const decoded = jwtManager.decodeToken(token)

    expect(decoded).toBeDefined()
    expect(decoded?.iss).toBe('akash1test')
    expect(decoded?.version).toBe('v1')
  })

  it('should detect expired tokens', async () => {
    const jwtManager = new JWTAuthManager()
    const keyPair = jwtManager.generateKeyPair()

    // Create token that expires immediately
    const token = await jwtManager.generateToken({
      address: 'akash1test',
      privateKey: keyPair.privateKey,
      expiresIn: -10 // Already expired
    })

    const result = await jwtManager.validateToken(token, keyPair.publicKey)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('expired')
  })

  it('should check token expiration', async () => {
    const jwtManager = new JWTAuthManager()
    const keyPair = jwtManager.generateKeyPair()

    const expiredToken = await jwtManager.generateToken({
      address: 'akash1test',
      privateKey: keyPair.privateKey,
      expiresIn: -10
    })

    const validToken = await jwtManager.generateToken({
      address: 'akash1test',
      privateKey: keyPair.privateKey,
      expiresIn: 900
    })

    expect(jwtManager.isTokenExpired(expiredToken)).toBe(true)
    expect(jwtManager.isTokenExpired(validToken)).toBe(false)
  })

  it('should create and extract authorization headers', () => {
    const jwtManager = new JWTAuthManager()
    const token = 'test.token.here'

    const header = jwtManager.createAuthHeader(token)
    expect(header).toBe('Bearer test.token.here')

    const extracted = jwtManager.extractTokenFromHeader(header)
    expect(extracted).toBe(token)
  })

  it('should handle hex private keys with 0x prefix', async () => {
    const jwtManager = new JWTAuthManager()
    const keyPair = jwtManager.generateKeyPair()

    const token = await jwtManager.generateToken({
      address: 'akash1test',
      privateKey: `0x${keyPair.privateKey}`
    })

    expect(token).toBeDefined()
    const result = await jwtManager.validateToken(token, keyPair.publicKey)
    expect(result.valid).toBe(true)
  })

  it('should handle compressed and uncompressed public keys', async () => {
    const jwtManager = new JWTAuthManager()
    const keyPair = jwtManager.generateKeyPair()

    const token = await jwtManager.generateToken({
      address: 'akash1test',
      privateKey: keyPair.privateKey
    })

    // Test with 0x prefix
    const result1 = await jwtManager.validateToken(token, `0x${keyPair.publicKey}`)
    expect(result1.valid).toBe(true)

    // Test without prefix
    const result2 = await jwtManager.validateToken(token, keyPair.publicKey)
    expect(result2.valid).toBe(true)
  })
})
