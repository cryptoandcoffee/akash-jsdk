/**
 * Akash Network Message Classes - Custom Wire Format Encoding
 *
 * Provides CosmJS-compatible message encode/decode for Akash transactions.
 * Uses custom protobuf wire format encoding that matches Cosmos SDK requirements exactly.
 *
 * CRITICAL: We use custom wire format encoding instead of protobufjs auto-encoding
 * because protobufjs generates slightly different encoding than what the blockchain expects.
 */

import type { GeneratedType } from '@cosmjs/proto-signing'

/**
 * Custom protobuf wire format encoder
 * Implements proper varint encoding and field tag handling
 */
class Writer {
  private buffer: number[] = []

  writeVarint(value: number): this {
    while ((value & 0xFFFFFF80) !== 0) {
      this.buffer.push((value & 0x7F) | 0x80)
      value >>>= 7
    }
    this.buffer.push(value & 0x7F)
    return this
  }

  writeUint32(value: number): this {
    this.writeVarint(value)
    return this
  }

  writeString(value: string): this {
    const bytes = new TextEncoder().encode(value)
    this.writeVarint(bytes.length)
    for (const byte of bytes) {
      this.buffer.push(byte)
    }
    return this
  }

  writeBytes(value: Uint8Array): this {
    this.writeVarint(value.length)
    for (const byte of value) {
      this.buffer.push(byte)
    }
    return this
  }

  writeMessage(fieldNumber: number, message: Uint8Array): this {
    // Field tag: (fieldNumber << 3) | 2 (wire type 2 = length-delimited)
    this.writeUint32((fieldNumber << 3) | 2)
    this.writeBytes(message)
    return this
  }

  finish(): Uint8Array {
    return new Uint8Array(this.buffer)
  }

  static create(): Writer {
    return new Writer()
  }
}

/**
 * Create CosmJS GeneratedType for a message with custom wire format encoding
 * Must return a Writer-compatible object with encode, decode, create, fromPartial
 */
function createMessageType(messageName: string): GeneratedType {
  return {
    encode(message: any, writer?: any): any {
      // Use provided writer or create new one
      const w = writer || Writer.create()
      encodeMessage(messageName, message, w)
      return w
    },

    decode(data: Uint8Array | any): any {
      return data
    },

    create(properties?: any): any {
      return properties || {}
    },

    fromPartial(object: any): any {
      return object || {}
    }
  }
}

/**
 * Route messages to their specific encoders
 */
function encodeMessage(messageName: string, message: any, writer: Writer): void {
  switch (messageName) {
    // Support both v1beta3 and v1beta4 (same message structure)
    case 'akash.deployment.v1beta3.MsgCreateDeployment':
    case 'akash.deployment.v1beta4.MsgCreateDeployment':
      encodeMsgCreateDeployment(message, writer)
      break
    case 'akash.deployment.v1beta3.MsgUpdateDeployment':
    case 'akash.deployment.v1beta4.MsgUpdateDeployment':
      encodeMsgUpdateDeployment(message, writer)
      break
    case 'akash.deployment.v1beta3.MsgCloseDeployment':
    case 'akash.deployment.v1beta4.MsgCloseDeployment':
      encodeMsgCloseDeployment(message, writer)
      break
    case 'akash.deployment.v1beta3.MsgDepositDeployment':
    case 'akash.deployment.v1beta4.MsgDepositDeployment':
      encodeMsgDepositDeployment(message, writer)
      break
    case 'akash.market.v1beta4.MsgCreateBid':
      encodeMsgCreateBid(message, writer)
      break
    case 'akash.market.v1beta4.MsgCloseBid':
      encodeMsgCloseBid(message, writer)
      break
    case 'akash.market.v1beta4.MsgCreateLease':
      encodeMsgCreateLease(message, writer)
      break
    case 'akash.market.v1beta4.MsgCloseLease':
      encodeMsgCloseLease(message, writer)
      break
    case 'akash.market.v1beta4.MsgWithdrawLease':
      encodeMsgWithdrawLease(message, writer)
      break
    case 'akash.provider.v1beta3.MsgCreateProvider':
      encodeMsgCreateProvider(message, writer)
      break
    case 'akash.provider.v1beta3.MsgUpdateProvider':
      encodeMsgUpdateProvider(message, writer)
      break
    case 'akash.provider.v1beta3.MsgDeleteProvider':
      encodeMsgDeleteProvider(message, writer)
      break
    case 'akash.cert.v1beta3.MsgCreateCertificate':
      encodeMsgCreateCertificate(message, writer)
      break
    case 'akash.cert.v1beta3.MsgRevokeCertificate':
      encodeMsgRevokeCertificate(message, writer)
      break
  }
}

