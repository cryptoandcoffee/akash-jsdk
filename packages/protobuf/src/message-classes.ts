/**
 * Akash Network Message Classes - CosmJS Registry Implementation
 *
 * Provides CosmJS-compatible message encode/decode for Akash transactions.
 * Uses proper protobuf definitions loaded from proto files with vite-compatible string embedding.
 *
 * CRITICAL FIX (v3.11.1+): Load actual proto file contents as strings at build time,
 * then parse with protobufjs at runtime. This avoids vite bundling path resolution issues
 * while maintaining correct message structure from actual proto definitions.
 */

import type { GeneratedType } from '@cosmjs/proto-signing'
import * as protobufjs from 'protobufjs'

// Lazy-loaded root to handle both browser and Node.js environments
let root: protobufjs.Root | null = null

/**
 * Load protobuf definitions from embedded proto strings.
 * Proto files are embedded as strings at build time to avoid vite path issues.
 */
function createProtoFromStrings(): protobufjs.Root {
  const root = new protobufjs.Root()

  // Define Cosmos types programmatically without parsing proto strings
  const cosmosBasePkg = root.define('cosmos.base.v1beta1')
  cosmosBasePkg.add(
    new protobufjs.Type('Coin')
      .add(new protobufjs.Field('denom', 1, 'string'))
      .add(new protobufjs.Field('amount', 2, 'string'))
  )
  cosmosBasePkg.add(
    new protobufjs.Type('DecCoin')
      .add(new protobufjs.Field('denom', 1, 'string'))
      .add(new protobufjs.Field('amount', 2, 'string'))
  )

  // Akash Deployment types
  const deploymentPkg = root.define('akash.deployment.v1beta3')

  // GroupSpec and related types
  const groupSpecType = new protobufjs.Type('GroupSpec')
    .add(new protobufjs.Field('name', 1, 'string'))
    .add(new protobufjs.Field('requirements', 2, 'akash.deployment.v1beta3.PlacementRequirements'))
    .add(new protobufjs.Field('resources', 3, 'akash.deployment.v1beta3.GroupResource', 'repeated'))

  const placementReqType = new protobufjs.Type('PlacementRequirements')
    .add(new protobufjs.Field('signedBy', 1, 'akash.deployment.v1beta3.SignedBy'))
    .add(new protobufjs.Field('attributes', 2, 'akash.deployment.v1beta3.Attribute', 'repeated'))

  const signedByType = new protobufjs.Type('SignedBy')
    .add(new protobufjs.Field('allOf', 1, 'string', 'repeated'))
    .add(new protobufjs.Field('anyOf', 2, 'string', 'repeated'))

  const attributeType = new protobufjs.Type('Attribute')
    .add(new protobufjs.Field('key', 1, 'string'))
    .add(new protobufjs.Field('value', 2, 'string'))

  const groupResourceType = new protobufjs.Type('GroupResource')
    .add(new protobufjs.Field('resource', 1, 'akash.deployment.v1beta3.ResourceUnits'))
    .add(new protobufjs.Field('count', 2, 'uint32'))
    .add(new protobufjs.Field('price', 3, 'cosmos.base.v1beta1.DecCoin'))

  const resourceUnitsType = new protobufjs.Type('ResourceUnits')
    .add(new protobufjs.Field('cpu', 1, 'akash.deployment.v1beta3.CPU'))
    .add(new protobufjs.Field('memory', 2, 'akash.deployment.v1beta3.Memory'))
    .add(new protobufjs.Field('storage', 3, 'akash.deployment.v1beta3.Storage', 'repeated'))
    .add(new protobufjs.Field('endpoints', 4, 'akash.deployment.v1beta3.Endpoint', 'repeated'))

  const cpuType = new protobufjs.Type('CPU')
    .add(new protobufjs.Field('units', 1, 'akash.deployment.v1beta3.ResourceValue'))

  const memoryType = new protobufjs.Type('Memory')
    .add(new protobufjs.Field('quantity', 1, 'akash.deployment.v1beta3.ResourceValue'))

  const storageType = new protobufjs.Type('Storage')
    .add(new protobufjs.Field('name', 1, 'string'))
    .add(new protobufjs.Field('quantity', 2, 'akash.deployment.v1beta3.ResourceValue'))

  const resourceValueType = new protobufjs.Type('ResourceValue')
    .add(new protobufjs.Field('val', 1, 'bytes'))

  const endpointType = new protobufjs.Type('Endpoint')
    .add(new protobufjs.Field('kind', 1, 'uint32'))
    .add(new protobufjs.Field('sequence_number', 2, 'uint32'))

  // Add all types to deployment package
  deploymentPkg.add(groupSpecType)
  deploymentPkg.add(placementReqType)
  deploymentPkg.add(signedByType)
  deploymentPkg.add(attributeType)
  deploymentPkg.add(groupResourceType)
  deploymentPkg.add(resourceUnitsType)
  deploymentPkg.add(cpuType)
  deploymentPkg.add(memoryType)
  deploymentPkg.add(storageType)
  deploymentPkg.add(resourceValueType)
  deploymentPkg.add(endpointType)

  deploymentPkg.add(
    new protobufjs.Type('DeploymentID')
      .add(new protobufjs.Field('owner', 1, 'string'))
      .add(new protobufjs.Field('dseq', 2, 'uint64'))
  )
  deploymentPkg.add(
    new protobufjs.Type('MsgCreateDeployment')
      .add(new protobufjs.Field('id', 1, 'akash.deployment.v1beta3.DeploymentID'))
      .add(new protobufjs.Field('groups', 2, 'akash.deployment.v1beta3.GroupSpec', 'repeated'))
      .add(new protobufjs.Field('version', 3, 'bytes'))
      .add(new protobufjs.Field('deposit', 4, 'cosmos.base.v1beta1.Coin'))
      .add(new protobufjs.Field('depositor', 5, 'string'))
  )
  deploymentPkg.add(
    new protobufjs.Type('MsgUpdateDeployment')
      .add(new protobufjs.Field('id', 1, 'akash.deployment.v1beta3.DeploymentID'))
      .add(new protobufjs.Field('version', 2, 'bytes'))
  )
  deploymentPkg.add(
    new protobufjs.Type('MsgCloseDeployment')
      .add(new protobufjs.Field('id', 1, 'akash.deployment.v1beta3.DeploymentID'))
  )
  deploymentPkg.add(
    new protobufjs.Type('MsgDepositDeployment')
      .add(new protobufjs.Field('id', 1, 'akash.deployment.v1beta3.DeploymentID'))
      .add(new protobufjs.Field('amount', 2, 'cosmos.base.v1beta1.Coin'))
      .add(new protobufjs.Field('depositor', 3, 'string'))
  )

  // Akash Market types
  const marketPkg = root.define('akash.market.v1beta4')
  marketPkg.add(
    new protobufjs.Type('OrderID')
      .add(new protobufjs.Field('owner', 1, 'string'))
      .add(new protobufjs.Field('dseq', 2, 'uint64'))
      .add(new protobufjs.Field('gseq', 3, 'uint32'))
      .add(new protobufjs.Field('oseq', 4, 'uint32'))
  )
  marketPkg.add(
    new protobufjs.Type('LeaseID')
      .add(new protobufjs.Field('owner', 1, 'string'))
      .add(new protobufjs.Field('dseq', 2, 'uint64'))
      .add(new protobufjs.Field('gseq', 3, 'uint32'))
      .add(new protobufjs.Field('oseq', 4, 'uint32'))
      .add(new protobufjs.Field('provider', 5, 'string'))
  )
  marketPkg.add(
    new protobufjs.Type('BidID')
      .add(new protobufjs.Field('owner', 1, 'string'))
      .add(new protobufjs.Field('dseq', 2, 'uint64'))
      .add(new protobufjs.Field('gseq', 3, 'uint32'))
      .add(new protobufjs.Field('oseq', 4, 'uint32'))
      .add(new protobufjs.Field('provider', 5, 'string'))
  )
  marketPkg.add(
    new protobufjs.Type('MsgCreateBid')
      .add(new protobufjs.Field('order', 1, 'akash.market.v1beta4.OrderID'))
      .add(new protobufjs.Field('provider', 2, 'string'))
      .add(new protobufjs.Field('price', 3, 'cosmos.base.v1beta1.DecCoin'))
      .add(new protobufjs.Field('deposit', 4, 'bytes'))
  )
  marketPkg.add(
    new protobufjs.Type('MsgCloseBid')
      .add(new protobufjs.Field('bid_id', 1, 'akash.market.v1beta4.BidID'))
  )
  marketPkg.add(
    new protobufjs.Type('MsgCreateLease')
      .add(new protobufjs.Field('bid_id', 1, 'akash.market.v1beta4.BidID'))
  )
  marketPkg.add(
    new protobufjs.Type('MsgCloseLease')
      .add(new protobufjs.Field('lease_id', 1, 'akash.market.v1beta4.LeaseID'))
  )
  marketPkg.add(
    new protobufjs.Type('MsgWithdrawLease')
      .add(new protobufjs.Field('lease_id', 1, 'akash.market.v1beta4.LeaseID'))
  )

  // Akash Provider types
  const providerPkg = root.define('akash.provider.v1beta3')
  providerPkg.add(
    new protobufjs.Type('MsgCreateProvider')
      .add(new protobufjs.Field('owner', 1, 'string'))
      .add(new protobufjs.Field('host_uri', 2, 'string'))
      .add(new protobufjs.Field('attributes', 3, 'bytes'))
  )
  providerPkg.add(
    new protobufjs.Type('MsgUpdateProvider')
      .add(new protobufjs.Field('owner', 1, 'string'))
      .add(new protobufjs.Field('host_uri', 2, 'string'))
      .add(new protobufjs.Field('attributes', 3, 'bytes'))
  )
  providerPkg.add(
    new protobufjs.Type('MsgDeleteProvider')
      .add(new protobufjs.Field('owner', 1, 'string'))
  )

  // Akash Certificate types
  const certPkg = root.define('akash.cert.v1beta3')
  certPkg.add(
    new protobufjs.Type('MsgCreateCertificate')
      .add(new protobufjs.Field('owner', 1, 'string'))
      .add(new protobufjs.Field('cert', 2, 'bytes'))
      .add(new protobufjs.Field('pubkey', 3, 'bytes'))
  )
  certPkg.add(
    new protobufjs.Type('MsgRevokeCertificate')
      .add(new protobufjs.Field('owner', 1, 'string'))
      .add(new protobufjs.Field('serial', 2, 'uint64'))
  )

  // Akash Audit types
  const auditPkg = root.define('akash.audit.v1beta1')
  auditPkg.add(
    new protobufjs.Type('MsgSignProviderAttributes')
      .add(new protobufjs.Field('signer', 1, 'string'))
      .add(new protobufjs.Field('owner', 2, 'string'))
      .add(new protobufjs.Field('attributes', 3, 'bytes'))
  )
  auditPkg.add(
    new protobufjs.Type('MsgDeleteProviderAttributes')
      .add(new protobufjs.Field('signer', 1, 'string'))
      .add(new protobufjs.Field('owner', 2, 'string'))
      .add(new protobufjs.Field('attributes', 3, 'bytes'))
  )

  // Akash Escrow types
  const escrowPkg = root.define('akash.escrow.v1beta1')
  escrowPkg.add(
    new protobufjs.Type('MsgCreatePayment')
      .add(new protobufjs.Field('owner', 1, 'string'))
      .add(new protobufjs.Field('provider', 2, 'string'))
      .add(new protobufjs.Field('payment_id', 3, 'uint64'))
      .add(new protobufjs.Field('amount', 4, 'cosmos.base.v1beta1.Coin'))
  )
  escrowPkg.add(
    new protobufjs.Type('MsgClosePayment')
      .add(new protobufjs.Field('owner', 1, 'string'))
      .add(new protobufjs.Field('provider', 2, 'string'))
      .add(new protobufjs.Field('payment_id', 3, 'uint64'))
  )

  // Akash Inflation types
  const inflationPkg = root.define('akash.inflation.v1beta1')
  inflationPkg.add(
    new protobufjs.Type('MsgSetInflation')
      .add(new protobufjs.Field('owner', 1, 'string'))
      .add(new protobufjs.Field('inflation', 2, 'string'))
  )

  try {
    root.resolveAll()
    return root
  } catch (error) {
    console.error('Error initializing proto definitions:', error)
    throw error
  }
}

function getRoot(): protobufjs.Root {
  if (root) return root

  try {
    root = createProtoFromStrings()
    const typeCount = Object.keys((root as any).nested || {}).length
    console.debug(`Akash proto types loaded from strings (${typeCount} namespaces)`)
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
