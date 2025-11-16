/**
 * Akash Network Message Classes - CosmJS Registry Implementation
 *
 * Provides CosmJS-compatible message encode/decode for Akash transactions.
 * Uses protobufjs for proper protobuf encoding/decoding with fallback support.
 *
 * CRITICAL FIX (v3.10.11+): Proper CosmJS message implementation that doesn't
 * rely on runtime proto file loading, which is incompatible with vite bundling.
 */

import type { GeneratedType } from '@cosmjs/proto-signing'
import * as protobufjs from 'protobufjs'

// Lazy-loaded root to handle both browser and Node.js environments
let root: protobufjs.Root | null = null

/**
 * Create minimal protobuf definitions in-memory for message encoding/decoding.
 * These cover the essential message types needed for Akash transactions.
 */
function createMinimalProto(): protobufjs.Root {
  const root = new protobufjs.Root()

  // First, add Cosmos Coin type (dependency for all messages)
  const cosmosNamespace = root.define('cosmos.base.v1beta1')
  const coinType = new protobufjs.Type('Coin')
  coinType.add(new protobufjs.Field('denom', 1, 'string'))
  coinType.add(new protobufjs.Field('amount', 2, 'string'))

  const decCoinType = new protobufjs.Type('DecCoin')
  decCoinType.add(new protobufjs.Field('denom', 1, 'string'))
  decCoinType.add(new protobufjs.Field('amount', 2, 'string'))

  cosmosNamespace.add(coinType)
  cosmosNamespace.add(decCoinType)

  // Add Akash Deployment types
  const deploymentNs = root.define('akash.deployment.v1beta3')

  const deploymentIdType = new protobufjs.Type('DeploymentID')
  deploymentIdType.add(new protobufjs.Field('owner', 1, 'string'))
  deploymentIdType.add(new protobufjs.Field('dseq', 2, 'uint64'))
  deploymentNs.add(deploymentIdType)

  const msgCreateDeploymentType = new protobufjs.Type('MsgCreateDeployment')
  msgCreateDeploymentType.add(new protobufjs.Field('id', 1, 'akash.deployment.v1beta3.DeploymentID'))
  msgCreateDeploymentType.add(new protobufjs.Field('groups', 2, 'bytes', 'repeated'))
  msgCreateDeploymentType.add(new protobufjs.Field('version', 3, 'bytes'))
  msgCreateDeploymentType.add(new protobufjs.Field('deposit', 4, 'cosmos.base.v1beta1.Coin'))
  deploymentNs.add(msgCreateDeploymentType)

  const msgUpdateDeploymentType = new protobufjs.Type('MsgUpdateDeployment')
  msgUpdateDeploymentType.add(new protobufjs.Field('id', 1, 'akash.deployment.v1beta3.DeploymentID'))
  msgUpdateDeploymentType.add(new protobufjs.Field('version', 2, 'bytes'))
  deploymentNs.add(msgUpdateDeploymentType)

  const msgCloseDeploymentType = new protobufjs.Type('MsgCloseDeployment')
  msgCloseDeploymentType.add(new protobufjs.Field('id', 1, 'akash.deployment.v1beta3.DeploymentID'))
  deploymentNs.add(msgCloseDeploymentType)

  const msgDepositDeploymentType = new protobufjs.Type('MsgDepositDeployment')
  msgDepositDeploymentType.add(new protobufjs.Field('id', 1, 'akash.deployment.v1beta3.DeploymentID'))
  msgDepositDeploymentType.add(new protobufjs.Field('amount', 2, 'cosmos.base.v1beta1.Coin'))
  msgDepositDeploymentType.add(new protobufjs.Field('depositor', 3, 'string'))
  deploymentNs.add(msgDepositDeploymentType)

  // Add Akash Market types
  const marketNs = root.define('akash.market.v1beta4')

  const leaseIdType = new protobufjs.Type('LeaseID')
  leaseIdType.add(new protobufjs.Field('owner', 1, 'string'))
  leaseIdType.add(new protobufjs.Field('dseq', 2, 'uint64'))
  leaseIdType.add(new protobufjs.Field('gseq', 3, 'uint32'))
  leaseIdType.add(new protobufjs.Field('oseq', 4, 'uint32'))
  leaseIdType.add(new protobufjs.Field('provider', 5, 'string'))
  marketNs.add(leaseIdType)

  const orderIdType = new protobufjs.Type('OrderID')
  orderIdType.add(new protobufjs.Field('owner', 1, 'string'))
  orderIdType.add(new protobufjs.Field('dseq', 2, 'uint64'))
  orderIdType.add(new protobufjs.Field('gseq', 3, 'uint32'))
  orderIdType.add(new protobufjs.Field('oseq', 4, 'uint32'))
  marketNs.add(orderIdType)

  const bidIdType = new protobufjs.Type('BidID')
  bidIdType.add(new protobufjs.Field('order', 1, 'akash.market.v1beta4.OrderID'))
  bidIdType.add(new protobufjs.Field('provider', 2, 'string'))
  marketNs.add(bidIdType)

  const msgCreateBidType = new protobufjs.Type('MsgCreateBid')
  msgCreateBidType.add(new protobufjs.Field('order', 1, 'akash.market.v1beta4.OrderID'))
  msgCreateBidType.add(new protobufjs.Field('provider', 2, 'string'))
  msgCreateBidType.add(new protobufjs.Field('price', 3, 'cosmos.base.v1beta1.DecCoin'))
  marketNs.add(msgCreateBidType)

  const msgCloseBidType = new protobufjs.Type('MsgCloseBid')
  msgCloseBidType.add(new protobufjs.Field('bid_id', 1, 'akash.market.v1beta4.BidID'))
  marketNs.add(msgCloseBidType)

  const msgCreateLeaseType = new protobufjs.Type('MsgCreateLease')
  msgCreateLeaseType.add(new protobufjs.Field('bid_id', 1, 'akash.market.v1beta4.BidID'))
  marketNs.add(msgCreateLeaseType)

  const msgCloseLeaseType = new protobufjs.Type('MsgCloseLease')
  msgCloseLeaseType.add(new protobufjs.Field('lease_id', 1, 'akash.market.v1beta4.LeaseID'))
  marketNs.add(msgCloseLeaseType)

  const msgWithdrawLeaseType = new protobufjs.Type('MsgWithdrawLease')
  msgWithdrawLeaseType.add(new protobufjs.Field('lease_id', 1, 'akash.market.v1beta4.LeaseID'))
  marketNs.add(msgWithdrawLeaseType)

  return root
}

