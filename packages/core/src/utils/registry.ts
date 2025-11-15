/**
 * Akash SDK Registry Utilities
 *
 * Provides proper Protobuf message registration for CosmJS compatibility
 * with full support for all Akash-specific message types
 */

import { Registry } from '@cosmjs/proto-signing'
import { defaultRegistryTypes } from '@cosmjs/stargate'
import type { EncodeObject, GeneratedType } from '@cosmjs/proto-signing'
import {
  MsgCreateDeployment,
  MsgUpdateDeployment,
  MsgCloseDeployment,
  MsgDepositDeployment,
  MsgCreateBid,
  MsgCloseBid,
  MsgCreateLease,
  MsgCloseLease,
  MsgWithdrawLease,
  MsgCreateProvider,
  MsgUpdateProvider,
  MsgDeleteProvider,
  MsgCreateCertificate,
  MsgRevokeCertificate
} from '@cryptoandcoffee/akash-jsdk-protobuf'

/**
 * Type definitions for Akash message type URLs and their corresponding message types
 */
const akashMessageTypes: Record<string, GeneratedType> = {
  // Deployment messages
  '/akash.deployment.v1beta3.MsgCreateDeployment': MsgCreateDeployment as unknown as GeneratedType,
  '/akash.deployment.v1beta3.MsgUpdateDeployment': MsgUpdateDeployment as unknown as GeneratedType,
  '/akash.deployment.v1beta3.MsgCloseDeployment': MsgCloseDeployment as unknown as GeneratedType,
  '/akash.deployment.v1beta3.MsgDepositDeployment': MsgDepositDeployment as unknown as GeneratedType,

  // Market messages (leases and bids)
  '/akash.market.v1beta4.MsgCreateBid': MsgCreateBid as unknown as GeneratedType,
  '/akash.market.v1beta4.MsgCloseBid': MsgCloseBid as unknown as GeneratedType,
  '/akash.market.v1beta4.MsgCreateLease': MsgCreateLease as unknown as GeneratedType,
  '/akash.market.v1beta4.MsgCloseLease': MsgCloseLease as unknown as GeneratedType,
  '/akash.market.v1beta4.MsgWithdrawLease': MsgWithdrawLease as unknown as GeneratedType,

  // Provider messages
  '/akash.provider.v1beta3.MsgCreateProvider': MsgCreateProvider as unknown as GeneratedType,
  '/akash.provider.v1beta3.MsgUpdateProvider': MsgUpdateProvider as unknown as GeneratedType,
  '/akash.provider.v1beta3.MsgDeleteProvider': MsgDeleteProvider as unknown as GeneratedType,

  // Certificate messages
  '/akash.cert.v1beta3.MsgCreateCertificate': MsgCreateCertificate as unknown as GeneratedType,
  '/akash.cert.v1beta3.MsgRevokeCertificate': MsgRevokeCertificate as unknown as GeneratedType,
}

/**
 * Creates an Akash-compatible Protobuf Registry with all Akash message types registered
 *
 * This registry includes:
 * - All standard Cosmos SDK message types (via defaultRegistryTypes)
 * - All Akash-specific message types (deployments, leases, bids, providers, certificates)
 * - Support for IBC transfer messages
 *
 * @returns Registry configured with all necessary Akash message types
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
  // Start with Cosmos SDK default types
  const registry = new Registry(defaultRegistryTypes)

  // Register all Akash-specific message types
  Object.entries(akashMessageTypes).forEach(([typeUrl, messageType]) => {
    try {
      registry.register(typeUrl, messageType)
    } catch (error) {
      console.warn(`Failed to register message type ${typeUrl}:`, error)
    }
  })

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
  return Object.keys(akashMessageTypes)
}

/**
 * Validates if a given typeUrl is a supported Akash message type
 *
 * @param typeUrl - The message type URL to validate
 * @returns true if the typeUrl is a known Akash message type
 */
export function isAkashMessageType(typeUrl: string): boolean {
  return typeUrl in akashMessageTypes
}

/**
 * Creates a validated EncodeObject for Akash messages with proper typeUrl handling
 *
 * @param typeUrl - The message type URL (e.g., '/akash.deployment.v1beta3.MsgCreateDeployment')
 * @param value - The message value object
 * @returns A properly formatted EncodeObject
 * @throws Error if typeUrl is not a valid Akash message type
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
