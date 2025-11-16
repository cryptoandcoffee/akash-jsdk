/**
 * Akash Network Message Classes - protobufjs Implementation
 *
 * Uses protobufjs library to properly encode/decode protobuf messages.
 * This eliminates the custom encoder bugs that plagued v3.10.0-v3.10.7.
 *
 * Each message has encode() and decode() methods compatible with CosmJS Registry.
 *
 * CRITICAL FIX (v3.10.11+): Proto files are loaded from disk synchronously at runtime
 * rather than being embedded at build time, which eliminates vite bundling path issues.
 */

import type { GeneratedType } from '@cosmjs/proto-signing'
import * as protobufjs from 'protobufjs'
import { dirname, join } from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Lazy-loaded root to handle both browser and Node.js environments
let root: protobufjs.Root | null = null

/**
 * Get all .proto files recursively from a directory
 */
function getAllProtoFilesSync(dir: string): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) {
    return files
  }

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...getAllProtoFilesSync(fullPath))
      } else if (entry.name.endsWith('.proto')) {
        files.push(fullPath)
      }
    }
  } catch (e) {
    // Silently fail if directory doesn't exist or can't be read
  }

  return files
}

function getRoot(): protobufjs.Root {
  if (root) return root

  try {
    root = new protobufjs.Root()

    // Try to load from proto files if in Node.js environment
    if (typeof window === 'undefined') {
      try {
        // Find proto directory using multiple strategies
        let protoDir: string | null = null

        // Strategy 1: Relative to current module (compiled position)
        // When built: dist/message-classes.js, proto is at packages/protobuf/proto
        // __dirname will be /path/to/dist
        const relativePaths = [
          join(__dirname, '../proto'),           // ../proto (built development)
          join(__dirname, '../../proto'),        // ../../proto (npm node_modules)
          join(__dirname, '../../../proto'),     // ../../../proto (nested installs)
        ]

        for (const path of relativePaths) {
          if (fs.existsSync(path)) {
            protoDir = path
            console.debug(`Proto directory found (relative): ${protoDir}`)
            break
          }
        }

        // Strategy 2: Search from current working directory
        if (!protoDir) {
          const cwdSearch = join(process.cwd(), 'packages/protobuf/proto')
          if (fs.existsSync(cwdSearch)) {
            protoDir = cwdSearch
            console.debug(`Proto directory found (cwd): ${protoDir}`)
          }
        }

        if (protoDir) {
          const protoFiles = getAllProtoFilesSync(protoDir)
          console.debug(`Found ${protoFiles.length} proto files in ${protoDir}`)

          // Load all proto files by concatenating content
          // This approach ensures all types are available for resolution
          try {
            let concatContent = `syntax = "proto3";\n\n`
            let fileCount = 0

            for (const file of protoFiles) {
              try {
                let content = fs.readFileSync(file, 'utf8')
                // Remove the syntax declaration since we add it once at the top
                content = content.replace(/^\s*syntax\s*=\s*"proto3"\s*;?\s*\n\n?/m, '')
                // Keep package declarations - they're needed for namespacing
                concatContent += content + '\n\n'
                fileCount++
              } catch (e) {
                // Skip files that can't be read
              }
            }
            console.debug(`Concatenated ${fileCount}/${protoFiles.length} proto files (${concatContent.length} bytes)`)

            if (concatContent.length > 100) { // At least syntax + some content
              const parsed = protobufjs.parse(concatContent, {
                keepCase: true,
                alternateCommentMode: true
              })
              if ((parsed as any).nested) {
                root.add((parsed as any).nested)
                const beforeResolve = Object.keys((root as any).nested || {}).length
                console.debug(`Added ${beforeResolve} top-level namespaces`)
                root.resolveAll()
                console.debug(`Resolved all proto types successfully`)
              } else {
                console.warn('Parsed proto but no nested types found')
              }
            }
          } catch (error) {
            console.warn(`Failed to load protos via concat: ${(error as any).message}`)
          }
        } else {
          console.warn('Proto directory not found in any expected location. Checked: relative paths and process.cwd()')
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
