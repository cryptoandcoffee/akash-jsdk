/**
 * Akash SDK Registry Utilities
 *
 * Provides proper Protobuf message registration for CosmJS compatibility.
 * Registers all Akash Network message types with actual proto-generated message classes
 * that implement proper protobuf encoding/decoding using BinaryWriter.
 */

import { Registry } from '@cosmjs/proto-signing'
import { defaultRegistryTypes } from '@cosmjs/stargate'
import type { EncodeObject } from '@cosmjs/proto-signing'
// Import proto-generated message types with proper encode/decode
// @ts-ignore - Import from generated proto files (will be available after build/publish)
import { MsgCreateDeployment } from '@cryptoandcoffee/akash-jsdk-protobuf/generated/akash/deployment/v1beta4/deploymentmsg'
// @ts-ignore - Import from generated proto files (will be available after build/publish)
import { MsgUpdateDeployment } from '@cryptoandcoffee/akash-jsdk-protobuf/generated/akash/deployment/v1beta4/deploymentmsg'
// @ts-ignore - Import from generated proto files (will be available after build/publish)
import { MsgCloseDeployment } from '@cryptoandcoffee/akash-jsdk-protobuf/generated/akash/deployment/v1beta4/deploymentmsg'

/**
 * Maps message type URLs to their corresponding proto-generated message classes
 * Each message class has proper encode/decode implementations with BinaryWriter
 */
function getMessageClassForType(typeUrl: string): any {
  const typeMap: { [key: string]: any } = {
    // Mainnet uses v1beta4 for deployment messages
    '/akash.deployment.v1beta4.MsgCreateDeployment': MsgCreateDeployment,
    '/akash.deployment.v1beta4.MsgUpdateDeployment': MsgUpdateDeployment,
    '/akash.deployment.v1beta4.MsgCloseDeployment': MsgCloseDeployment,
  }
  return typeMap[typeUrl]
}

/**
 * Known Akash message type URLs with their corresponding proto-generated message classes
 * Note: Mainnet uses v1beta4 for deployment messages
 */
const akashMessageTypes: Array<[string, any]> = [
  // Deployment messages (mainnet uses v1beta4)
  ['/akash.deployment.v1beta4.MsgCreateDeployment', MsgCreateDeployment],
  ['/akash.deployment.v1beta4.MsgUpdateDeployment', MsgUpdateDeployment],
  ['/akash.deployment.v1beta4.MsgCloseDeployment', MsgCloseDeployment],
]

/**
 * Creates an Akash-compatible Protobuf Registry
 *
 * This registry:
 * - Includes all standard Cosmos SDK message types from defaultRegistryTypes
 * - Registers all Akash Network message types with actual message classes
 * - Each message class has proper protobuf encode/decode implementation
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

  // Register all Akash message types with actual message classes
  for (const [typeUrl, messageClass] of akashMessageTypes) {
    try {
      registry.register(typeUrl, messageClass)
    } catch (error) {
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
  return akashMessageTypes.map(([typeUrl]) => typeUrl)
}

/**
 * Validates if a given typeUrl is a supported Akash message type
 *
 * @param typeUrl - The message type URL to validate
 * @returns true if the typeUrl is a known Akash message type
 */
export function isAkashMessageType(typeUrl: string): boolean {
  return akashMessageTypes.some(([url]) => url === typeUrl)
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
    console.warn(`Message type ${typeUrl} is not a known Akash type`)
  }

  return {
    typeUrl,
    value
  }
}

/**
 * Gets message class for a given type URL (used internally by message classes)
 * @internal
 */
export { getMessageClassForType }
