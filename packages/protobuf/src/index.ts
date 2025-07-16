// Export our compatibility types
export * from './official-types.js'

// Re-export protobuf core functionality
export { Message, proto3 } from '@bufbuild/protobuf'

import { 
  Message, 
  MessageType, 
  BinaryReadOptions,
  BinaryWriteOptions,
  JsonReadOptions,
  JsonWriteOptions
} from '@bufbuild/protobuf'

// Generated types - use fallback types for compatibility
import { Deployment } from '../generated/akash/deployment/v1beta3/deployment_pb.js'
import { Lease } from '../generated/akash/market/v1beta4/lease_pb.js'

// Safely access generated types with fallback
const DeploymentType = Deployment
const LeaseType = Lease

export interface SerializationOptions {
  binary?: {
    readOptions?: BinaryReadOptions
    writeOptions?: BinaryWriteOptions
  }
  json?: {
    readOptions?: JsonReadOptions
    writeOptions?: JsonWriteOptions
  }
}

/**
 * Modern Akash Network Protobuf Registry using Protobuf-ES
 * Provides high-performance protobuf serialization with tree-shaking support
 */
export class AkashProtobuf {
  private options: SerializationOptions

  constructor(options: SerializationOptions = {}) {
    this.options = options
  }

  /**
   * Encode any protobuf message to binary format
   */
  encode<T extends Message<T>>(message: T): Uint8Array {
    return message.toBinary(this.options.binary?.writeOptions)
  }

  /**
   * Decode binary data to protobuf message
   */
  decode<T extends Message<T>>(messageType: MessageType<T>, data: Uint8Array): T {
    return messageType.fromBinary(data, this.options.binary?.readOptions)
  }

  /**
   * Convert protobuf message to JSON
   */
  toJson<T extends Message<T>>(message: T): any {
    return message.toJson(this.options.json?.writeOptions)
  }

  /**
   * Parse JSON to protobuf message
   */
  fromJson<T extends Message<T>>(messageType: MessageType<T>, json: any): T {
    return messageType.fromJson(json, this.options.json?.readOptions)
  }

  // Convenience methods for common Akash types
  
  /**
   * Encode Deployment to binary
   */
  encodeDeployment(deployment: any): Uint8Array {
    if (!DeploymentType) {
      throw new Error('Deployment protobuf type not available. Ensure protobuf generation completed successfully.')
    }
    const message = new DeploymentType(deployment)
    return this.encode(message)
  }

  /**
   * Decode binary data to Deployment
   */
   decodeDeployment(data: Uint8Array): any {
     if (!DeploymentType) {
       throw new Error('Deployment protobuf type not available. Ensure protobuf generation completed successfully.')
     }
     return this.decode(DeploymentType, data)
   }
  /**
   * Encode Lease to binary
   */
  encodeLease(lease: any): Uint8Array {
    if (!LeaseType) {
      throw new Error('Lease protobuf type not available. Ensure protobuf generation completed successfully.')
    }
    const message = new LeaseType(lease)
    return this.encode(message)
  }

  /**
   * Decode binary data to Lease
   */
   decodeLease(data: Uint8Array): any {
     if (!LeaseType) {
       throw new Error('Lease protobuf type not available. Ensure protobuf generation completed successfully.')
     }
     return this.decode(LeaseType, data)
   }
  /**
   * Create a deployment message with validation
   */
  createDeployment(data: any): any {
    if (!DeploymentType) {
      throw new Error('Deployment protobuf type not available')
    }
    return new DeploymentType(data)
  }

  /**
   * Create a lease message with validation
   */
  createLease(data: any): any {
    if (!LeaseType) {
      throw new Error('Lease protobuf type not available')
    }
    return new LeaseType(data)
  }

  /**
   * Get available message types for runtime inspection
   */
  getAvailableTypes(): string[] {
    const types: string[] = []
    if (DeploymentType) types.push('Deployment')
    if (LeaseType) types.push('Lease')
    return types
  }

  /**
   * Validate that protobuf types are properly loaded
   */
  validateTypesLoaded(): boolean {
    return !!(DeploymentType && LeaseType)
  }
}

// Default registry instance
export const protobufRegistry = new AkashProtobuf()

// Utility functions for common operations
export const akashProtobuf = {
  /**
   * Quick encode any message to binary
   */
  encode: <T extends Message<T>>(message: T): Uint8Array => 
    protobufRegistry.encode(message),

  /**
   * Quick decode binary to message
   */
  decode: <T extends Message<T>>(messageType: MessageType<T>, data: Uint8Array): T => 
    protobufRegistry.decode(messageType, data),

  /**
   * Quick convert message to JSON
   */
  toJson: <T extends Message<T>>(message: T): any => 
    protobufRegistry.toJson(message),

  /**
   * Quick parse JSON to message
   */
  fromJson: <T extends Message<T>>(messageType: MessageType<T>, json: any): T => 
    protobufRegistry.fromJson(messageType, json),

  /**
   * Create configured registry with custom options
   */
  createRegistry: (options: SerializationOptions): AkashProtobuf => 
    new AkashProtobuf(options),

  /**
   * Access to generated types for direct usage
   */
  types: {
    get Deployment() { return DeploymentType },
    get Lease() { return LeaseType }
  }
}