// ============================================================================
// Message Encoders - Deployment Module
// ============================================================================

function encodeMsgCreateDeployment(msg: any, writer: Writer): void {
  // Field 1: DeploymentID id
  if (msg.id) {
    const idWriter = Writer.create()
    encodeDeploymentID(msg.id, idWriter)
    writer.writeMessage(1, idWriter.finish())
  }

  // Field 2: GroupSpec[] groups - repeated
  if (msg.groups && Array.isArray(msg.groups)) {
    for (const group of msg.groups) {
      const groupWriter = Writer.create()
      encodeGroupSpec(group, groupWriter)
      writer.writeMessage(2, groupWriter.finish())
    }
  }

  // Field 3: bytes version
  if (msg.version && msg.version.length > 0) {
    writer.writeUint32((3 << 3) | 2)
    writer.writeBytes(msg.version)
  }

  // Field 4: Coin deposit
  if (msg.deposit) {
    const depositWriter = Writer.create()
    encodeCoin(msg.deposit, depositWriter)
    writer.writeMessage(4, depositWriter.finish())
  }

  // Field 5: string depositor
  if (msg.depositor) {
    writer.writeUint32((5 << 3) | 2)
    writer.writeString(msg.depositor)
  }
}

function encodeMsgUpdateDeployment(msg: any, writer: Writer): void {
  if (msg.id) {
    const idWriter = Writer.create()
    encodeDeploymentID(msg.id, idWriter)
    writer.writeMessage(1, idWriter.finish())
  }

  if (msg.version && msg.version.length > 0) {
    writer.writeUint32((2 << 3) | 2)
    writer.writeBytes(msg.version)
  }
}

function encodeMsgCloseDeployment(msg: any, writer: Writer): void {
  if (msg.id) {
    const idWriter = Writer.create()
    encodeDeploymentID(msg.id, idWriter)
    writer.writeMessage(1, idWriter.finish())
  }
}

function encodeMsgDepositDeployment(msg: any, writer: Writer): void {
  if (msg.id) {
    const idWriter = Writer.create()
    encodeDeploymentID(msg.id, idWriter)
    writer.writeMessage(1, idWriter.finish())
  }

  if (msg.amount) {
    const amountWriter = Writer.create()
    encodeCoin(msg.amount, amountWriter)
    writer.writeMessage(2, amountWriter.finish())
  }

  if (msg.depositor) {
    writer.writeUint32((3 << 3) | 2)
    writer.writeString(msg.depositor)
  }
}

// ============================================================================
// Message Encoders - Market Module
// ============================================================================

function encodeMsgCreateBid(msg: any, writer: Writer): void {
  if (msg.order) {
    const orderWriter = Writer.create()
    encodeOrderID(msg.order, orderWriter)
    writer.writeMessage(1, orderWriter.finish())
  }

  if (msg.provider) {
    writer.writeUint32((2 << 3) | 2)
    writer.writeString(msg.provider)
  }

  if (msg.price) {
    const priceWriter = Writer.create()
    encodeDecCoin(msg.price, priceWriter)
    writer.writeMessage(3, priceWriter.finish())
  }

  if (msg.deposit && msg.deposit.length > 0) {
    writer.writeUint32((4 << 3) | 2)
    writer.writeBytes(msg.deposit)
  }
}

function encodeMsgCloseBid(msg: any, writer: Writer): void {
  if (msg.bid_id) {
    const bidWriter = Writer.create()
    encodeBidID(msg.bid_id, bidWriter)
    writer.writeMessage(1, bidWriter.finish())
  }
}

function encodeMsgCreateLease(msg: any, writer: Writer): void {
  if (msg.bid_id) {
    const bidWriter = Writer.create()
    encodeBidID(msg.bid_id, bidWriter)
    writer.writeMessage(1, bidWriter.finish())
  }
}

function encodeMsgCloseLease(msg: any, writer: Writer): void {
  if (msg.lease_id) {
    const leaseWriter = Writer.create()
    encodeLeaseID(msg.lease_id, leaseWriter)
    writer.writeMessage(1, leaseWriter.finish())
  }
}

function encodeMsgWithdrawLease(msg: any, writer: Writer): void {
  if (msg.lease_id) {
    const leaseWriter = Writer.create()
    encodeLeaseID(msg.lease_id, leaseWriter)
    writer.writeMessage(1, leaseWriter.finish())
  }
}

