/**
 * JWT Authentication Types for Akash Network Mainnet 14+
 * Implements AEP-63: Full API Authentication Abstraction
 */

/**
 * JWT permission scopes for granular access control
 */
export enum JWTPermissionScope {
  SendManifest = 'send_manifest',
  GetManifest = 'get_manifest',
  Status = 'status',
  Events = 'events',
  Logs = 'logs',
  Shell = 'shell'
}

/**
 * Access level for lease operations
 */
export enum JWTAccessType {
  None = 'none',
  Read = 'read',
  Write = 'write',
  Full = 'full'
}

/**
 * Lease permissions in JWT claims
 */
export interface JWTLeasePermissions {
  owner: string;
  dseq: string;
  gseq?: string;
  oseq?: string;
  provider?: string;
  scopes: JWTPermissionScope[];
}

/**
 * JWT token claims structure
 */
export interface JWTClaims {
  /** Token issuer (account address) */
  iss: string;
  /** Token subject (typically same as issuer) */
  sub?: string;
  /** Issued at timestamp */
  iat: number;
  /** Expiration timestamp */
  exp: number;
  /** Not before timestamp */
  nbf?: number;
  /** JWT version */
  version: string;
  /** Lease permissions */
  leases?: {
    access: JWTAccessType;
    permissions?: JWTLeasePermissions[];
  };
}

/**
 * JWT token generation options
 */
export interface JWTGenerationOptions {
  /** Account address (issuer) */
  address: string;
  /** Private key for signing */
  privateKey: string;
  /** Token expiration in seconds (default: 900 = 15 minutes) */
  expiresIn?: number;
  /** Access type (default: Full) */
  accessType?: JWTAccessType;
  /** Specific lease permissions */
  leasePermissions?: JWTLeasePermissions[];
}

/**
 * JWT validation result
 */
export interface JWTValidationResult {
  valid: boolean;
  claims?: JWTClaims;
  error?: string;
}

/**
 * Authentication method type
 */
export enum AuthMethod {
  /** Certificate-based authentication (legacy) */
  Certificate = 'certificate',
  /** JWT token authentication (Mainnet 14+) */
  JWT = 'jwt',
  /** Auto-detect based on provider capabilities */
  Auto = 'auto'
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /** Preferred authentication method */
  method: AuthMethod;
  /** JWT token (if using JWT auth) */
  jwtToken?: string;
  /** Certificate data (if using certificate auth) */
  certificate?: {
    cert: string;
    pubkey: string;
    privkey: string;
  };
}
