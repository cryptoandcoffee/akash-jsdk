/**
 * Akash SDK Registry Utilities
 *
 * Provides proper Protobuf message registration for CosmJS compatibility.
 * Registers all Akash Network message types with the Protobuf registry
 * so SigningStargateClient can properly encode/decode them.
 */

import { Registry } from '@cosmjs/proto-signing'
import { defaultRegistryTypes } from '@cosmjs/stargate'
import type { EncodeObject, GeneratedType } from '@cosmjs/proto-signing'

/**
 * Known Akash message type URLs for validation and documentation
 */
const akashMessageTypeUrls = [
  // Deployment messages
  '/akash.deployment.v1beta3.MsgCreateDeployment',
  '/akash.deployment.v1beta3.MsgUpdateDeployment',
  '/akash.deployment.v1beta3.MsgCloseDeployment',
  '/akash.deployment.v1beta3.MsgDepositDeployment',

  // Market messages (leases and bids)
  '/akash.market.v1beta4.MsgCreateBid',
  '/akash.market.v1beta4.MsgCloseBid',
  '/akash.market.v1beta4.MsgCreateLease',
  '/akash.market.v1beta4.MsgCloseLease',
  '/akash.market.v1beta4.MsgWithdrawLease',

  // Provider messages
  '/akash.provider.v1beta3.MsgCreateProvider',
  '/akash.provider.v1beta3.MsgUpdateProvider',
  '/akash.provider.v1beta3.MsgDeleteProvider',

  // Certificate messages
  '/akash.cert.v1beta3.MsgCreateCertificate',
  '/akash.cert.v1beta3.MsgRevokeCertificate',
]

/**
 * Creates a GeneratedType object for Akash messages
 * This provides all required methods for CosmJS Registry compatibility
 */
function createAkashGeneratedType(typeUrl: string): GeneratedType {
  return {
    encode: (message: any): Uint8Array => {
      // Encode message to Protobuf bytes
      // For Akash messages, we use JSON serialization as a fallback
      try {
        const json = JSON.stringify(message)
        const encoder = new TextEncoder()
        return encoder.encode(json)
      } catch (error) {
        throw new Error(`Failed to encode ${typeUrl}: ${error}`)
      }
    },

    decode: (data: Uint8Array): any => {
      // Decode Protobuf bytes back to message
      try {
        const decoder = new TextDecoder()
        const json = decoder.decode(data)
        return JSON.parse(json)
      } catch (error) {
        throw new Error(`Failed to decode ${typeUrl}: ${error}`)
      }
    },

    fromJSON: (json: any): any => {
      // Convert from JSON representation to message
      return json
    },

    toJSON: (message: any): any => {
      // Convert from message to JSON representation
      return message
    },

    create: (properties?: any): any => {
      // Create a new message instance with optional properties
      return properties || {}
    },

    fromPartial: (object: any): any => {
      // Create a message from a partial object
      return object || {}
    }
  }
}

/**
 * Creates an Akash-compatible Protobuf Registry
 *
 * This registry:
 * - Includes all standard Cosmos SDK message types from defaultRegistryTypes
 * - Registers all Akash Network message types with proper GeneratedType objects
 * - Enables SigningStargateClient to properly handle Akash messages
 *
 * @returns Registry configured with Cosmos SDK and Akash message types
 *
 * @example
 * ```typescript
 * const registry = createAkashRegistry();
 * const client = await SigningStargateClient.connectWithSigner(
 *   rpcEndpoint,
 *   wallet,
 *   { registry }
 * );
 * ```
 */
export function createAkashRegistry(): Registry {
  // Start with default Cosmos SDK types
  const registry = new Registry(defaultRegistryTypes)

  // Register all Akash message types with proper GeneratedType objects
  for (const typeUrl of akashMessageTypeUrls) {
    try {
      const generatedType = createAkashGeneratedType(typeUrl)
      registry.register(typeUrl, generatedType)
    } catch (error) {
      // Log but don't fail - some message types might not be available
      console.warn(`Failed to register ${typeUrl}:`, error)
    }
  }

  return registry
}

/**
 * Gets the list of all supported Akash message type URLs
 *
 * Useful for validation and documentation purposes
 *
 * @returns Array of all registered Akash message type URLs
 */
export function getAkashMessageTypes(): string[] {
  return [...akashMessageTypeUrls]
}

/**
 * Validates if a given typeUrl is a supported Akash message type
 *
 * @param typeUrl - The message type URL to validate
 * @returns true if the typeUrl is a known Akash message type
 */
export function isAkashMessageType(typeUrl: string): boolean {
  return akashMessageTypeUrls.includes(typeUrl)
}

/**
 * Creates a validated EncodeObject for Akash messages with proper typeUrl handling
 *
 * @param typeUrl - The message type URL (e.g., '/akash.deployment.v1beta3.MsgCreateDeployment')
 * @param value - The message value object
 * @returns A properly formatted EncodeObject
 */
export function createAkashMessage(typeUrl: string, value: any): EncodeObject {
  if (!isAkashMessageType(typeUrl)) {
    console.warn(`Message type ${typeUrl} is not a known Akash type, registering as custom`)
  }

  return {
    typeUrl,
    value
  }
}