// ============================================================================
// Message Encoders - Provider Module
// ============================================================================

function encodeMsgCreateProvider(msg: any, writer: Writer): void {
  if (msg.owner) {
    writer.writeUint32((1 << 3) | 2)
    writer.writeString(msg.owner)
  }

  if (msg.host_uri) {
    writer.writeUint32((2 << 3) | 2)
    writer.writeString(msg.host_uri)
  }

  if (msg.attributes && msg.attributes.length > 0) {
    writer.writeUint32((3 << 3) | 2)
    writer.writeBytes(msg.attributes)
  }
}

function encodeMsgUpdateProvider(msg: any, writer: Writer): void {
  if (msg.owner) {
    writer.writeUint32((1 << 3) | 2)
    writer.writeString(msg.owner)
  }

  if (msg.host_uri) {
    writer.writeUint32((2 << 3) | 2)
    writer.writeString(msg.host_uri)
  }

  if (msg.attributes && msg.attributes.length > 0) {
    writer.writeUint32((3 << 3) | 2)
    writer.writeBytes(msg.attributes)
  }
}

function encodeMsgDeleteProvider(msg: any, writer: Writer): void {
  if (msg.owner) {
    writer.writeUint32((1 << 3) | 2)
    writer.writeString(msg.owner)
  }
}

// ============================================================================
// Message Encoders - Certificate Module
// ============================================================================

function encodeMsgCreateCertificate(msg: any, writer: Writer): void {
  if (msg.owner) {
    writer.writeUint32((1 << 3) | 2)
    writer.writeString(msg.owner)
  }

  if (msg.cert && msg.cert.length > 0) {
    writer.writeUint32((2 << 3) | 2)
    writer.writeBytes(msg.cert)
  }

  if (msg.pubkey && msg.pubkey.length > 0) {
    writer.writeUint32((3 << 3) | 2)
    writer.writeBytes(msg.pubkey)
  }
}

function encodeMsgRevokeCertificate(msg: any, writer: Writer): void {
  if (msg.owner) {
    writer.writeUint32((1 << 3) | 2)
    writer.writeString(msg.owner)
  }

  if (msg.serial) {
    writer.writeUint32((2 << 3) | 0)
    writer.writeUint32(msg.serial)
  }
}

// ============================================================================
// Helper Encoders for Nested Types
// ============================================================================

function encodeDeploymentID(id: any, writer: Writer): void {
  if (id.owner) {
    writer.writeUint32((1 << 3) | 2)
    writer.writeString(id.owner)
  }

  if (id.dseq) {
    writer.writeUint32((2 << 3) | 0)
    writer.writeUint32(id.dseq)
  }
}

function encodeOrderID(id: any, writer: Writer): void {
  if (id.owner) {
    writer.writeUint32((1 << 3) | 2)
    writer.writeString(id.owner)
  }

  if (id.dseq) {
    writer.writeUint32((2 << 3) | 0)
    writer.writeUint32(id.dseq)
  }

  if (id.gseq) {
    writer.writeUint32((3 << 3) | 0)
    writer.writeUint32(id.gseq)
  }

  if (id.oseq) {
    writer.writeUint32((4 << 3) | 0)
    writer.writeUint32(id.oseq)
  }
}

function encodeLeaseID(id: any, writer: Writer): void {
  if (id.owner) {
    writer.writeUint32((1 << 3) | 2)
    writer.writeString(id.owner)
  }

  if (id.dseq) {
    writer.writeUint32((2 << 3) | 0)
    writer.writeUint32(id.dseq)
  }

  if (id.gseq) {
    writer.writeUint32((3 << 3) | 0)
    writer.writeUint32(id.gseq)
  }

  if (id.oseq) {
    writer.writeUint32((4 << 3) | 0)
    writer.writeUint32(id.oseq)
  }

  if (id.provider) {
    writer.writeUint32((5 << 3) | 2)
    writer.writeString(id.provider)
  }
}

function encodeBidID(id: any, writer: Writer): void {
  if (id.owner) {
    writer.writeUint32((1 << 3) | 2)
    writer.writeString(id.owner)
  }

  if (id.dseq) {
    writer.writeUint32((2 << 3) | 0)
    writer.writeUint32(id.dseq)
  }

  if (id.gseq) {
    writer.writeUint32((3 << 3) | 0)
    writer.writeUint32(id.gseq)
  }

  if (id.oseq) {
    writer.writeUint32((4 << 3) | 0)
    writer.writeUint32(id.oseq)
  }

  if (id.provider) {
    writer.writeUint32((5 << 3) | 2)
    writer.writeString(id.provider)
  }
}

