// Export our compatibility types (includes Deployment, Lease, etc.)
export * from './official-types.js'

// Generated types are available via: import { X } from '@cryptoandcoffee' + '/akash-jsdk-protobuf/generated'
// but not re-exported here to avoid conflicts with official-types

/**
 * Simple Akash Network Protobuf Type Registry
 * Provides TypeScript types for Akash Network protobuf messages
 *
 * Note: With @bufbuild/protobuf v2, we use plain TypeScript types
 * instead of classes for better framework compatibility.
 * This class is kept for backward compatibility but most methods
 * are no-ops since v2 types are just plain TypeScript interfaces.
 */
export class AkashProtobuf {
  constructor() {
    // No-op constructor for backward compatibility
  }

  /**
   * Get available types (deprecated in v2, returns empty array)
   */
  getAvailableTypes(): string[] {
    return []
  }

  /**
   * Check if types are loaded (always true in v2)
   */
  validateTypesLoaded(): boolean {
    return true
  }

  /**
   * Create a deployment object (v2 just returns the data)
   */
  createDeployment(data: any): any {
    return data
  }

  /**
   * Create a lease object (v2 just returns the data)
   */
  createLease(data: any): any {
    return data
  }

  /**
   * Encode deployment (not supported in v2 type-only mode)
   */
  encodeDeployment(_deployment: any): Uint8Array {
    throw new Error('Serialization not supported in v2 type-only mode. Use @bufbuild/protobuf directly if needed.')
  }

  /**
   * Decode deployment (not supported in v2 type-only mode)
   */
  decodeDeployment(_data: Uint8Array): any {
    throw new Error('Deserialization not supported in v2 type-only mode. Use @bufbuild/protobuf directly if needed.')
  }

  /**
   * Encode lease (not supported in v2 type-only mode)
   */
  encodeLease(_lease: any): Uint8Array {
    throw new Error('Serialization not supported in v2 type-only mode. Use @bufbuild/protobuf directly if needed.')
  }

  /**
   * Decode lease (not supported in v2 type-only mode)
   */
  decodeLease(_data: Uint8Array): any {
    throw new Error('Deserialization not supported in v2 type-only mode. Use @bufbuild/protobuf directly if needed.')
  }
}

// Default registry instance for backward compatibility
export const protobufRegistry = new AkashProtobuf()

// Utility object for backward compatibility
export const akashProtobuf = {
  /**
   * Create configured registry (v2 no-op)
   */
  createRegistry: (): AkashProtobuf => new AkashProtobuf(),

  /**
   * Access to types (deprecated in v2, returns undefined)
   */
  types: {
    get Deployment() { return undefined },
    get Lease() { return undefined }
  }
}
