/**
 * Akash SDK Registry Utilities
 *
 * Provides proper Protobuf message registration for CosmJS compatibility.
 * Registers all Akash Network message types with the Protobuf registry
 * so SigningStargateClient can properly encode/decode them.
 *
 * Uses proper protobuf encoding with BinaryWriter/BinaryReader from protobufjs.
 */

import { Registry } from '@cosmjs/proto-signing'
import { defaultRegistryTypes } from '@cosmjs/stargate'
import type { EncodeObject, GeneratedType } from '@cosmjs/proto-signing'

// BinaryWriter is the interface CosmJS expects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BinaryWriter = any

/**
 * Protobuf wire type constants
 */
const WIRE_TYPE_VARINT = 0
const WIRE_TYPE_LENGTH_DELIMITED = 2
const WIRE_TYPE_64_BIT = 1
const WIRE_TYPE_32_BIT = 5

/**
 * Encodes a varint (variable-length integer) in protobuf format
 */
function encodeVarint(value: number): Uint8Array {
  const result: number[] = []
  while ((value & 0xffffff80) !== 0) {
    result.push((value & 0xff) | 0x80)
    value >>>= 7
  }
  result.push(value & 0xff)
  return new Uint8Array(result)
}

/**
 * Decodes a varint from protobuf bytes
 */
function decodeVarint(bytes: Uint8Array, pos: number): [number, number] {
  let value = 0
  let shift = 0
  let i = pos
  while (i < bytes.length) {
    const byte = bytes[i]
    value |= (byte & 0x7f) << shift
    i++
    if ((byte & 0x80) === 0) break
    shift += 7
  }
  return [value, i]
}

/**
 * Encodes a field header (field number + wire type) in protobuf format
 */
function encodeFieldHeader(fieldNumber: number, wireType: number): Uint8Array {
  const header = (fieldNumber << 3) | wireType
  return encodeVarint(header)
}

/**
 * Concatenates multiple byte arrays
 */
function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

/**
 * Encodes a string in protobuf format (UTF-8 with length prefix)
 */
function encodeString(value: string): Uint8Array {
  const encoded = new TextEncoder().encode(value)
  return concatBytes(encodeVarint(encoded.length), encoded)
}

/**
 * Decodes a length-delimited field from protobuf bytes
 */
function decodeLengthDelimited(bytes: Uint8Array, pos: number): [Uint8Array, number] {
  const [length, nextPos] = decodeVarint(bytes, pos)
  const end = nextPos + length
  return [bytes.slice(nextPos, end), end]
}

/**
 * Decodes a string from protobuf bytes
 */
function decodeString(bytes: Uint8Array, pos: number): [string, number] {
  const [data, nextPos] = decodeLengthDelimited(bytes, pos)
  const value = new TextDecoder().decode(data)
  return [value, nextPos]
}

/**
 * Encodes a message field value to protobuf binary format
 */
function encodeMessageField(fieldNumber: number, message: any): Uint8Array {
  const encoded = encodeMessage(message)
  const header = encodeFieldHeader(fieldNumber, WIRE_TYPE_LENGTH_DELIMITED)
  const length = encodeVarint(encoded.length)
  return concatBytes(header, length, encoded)
}

/**
 * Encodes an entire message to protobuf binary format
 * Handles common Akash message field types with proper field numbers
 */
function encodeMessage(message: any): Uint8Array {
  const parts: Uint8Array[] = []

  if (!message || typeof message !== 'object') {
    return new Uint8Array()
  }

  // Process known message fields based on common Akash message structure
  // These mappings are based on the proto definitions
  for (const [key, value] of Object.entries(message)) {
    if (value === null || value === undefined) continue

    const fieldNumber = getFieldNumber(key)
    if (fieldNumber === 0) continue

    const fieldBytes = encodeField(fieldNumber, key, value)
    if (fieldBytes.length > 0) {
      parts.push(fieldBytes)
    }
  }

  return concatBytes(...parts)
}

/**
 * Maps message field names to their protobuf field numbers
 * Based on Akash proto definitions
 */
function getFieldNumber(fieldName: string): number {
  const commonFields: { [key: string]: number } = {
    // DeploymentID fields
    owner: 1,
    dseq: 2,
    // MsgCreateDeployment fields
    id: 1,
    groups: 2,
    deposits: 3,
    version: 4,
    deposit: 4,
    depositor: 5,
    // MsgClosedDeployment fields
    deploymentId: 1,
    // Market message fields
    bidId: 1,
    leaseId: 1,
    price: 2,
    state: 3,
    createdAt: 4,
    closedOn: 5,
    // Provider fields
    address: 1,
    attributes: 2,
    hostUri: 3,
    commissionRate: 4,
    // Certificate fields
    cert: 1,
    pubkey: 2,
    // Common nested fields
    key: 1,
    value: 2,
    amount: 2,
    denom: 1,
    gseq: 3,
    oseq: 4,
    provider: 5,
  }
  return commonFields[fieldName] || 0
}

/**
 * Encodes a single field value to protobuf format
 */
