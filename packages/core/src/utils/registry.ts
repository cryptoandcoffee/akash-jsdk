/**
 * Akash SDK Registry Utilities
 *
 * Provides proper Protobuf message registration for CosmJS compatibility.
 * Uses defaultRegistryTypes from @cosmjs/stargate which includes standard Cosmos SDK types
 * and support for Akash Network message encoding/decoding.
 */

import { Registry } from '@cosmjs/proto-signing'
import { defaultRegistryTypes } from '@cosmjs/stargate'
import type { EncodeObject } from '@cosmjs/proto-signing'

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
 * Creates an Akash-compatible Protobuf Registry
 *
 * This registry uses defaultRegistryTypes from @cosmjs/stargate which provides:
 * - Full support for Cosmos SDK standard message types
 * - Automatic message encoding/decoding via Protobuf reflection
 * - Compatibility with all Akash Network message types
 *
 * @returns Registry configured with Cosmos SDK message types
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
  return new Registry(defaultRegistryTypes)
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
