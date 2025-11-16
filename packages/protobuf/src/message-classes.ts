/**
 * Akash Network Message Classes - protobufjs Implementation
 *
 * Uses protobufjs library to properly encode/decode protobuf messages.
 * This eliminates the custom encoder bugs that plagued v3.10.0-v3.10.7.
 *
 * Each message has encode() and decode() methods compatible with CosmJS Registry.
 */

import type { GeneratedType } from '@cosmjs/proto-signing'
import * as protobufjs from 'protobufjs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import * as fs from 'fs'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Lazy-loaded root to handle both browser and Node.js environments
let root: protobufjs.Root | null = null

function getRoot(): protobufjs.Root {
  if (root) return root

  try {
    root = new protobufjs.Root()

    // Try to load from proto files if in Node.js environment
    if (typeof window === 'undefined') {
      try {
        // Try multiple possible locations for proto files
        // When built from source: ../proto (from dist folder)
        // When published to npm: ../../proto (from node_modules/package/dist)
        let protoDir = join(__dirname, '../proto')

        if (!fs.existsSync(protoDir)) {
          // Try parent directory (for npm-installed packages)
          protoDir = join(__dirname, '../../proto')
        }

        if (fs.existsSync(protoDir)) {
          const protoFiles = getAllProtoFilesSync(protoDir)

          if (protoFiles.length === 0) {
            console.error(`No proto files found in ${protoDir}`)
          }

          for (const file of protoFiles) {
            try {
              const content = fs.readFileSync(file, 'utf8')
              const proto = protobufjs.parse(content, {
                keepCase: true,
                alternateCommentMode: true
              })
              if ((proto as any).nested) {
                root.add((proto as any).nested)
              }
            } catch (e) {
              console.warn(`Warning: Could not parse ${file}:`, e)
            }
          }

          root.resolveAll()
        } else {
          console.error(`Proto directory not found. Checked: ${join(__dirname, '../proto')} and ${join(__dirname, '../../proto')}`)
        }
      } catch (error) {
        console.warn('Could not load proto files from disk:', error)
      }
    }

    return root
  } catch (error) {
    console.error('Error loading protobuf definitions:', error)
    throw error
  }
}

function getAllProtoFilesSync(dir: string): string[] {
  try {
    const files: string[] = []

    if (!fs.existsSync(dir)) {
      return files
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...getAllProtoFilesSync(fullPath))
      } else if (entry.name.endsWith('.proto')) {
        files.push(fullPath)
      }
    }

    return files
  } catch {
    return []
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

        // Verify message
        const error = type.verify(message)
        if (error) {
          throw error
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