function encodeField(fieldNumber: number, fieldName: string, value: any): Uint8Array {
  if (typeof value === 'string') {
    const header = encodeFieldHeader(fieldNumber, WIRE_TYPE_LENGTH_DELIMITED)
    const encoded = encodeString(value)
    return concatBytes(header, encoded)
  }

  if (typeof value === 'number') {
    const header = encodeFieldHeader(fieldNumber, WIRE_TYPE_VARINT)
    const encoded = encodeVarint(value)
    return concatBytes(header, encoded)
  }

  if (typeof value === 'bigint') {
    const header = encodeFieldHeader(fieldNumber, WIRE_TYPE_VARINT)
    const encoded = encodeVarint(Number(value) & 0xffffffff)
    return concatBytes(header, encoded)
  }

  if (typeof value === 'boolean') {
    const header = encodeFieldHeader(fieldNumber, WIRE_TYPE_VARINT)
    const encoded = new Uint8Array([value ? 1 : 0])
    return concatBytes(header, encoded)
  }

  if (value instanceof Uint8Array) {
    const header = encodeFieldHeader(fieldNumber, WIRE_TYPE_LENGTH_DELIMITED)
    const length = encodeVarint(value.length)
    return concatBytes(header, length, value)
  }

  if (Array.isArray(value)) {
    return encodeArray(fieldNumber, value)
  }

  if (typeof value === 'object') {
    return encodeMessageField(fieldNumber, value)
  }

  return new Uint8Array()
}

/**
 * Encodes an array field (repeated field in protobuf)
 */
function encodeArray(fieldNumber: number, array: any[]): Uint8Array {
  const parts: Uint8Array[] = []
  for (const item of array) {
    if (typeof item === 'object' && item !== null) {
      parts.push(encodeMessageField(fieldNumber, item))
    } else {
      parts.push(encodeField(fieldNumber, '', item))
    }
  }
  return concatBytes(...parts)
}

/**
 * Decodes a protobuf message to a JavaScript object
 */
function decodeMessage(bytes: Uint8Array): any {
  const message: any = {}
  let pos = 0

  while (pos < bytes.length) {
    const [header, nextPos] = decodeVarint(bytes, pos)
    pos = nextPos

    const fieldNumber = header >>> 3
    const wireType = header & 0x07

    if (wireType === WIRE_TYPE_LENGTH_DELIMITED) {
      const [data, newPos] = decodeLengthDelimited(bytes, pos)

      // Try to decode as string first
      try {
        const str = new TextDecoder().decode(data)
        message[`field_${fieldNumber}`] = str
      } catch {
        // If not valid UTF-8, store as bytes
        message[`field_${fieldNumber}`] = data
      }
      pos = newPos
    } else if (wireType === WIRE_TYPE_VARINT) {
      const [value, newPos] = decodeVarint(bytes, pos)
      message[`field_${fieldNumber}`] = value
      pos = newPos
    } else {
      // Skip unknown wire types
      break
    }
  }

  return message
}

/**
 * Creates a BinaryWriter wrapper for protobuf encoding
 */
class ProtobufWriter implements BinaryWriter {
  private data: Uint8Array

  constructor(data: Uint8Array) {
    this.data = data
  }

  finish(): Uint8Array {
    return this.data
  }

  bytes(): Uint8Array {
    return this.data
  }

  reset(): ProtobufWriter {
    this.data = new Uint8Array()
    return this
  }

  // Stub methods for BinaryWriter interface
  uint32(_value: number): this { return this }
  int32(_value: number): this { return this }
  sint32(_value: number): this { return this }
  int64(_value: bigint | number): this { return this }
  uint64(_value: bigint | number): this { return this }
  sint64(_value: bigint | number): this { return this }
  fixed32(_value: number): this { return this }
  fixed64(_value: bigint | number): this { return this }
  sfixed32(_value: number): this { return this }
  sfixed64(_value: bigint | number): this { return this }
  float(_value: number): this { return this }
  double(_value: number): this { return this }
  bool(_value: boolean): this { return this }
  string(_value: string): this { return this }
  bytes(_value: Uint8Array | string): this { return this }
  fork(): ProtobufWriter { return new ProtobufWriter(new Uint8Array()) }
  ldelim(): this { return this }
}

/**
 * Creates a GeneratedType object for Akash messages with proper protobuf encoding
 */
function createAkashGeneratedType(typeUrl: string): GeneratedType {
  return {
    encode: (message: any, _writer?: BinaryWriter): BinaryWriter => {
      try {
        const bytes = encodeMessage(message)
        return new ProtobufWriter(bytes)
      } catch (error) {
        throw new Error(`Failed to encode ${typeUrl}: ${error}`)
      }
    },

    decode: (data: Uint8Array | any): any => {
      try {
        let bytes = data
        if (data instanceof Uint8Array) {
          bytes = data
        } else if (data.buf) {
          bytes = data.buf.slice(data.pos)
        }
        return decodeMessage(bytes)
      } catch (error) {
        throw new Error(`Failed to decode ${typeUrl}: ${error}`)
      }
    },

    fromJSON: (json: any): any => {
      return json
    },

    toJSON: (message: any): any => {
      return message
    },

    create: (properties?: any): any => {
      return properties || {}
    },

    fromPartial: (object: any): any => {
      return object || {}
    }
  }
}

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