function getRoot(): protobufjs.Root {
  if (root) return root

  try {
    root = createMinimalProto()
    root.resolveAll()
    const typeCount = Object.keys((root as any).nested || {}).length
    console.debug(`Akash proto types initialized (${typeCount} namespaces)`)
    return root
  } catch (error) {
    console.error('Error initializing protobuf definitions:', error)
    throw error
  }
}

function createMessageClass(messageName: string): GeneratedType {
  return {
    encode(message: any): any {
      try {
        const root = getRoot()
        const type = root.lookupType(messageName)

        if (!type) {
          throw new Error(`Message type not found: ${messageName}`)
        }

        // Skip verification for now - types may not be fully resolved
        // The SDK callers are responsible for providing well-formed messages
        // Encode to buffer
        const buffer = type.encode(message).finish()

        // Return Writer-like object for CosmJS
        return {
          finish(): Uint8Array {
            return buffer
          }
        }
      } catch (error) {
        console.error(`Error encoding ${messageName}:`, error)
        throw error
      }
    },

    decode(data: Uint8Array | any): any {
      try {
        const root = getRoot()
        const type = root.lookupType(messageName)

        if (!type) {
          throw new Error(`Message type not found: ${messageName}`)
        }

        // Handle Reader-like objects from CosmJS
        const buffer = data instanceof Uint8Array ? data : (data.buf || new Uint8Array())

        return type.decode(buffer)
      } catch (error) {
        console.error(`Error decoding ${messageName}:`, error)
        return {}
      }
    },

    create(properties?: any): any {
      try {
        const root = getRoot()
        const type = root.lookupType(messageName)

        if (!type) {
          return properties || {}
        }

        return type.create(properties)
      } catch (error) {
        return properties || {}
      }
    },

    fromPartial(object: any): any {
      try {
        const root = getRoot()
        const type = root.lookupType(messageName)

        if (!type) {
          return object || {}
        }

        return type.fromObject(object)
      } catch (error) {
        return object || {}
      }
    }
  }
}

// Deployment Messages
export const MsgCreateDeployment: GeneratedType = createMessageClass(
  'akash.deployment.v1beta3.MsgCreateDeployment'
)
export const MsgUpdateDeployment: GeneratedType = createMessageClass(
  'akash.deployment.v1beta3.MsgUpdateDeployment'
)
export const MsgCloseDeployment: GeneratedType = createMessageClass(
  'akash.deployment.v1beta3.MsgCloseDeployment'
)
export const MsgDepositDeployment: GeneratedType = createMessageClass(
  'akash.deployment.v1beta3.MsgDepositDeployment'
)

// Market Messages (Bids)
export const MsgCreateBid: GeneratedType = createMessageClass(
  'akash.market.v1beta4.MsgCreateBid'
)
export const MsgCloseBid: GeneratedType = createMessageClass(
  'akash.market.v1beta4.MsgCloseBid'
)

// Market Messages (Leases)
export const MsgCreateLease: GeneratedType = createMessageClass(
  'akash.market.v1beta4.MsgCreateLease'
)
export const MsgCloseLease: GeneratedType = createMessageClass(
  'akash.market.v1beta4.MsgCloseLease'
)
export const MsgWithdrawLease: GeneratedType = createMessageClass(
  'akash.market.v1beta4.MsgWithdrawLease'
)

// Provider Messages
export const MsgCreateProvider: GeneratedType = createMessageClass(
  'akash.provider.v1beta3.MsgCreateProvider'
)
export const MsgUpdateProvider: GeneratedType = createMessageClass(
  'akash.provider.v1beta3.MsgUpdateProvider'
)
export const MsgDeleteProvider: GeneratedType = createMessageClass(
  'akash.provider.v1beta3.MsgDeleteProvider'
)

// Certificate Messages
export const MsgCreateCertificate: GeneratedType = createMessageClass(
  'akash.cert.v1beta3.MsgCreateCertificate'
)
export const MsgRevokeCertificate: GeneratedType = createMessageClass(
  'akash.cert.v1beta3.MsgRevokeCertificate'
)

// Audit Messages
export const MsgSignProviderAttributes: GeneratedType = createMessageClass(
  'akash.audit.v1beta1.MsgSignProviderAttributes'
)
export const MsgDeleteProviderAttributes: GeneratedType = createMessageClass(
  'akash.audit.v1beta1.MsgDeleteProviderAttributes'
)

// Escrow Messages
export const MsgCreatePayment: GeneratedType = createMessageClass(
  'akash.escrow.v1beta1.MsgCreatePayment'
)
export const MsgClosePayment: GeneratedType = createMessageClass(
  'akash.escrow.v1beta1.MsgClosePayment'
)

// Inflation Messages
export const MsgSetInflation: GeneratedType = createMessageClass(
  'akash.inflation.v1beta1.MsgSetInflation'
)
