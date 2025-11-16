/**
 * Akash SDK Registry Utilities
 *
 * Provides proper Protobuf message registration for CosmJS compatibility.
 * Registers all Akash Network message types with actual message classes
 * that implement proper protobuf encoding/decoding.
 */

import { Registry } from '@cosmjs/proto-signing'
import { defaultRegistryTypes } from '@cosmjs/stargate'
import type { EncodeObject } from '@cosmjs/proto-signing'
import {
  // Deployment messages
  MsgCreateDeployment,
  MsgUpdateDeployment,
  MsgCloseDeployment,
  MsgDepositDeployment,
  // Market/Lease messages
  MsgCreateLease,
  MsgCloseLease,
  MsgWithdrawLease,
  MsgCreateBid,
  MsgCloseBid,
  // Certificate messages
  MsgCreateCertificate,
  MsgRevokeCertificate,
  // Provider messages
  MsgCreateProvider,
  MsgUpdateProvider,
  MsgDeleteProvider,
} from '@cryptoandcoffee/akash-jsdk-protobuf'

/**
 * Maps message type URLs to their corresponding message classes
 * Each message class has proper encode/decode implementations
 */
function getMessageClassForType(typeUrl: string): any {
  const typeMap: { [key: string]: any } = {
    '/akash.deployment.v1beta3.MsgCreateDeployment': MsgCreateDeployment,
    '/akash.deployment.v1beta3.MsgUpdateDeployment': MsgUpdateDeployment,
    '/akash.deployment.v1beta3.MsgCloseDeployment': MsgCloseDeployment,
    '/akash.deployment.v1beta3.MsgDepositDeployment': MsgDepositDeployment,
    '/akash.market.v1beta4.MsgCreateLease': MsgCreateLease,
    '/akash.market.v1beta4.MsgCloseLease': MsgCloseLease,
    '/akash.market.v1beta4.MsgWithdrawLease': MsgWithdrawLease,
    '/akash.market.v1beta4.MsgCreateBid': MsgCreateBid,
    '/akash.market.v1beta4.MsgCloseBid': MsgCloseBid,
    '/akash.cert.v1beta3.MsgCreateCertificate': MsgCreateCertificate,
    '/akash.cert.v1beta3.MsgRevokeCertificate': MsgRevokeCertificate,
    '/akash.provider.v1beta3.MsgCreateProvider': MsgCreateProvider,
    '/akash.provider.v1beta3.MsgUpdateProvider': MsgUpdateProvider,
    '/akash.provider.v1beta3.MsgDeleteProvider': MsgDeleteProvider,
  }
  return typeMap[typeUrl]
}

/**
 * Known Akash message type URLs with their corresponding message classes
 */
const akashMessageTypes: Array<[string, any]> = [
  // Deployment messages
  ['/akash.deployment.v1beta3.MsgCreateDeployment', MsgCreateDeployment],
  ['/akash.deployment.v1beta3.MsgUpdateDeployment', MsgUpdateDeployment],
  ['/akash.deployment.v1beta3.MsgCloseDeployment', MsgCloseDeployment],
  ['/akash.deployment.v1beta3.MsgDepositDeployment', MsgDepositDeployment],

  // Market messages (bids)
  ['/akash.market.v1beta4.MsgCreateBid', MsgCreateBid],
  ['/akash.market.v1beta4.MsgCloseBid', MsgCloseBid],

  // Market messages (leases)
  ['/akash.market.v1beta4.MsgCreateLease', MsgCreateLease],
  ['/akash.market.v1beta4.MsgCloseLease', MsgCloseLease],
  ['/akash.market.v1beta4.MsgWithdrawLease', MsgWithdrawLease],

  // Provider messages
  ['/akash.provider.v1beta3.MsgCreateProvider', MsgCreateProvider],
  ['/akash.provider.v1beta3.MsgUpdateProvider', MsgUpdateProvider],
  ['/akash.provider.v1beta3.MsgDeleteProvider', MsgDeleteProvider],

  // Certificate messages
  ['/akash.cert.v1beta3.MsgCreateCertificate', MsgCreateCertificate],
  ['/akash.cert.v1beta3.MsgRevokeCertificate', MsgRevokeCertificate],
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