function encodeCoin(coin: any, writer: Writer): void {
  if (coin.denom) {
    writer.writeUint32((1 << 3) | 2)
    writer.writeString(coin.denom)
  }

  if (coin.amount) {
    writer.writeUint32((2 << 3) | 2)
    writer.writeString(coin.amount)
  }
}

function encodeDecCoin(coin: any, writer: Writer): void {
  if (coin.denom) {
    writer.writeUint32((1 << 3) | 2)
    writer.writeString(coin.denom)
  }

  if (coin.amount) {
    writer.writeUint32((2 << 3) | 2)
    writer.writeString(coin.amount)
  }
}

function encodeGroupSpec(spec: any, writer: Writer): void {
  // Field 1: name (string)
  if (spec.name) {
    writer.writeUint32((1 << 3) | 2)
    writer.writeString(spec.name)
  }

  // Field 2: requirements (Requirement message)
  if (spec.requirements) {
    const reqWriter = Writer.create()
    encodeRequirements(spec.requirements, reqWriter)
    writer.writeMessage(2, reqWriter.finish())
  }

  // Field 3: resources (repeated Resource)
  if (spec.resources && Array.isArray(spec.resources)) {
    for (const resource of spec.resources) {
      const resourceWriter = Writer.create()
      encodeResource(resource, resourceWriter)
      writer.writeMessage(3, resourceWriter.finish())
    }
  }
}

function encodeRequirements(req: any, writer: Writer): void {
  // Field 1: signedBy (SignedBy message)
  if (req.signedBy) {
    const signedByWriter = Writer.create()
    encodeSignedBy(req.signedBy, signedByWriter)
    writer.writeMessage(1, signedByWriter.finish())
  }

  // Field 2: attributes (repeated Attribute)
  if (req.attributes && Array.isArray(req.attributes)) {
    for (const attr of req.attributes) {
      const attrWriter = Writer.create()
      encodeAttribute(attr, attrWriter)
      writer.writeMessage(2, attrWriter.finish())
    }
  }
}

function encodeSignedBy(signedBy: any, writer: Writer): void {
  // Field 1: allOf (repeated string)
  if (signedBy.allOf && Array.isArray(signedBy.allOf)) {
    for (const val of signedBy.allOf) {
      writer.writeUint32((1 << 3) | 2)
      writer.writeString(val)
    }
  }

  // Field 2: anyOf (repeated string)
  if (signedBy.anyOf && Array.isArray(signedBy.anyOf)) {
    for (const val of signedBy.anyOf) {
      writer.writeUint32((2 << 3) | 2)
      writer.writeString(val)
    }
  }
}

function encodeAttribute(attr: any, writer: Writer): void {
  // Field 1: key (string)
  if (attr.key) {
    writer.writeUint32((1 << 3) | 2)
    writer.writeString(attr.key)
  }

  // Field 2: value (string)
  if (attr.value) {
    writer.writeUint32((2 << 3) | 2)
    writer.writeString(attr.value)
  }
}

function encodeResource(resource: any, writer: Writer): void {
  // Field 1: resource (ResourceSpec message)
  if (resource.resource) {
    const resSpecWriter = Writer.create()
    encodeResourceSpec(resource.resource, resSpecWriter)
    writer.writeMessage(1, resSpecWriter.finish())
  }

  // Field 2: count (uint32)
  if (resource.count !== undefined) {
    writer.writeUint32((2 << 3) | 0)
    writer.writeVarint(resource.count)
  }

  // Field 3: price (Coin message)
  if (resource.price) {
    const priceWriter = Writer.create()
    encodeCoin(resource.price, priceWriter)
    writer.writeMessage(3, priceWriter.finish())
  }
}

