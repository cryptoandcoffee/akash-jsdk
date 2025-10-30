/**
 * JWT Authentication Manager for Akash Network Mainnet 14+
 * Implements AEP-63: Full API Authentication Abstraction
 *
 * Uses ES256K (secp256k1) signatures compatible with Cosmos SDK
 */

import { ec as EC } from 'elliptic'
import { JWTClaims, JWTGenerationOptions, JWTValidationResult, JWTAccessType } from '../types/jwt'
import { ValidationError } from '../errors'

// Initialize secp256k1 elliptic curve
const secp256k1 = new EC('secp256k1')

export class JWTAuthManager {
  /**
   * Base64URL encode a buffer
   */
  private base64urlEncode(buffer: Buffer | Uint8Array | string): string {
    const base64 = Buffer.from(buffer).toString('base64')
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  /**
   * Base64URL decode a string
   */
  private base64urlDecode(str: string): Buffer {
    // Add padding if needed
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    return Buffer.from(base64, 'base64')
  }

  /**
   * Generate a JWT token for Akash Network authentication
   * Uses ES256K (secp256k1) signature algorithm compatible with Cosmos SDK
   */
  async generateToken(options: JWTGenerationOptions): Promise<string> {
    if (!options.address) {
      throw new ValidationError('Address is required for JWT generation')
    }

    if (!options.privateKey) {
      throw new ValidationError('Private key is required for JWT generation')
    }

    const now = Math.floor(Date.now() / 1000)
    const expiresIn = options.expiresIn || 900 // 15 minutes default

    // Build JWT header
    const header = {
      alg: 'ES256K',
      typ: 'JWT'
    }

    // Build JWT claims
    const claims: JWTClaims = {
      iss: options.address,
      sub: options.address,
      iat: now,
      nbf: now,
      exp: now + expiresIn,
      version: 'v1',
      leases: {
        access: options.accessType || JWTAccessType.Full,
        permissions: options.leasePermissions
      }
    }

    try {
      // Encode header and payload
      const encodedHeader = this.base64urlEncode(JSON.stringify(header))
      const encodedPayload = this.base64urlEncode(JSON.stringify(claims))
      const message = `${encodedHeader}.${encodedPayload}`

      // Parse private key
      let keyPair
      if (options.privateKey.startsWith('-----BEGIN')) {
        // PEM format - extract hex
        const hex = options.privateKey
          .replace(/-----BEGIN.*-----/, '')
          .replace(/-----END.*-----/, '')
          .replace(/\s/g, '')
        keyPair = secp256k1.keyFromPrivate(hex, 'hex')
      } else if (options.privateKey.startsWith('0x')) {
        // Hex format with 0x prefix
        keyPair = secp256k1.keyFromPrivate(options.privateKey.slice(2), 'hex')
      } else {
        // Raw hex format
        keyPair = secp256k1.keyFromPrivate(options.privateKey, 'hex')
      }

      // Sign the message using secp256k1
      const messageHash = Buffer.from(message, 'utf-8')
      const signature = keyPair.sign(messageHash)

      // Encode signature as raw r,s values (64 bytes total)
      const rHex = signature.r.toString('hex').padStart(64, '0')
      const sHex = signature.s.toString('hex').padStart(64, '0')
      const rawSignature = Buffer.from(rHex + sHex, 'hex')
      const encodedSignature = this.base64urlEncode(rawSignature)

      // Combine into JWT
      const token = `${message}.${encodedSignature}`

      return token
    } catch (error) {
      throw new ValidationError(`Failed to generate JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate a JWT token using ES256K signature
   */
  async validateToken(token: string, publicKey: string): Promise<JWTValidationResult> {
    try {
      // Split token into parts
      const parts = token.split('.')
      if (parts.length !== 3) {
        return {
          valid: false,
          error: 'Invalid token format'
        }
      }

      const [encodedHeader, encodedPayload, encodedSignature] = parts

      // Decode header and payload
      const headerJson = this.base64urlDecode(encodedHeader).toString('utf-8')
      const payloadJson = this.base64urlDecode(encodedPayload).toString('utf-8')

      const header = JSON.parse(headerJson)
      const decoded = JSON.parse(payloadJson) as JWTClaims

      // Verify algorithm
      if (header.alg !== 'ES256K') {
        return {
          valid: false,
          error: 'Invalid signature algorithm, expected ES256K'
        }
      }

      // Validate required fields
      if (!decoded.iss) {
        return {
          valid: false,
          error: 'Token missing issuer (iss) claim'
        }
      }

      if (!decoded.exp) {
        return {
          valid: false,
          error: 'Token missing expiration (exp) claim'
        }
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000)
      if (decoded.exp < now) {
        return {
          valid: false,
          error: 'Token has expired'
        }
      }

      // Check not before
      if (decoded.nbf && decoded.nbf > now) {
        return {
          valid: false,
          error: 'Token not yet valid'
        }
      }

      // Verify signature
      const message = `${encodedHeader}.${encodedPayload}`
      const messageBuffer = Buffer.from(message, 'utf-8')
      const signatureBuffer = this.base64urlDecode(encodedSignature)

      // Parse public key
      let key
      if (publicKey.startsWith('-----BEGIN')) {
        // PEM format
        const hex = publicKey
          .replace(/-----BEGIN.*-----/, '')
          .replace(/-----END.*-----/, '')
          .replace(/\s/g, '')
        key = secp256k1.keyFromPublic(hex, 'hex')
      } else if (publicKey.startsWith('0x') || publicKey.startsWith('02') || publicKey.startsWith('03') || publicKey.startsWith('04')) {
        // Hex format (compressed or uncompressed)
        const cleanKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey
        key = secp256k1.keyFromPublic(cleanKey, 'hex')
      } else {
        return {
          valid: false,
          error: 'Invalid public key format'
        }
      }

      // Verify the signature
      const signatureObj = { r: signatureBuffer.slice(0, 32), s: signatureBuffer.slice(32, 64) }
      const isValid = key.verify(messageBuffer, signatureObj)

      if (!isValid) {
        return {
          valid: false,
          error: 'Invalid signature'
        }
      }

      return {
        valid: true,
        claims: decoded
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid token'
      }
    }
  }

  /**
   * Decode a JWT token without validation (for inspection)
   */
  decodeToken(token: string): JWTClaims | null {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        return null
      }

      const payloadJson = this.base64urlDecode(parts[1]).toString('utf-8')
      return JSON.parse(payloadJson) as JWTClaims
    } catch {
      return null
    }
  }

  /**
   * Check if a token has expired
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token)
    if (!decoded || !decoded.exp) {
      return true
    }

    const now = Math.floor(Date.now() / 1000)
    return decoded.exp < now
  }

  /**
   * Get token expiration time in seconds
   */
  getTokenExpiration(token: string): number | null {
    const decoded = this.decodeToken(token)
    return decoded?.exp || null
  }

  /**
   * Create authorization header value for HTTP requests
   */
  createAuthHeader(token: string): string {
    return `Bearer ${token}`
  }

  /**
   * Extract token from authorization header
   */
  extractTokenFromHeader(authHeader: string): string | null {
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return null
    }
    return parts[1]
  }

  /**
   * Generate a secp256k1 keypair for testing/development
   */
  generateKeyPair(): { privateKey: string; publicKey: string } {
    const keyPair = secp256k1.genKeyPair()
    return {
      privateKey: keyPair.getPrivate('hex'),
      publicKey: keyPair.getPublic('hex')
    }
  }
}
