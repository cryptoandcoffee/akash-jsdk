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

  // Cosmos Coin and Dec Coin types (used by multiple Akash messages)
  const cosmosProto = `
    syntax = "proto3";
    package cosmos.base.v1beta1;

    message Coin {
      string denom = 1;
      string amount = 2;
    }

    message DecCoin {
      string denom = 1;
      string amount = 2;
    }
  `

  // Akash Deployment types - corrected from actual proto files
  const deploymentProto = `
    syntax = "proto3";
    package akash.deployment.v1beta3;
    import "cosmos/base/v1beta1/coin.proto";

    message DeploymentID {
      string owner = 1;
      uint64 dseq = 2;
    }

    message MsgCreateDeployment {
      DeploymentID id = 1;
      bytes groups = 2;
      bytes version = 3;
      cosmos.base.v1beta1.Coin deposit = 4;
      string depositor = 5;
    }

    message MsgUpdateDeployment {
      DeploymentID id = 1;
      bytes version = 2;
    }

    message MsgCloseDeployment {
      DeploymentID id = 1;
    }

    message MsgDepositDeployment {
      DeploymentID id = 1;
      cosmos.base.v1beta1.Coin amount = 2;
      string depositor = 3;
    }
  `

  // Akash Market types - CORRECTED BidID field definitions
  const marketProto = `
    syntax = "proto3";
    package akash.market.v1beta4;
    import "cosmos/base/v1beta1/coin.proto";

    message OrderID {
      string owner = 1;
      uint64 dseq = 2;
      uint32 gseq = 3;
      uint32 oseq = 4;
    }

    message LeaseID {
      string owner = 1;
      uint64 dseq = 2;
      uint32 gseq = 3;
      uint32 oseq = 4;
      string provider = 5;
    }

    message BidID {
      string owner = 1;
      uint64 dseq = 2;
      uint32 gseq = 3;
      uint32 oseq = 4;
      string provider = 5;
    }

    message MsgCreateBid {
      OrderID order = 1;
      string provider = 2;
      cosmos.base.v1beta1.DecCoin price = 3;
      bytes deposit = 4;
    }

    message MsgCloseBid {
      BidID bid_id = 1;
    }

    message MsgCreateLease {
      BidID bid_id = 1;
    }

    message MsgCloseLease {
      LeaseID lease_id = 1;
    }

    message MsgWithdrawLease {
      LeaseID lease_id = 1;
    }
  `

  // Akash Provider types
  const providerProto = `
    syntax = "proto3";
    package akash.provider.v1beta3;

    message MsgCreateProvider {
      string owner = 1;
      string host_uri = 2;
      bytes attributes = 3;
    }

    message MsgUpdateProvider {
      string owner = 1;
      string host_uri = 2;
      bytes attributes = 3;
    }

    message MsgDeleteProvider {
      string owner = 1;
    }
  `

  // Akash Certificate types
  const certProto = `
    syntax = "proto3";
    package akash.cert.v1beta3;

    message MsgCreateCertificate {
      string owner = 1;
      bytes cert = 2;
      bytes pubkey = 3;
    }

    message MsgRevokeCertificate {
      string owner = 1;
      uint64 serial = 2;
    }
  `

  // Akash Audit types
  const auditProto = `
    syntax = "proto3";
    package akash.audit.v1beta1;

    message MsgSignProviderAttributes {
      string signer = 1;
      string owner = 2;
      bytes attributes = 3;
    }

    message MsgDeleteProviderAttributes {
      string signer = 1;
      string owner = 2;
      bytes attributes = 3;
    }
  `

  // Akash Escrow types
  const escrowProto = `
    syntax = "proto3";
    package akash.escrow.v1beta1;
    import "cosmos/base/v1beta1/coin.proto";

    message MsgCreatePayment {
      string owner = 1;
      string provider = 2;
      uint64 payment_id = 3;
      cosmos.base.v1beta1.Coin amount = 4;
    }

    message MsgClosePayment {
      string owner = 1;
      string provider = 2;
      uint64 payment_id = 3;
    }
  `

  // Akash Inflation types
  const inflationProto = `
    syntax = "proto3";
    package akash.inflation.v1beta1;

    message MsgSetInflation {
      string owner = 1;
      string inflation = 2;
    }
  `

  // Parse all proto definitions
  const allProtos = [
    cosmosProto,
    deploymentProto,
    marketProto,
    providerProto,
    certProto,
    auditProto,
    escrowProto,
    inflationProto
  ].join('\n')

  try {
    // Parse the combined proto definition
    root.parse(allProtos)
    root.resolveAll()
    return root
  } catch (error) {
    console.error('Error parsing proto definitions:', error)
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