function encodeResourceSpec(spec: any, writer: Writer): void {
  // Field 1: cpu (CPU message)
  if (spec.cpu) {
    const cpuWriter = Writer.create()
    encodeCPU(spec.cpu, cpuWriter)
    writer.writeMessage(1, cpuWriter.finish())
  }

  // Field 2: memory (Memory message)
  if (spec.memory) {
    const memWriter = Writer.create()
    encodeMemory(spec.memory, memWriter)
    writer.writeMessage(2, memWriter.finish())
  }

  // Field 3: storage (repeated Storage)
  if (spec.storage && Array.isArray(spec.storage)) {
    for (const storage of spec.storage) {
      const storageWriter = Writer.create()
      encodeStorage(storage, storageWriter)
      writer.writeMessage(3, storageWriter.finish())
    }
  }

  // Field 4: endpoints (repeated Endpoint)
  if (spec.endpoints && Array.isArray(spec.endpoints)) {
    for (const endpoint of spec.endpoints) {
      const epWriter = Writer.create()
      encodeEndpoint(endpoint, epWriter)
      writer.writeMessage(4, epWriter.finish())
    }
  }
}

function encodeCPU(cpu: any, writer: Writer): void {
  // Field 1: units (ResourceValue message)
  if (cpu.units) {
    const unitsWriter = Writer.create()
    encodeResourceValue(cpu.units, unitsWriter)
    writer.writeMessage(1, unitsWriter.finish())
  }
}

function encodeMemory(mem: any, writer: Writer): void {
  // Field 1: quantity (ResourceValue message)
  if (mem.quantity) {
    const qWriter = Writer.create()
    encodeResourceValue(mem.quantity, qWriter)
    writer.writeMessage(1, qWriter.finish())
  }
}

function encodeStorage(storage: any, writer: Writer): void {
  // Field 1: name (string)
  if (storage.name) {
    writer.writeUint32((1 << 3) | 2)
    writer.writeString(storage.name)
  }

  // Field 2: quantity (ResourceValue message)
  if (storage.quantity) {
    const qWriter = Writer.create()
    encodeResourceValue(storage.quantity, qWriter)
    writer.writeMessage(2, qWriter.finish())
  }
}

function encodeEndpoint(endpoint: any, writer: Writer): void {
  // Field 1: kind (uint32)
  if (endpoint.kind !== undefined) {
    writer.writeUint32((1 << 3) | 0)
    writer.writeVarint(endpoint.kind)
  }

  // Field 2: sequenceNumber (uint32)
  if (endpoint.sequenceNumber !== undefined) {
    writer.writeUint32((2 << 3) | 0)
    writer.writeVarint(endpoint.sequenceNumber)
  }
}

function encodeResourceValue(val: any, writer: Writer): void {
  // Field 1: val (bytes)
  if (val && val.val) {
    writer.writeUint32((1 << 3) | 2)
    writer.writeBytes(val.val)
  } else if (val instanceof Uint8Array) {
    writer.writeUint32((1 << 3) | 2)
    writer.writeBytes(val)
  }
}

// ============================================================================
// Export message types
// ============================================================================

// Deployment messages (mainnet uses v1beta4)
export const MsgCreateDeployment: GeneratedType = createMessageType(
  'akash.deployment.v1beta4.MsgCreateDeployment'
)
export const MsgUpdateDeployment: GeneratedType = createMessageType(
  'akash.deployment.v1beta4.MsgUpdateDeployment'
)
export const MsgCloseDeployment: GeneratedType = createMessageType(
  'akash.deployment.v1beta4.MsgCloseDeployment'
)
export const MsgDepositDeployment: GeneratedType = createMessageType(
  'akash.deployment.v1beta4.MsgDepositDeployment'
)

export const MsgCreateBid: GeneratedType = createMessageType(
  'akash.market.v1beta4.MsgCreateBid'
)
export const MsgCloseBid: GeneratedType = createMessageType(
  'akash.market.v1beta4.MsgCloseBid'
)
export const MsgCreateLease: GeneratedType = createMessageType(
  'akash.market.v1beta4.MsgCreateLease'
)
export const MsgCloseLease: GeneratedType = createMessageType(
  'akash.market.v1beta4.MsgCloseLease'
)
export const MsgWithdrawLease: GeneratedType = createMessageType(
  'akash.market.v1beta4.MsgWithdrawLease'
)

export const MsgCreateProvider: GeneratedType = createMessageType(
  'akash.provider.v1beta3.MsgCreateProvider'
)
export const MsgUpdateProvider: GeneratedType = createMessageType(
  'akash.provider.v1beta3.MsgUpdateProvider'
)
export const MsgDeleteProvider: GeneratedType = createMessageType(
  'akash.provider.v1beta3.MsgDeleteProvider'
)

export const MsgCreateCertificate: GeneratedType = createMessageType(
  'akash.cert.v1beta3.MsgCreateCertificate'
)
export const MsgRevokeCertificate: GeneratedType = createMessageType(
  'akash.cert.v1beta3.MsgRevokeCertificate'
)
