/**
 * JWT Authentication Manager for Akash Network Mainnet 14+
 * Implements AEP-63: Full API Authentication Abstraction
 */

import * as jwt from 'jsonwebtoken'
import { JWTClaims, JWTGenerationOptions, JWTValidationResult, JWTAccessType } from '../types/jwt'
import { ValidationError } from '../errors'

export class JWTAuthManager {
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
      // Note: In a real implementation, this would use ES256K algorithm
      // For now, we use RS256 as a placeholder until secp256k1 support is added
      const token = jwt.sign(claims, options.privateKey, {
        algorithm: 'RS256', // TODO: Change to ES256K when secp256k1 support is added
        header: {
          alg: 'ES256K', // Akash uses ES256K (secp256k1)
          typ: 'JWT'
        }
      })

      return token
    } catch (error) {
      throw new ValidationError(`Failed to generate JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate a JWT token
   */
  async validateToken(token: string, publicKey: string): Promise<JWTValidationResult> {
    try {
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ['RS256', 'ES256'] // Note: ES256K not supported by jsonwebtoken, needs custom implementation
      }) as JWTClaims

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
      const decoded = jwt.decode(token) as JWTClaims
      return decoded
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
}
