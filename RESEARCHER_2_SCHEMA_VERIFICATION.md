# RESEARCHER 2: Schema Verification Report
## Akash Protobuf Schema Analysis - Confirming Root Cause of Invalid Binary

### EXECUTIVE SUMMARY

I have verified Researcher 1's findings by analyzing the **official Akash protobuf schema definitions** from the akash-api repository. The analysis confirms that the SDK's `message-classes.ts` implementation has **critical structural mismatches** that cause invalid protobuf encoding.

**KEY FINDING**: The bug is in how the SDK maps field names to field numbers for the Resource/ResourceUnits nesting structure. The official schema uses different terminology and nesting than what the SDK implements.

---

## 1. OFFICIAL AKASH PROTOBUF SCHEMA

### Complete Message Hierarchy (from akash-api repository)

#### 1.1 GroupSpec Message
**Source**: `proto/node/akash/deployment/v1beta3/groupspec.proto`

```protobuf
message GroupSpec {
  string name = 1;
  akash.base.v1beta3.PlacementRequirements requirements = 2;
  repeated ResourceUnit resources = 3;  // ← Field 3 is "ResourceUnit", not "Resource"!
}
```

**CRITICAL**: Field 3 is named `resources` but the type is **ResourceUnit** (singular), not Resource!

#### 1.2 ResourceUnit Message
**Source**: `proto/node/akash/deployment/v1beta3/resourceunit.proto`

```protobuf
message ResourceUnit {
  akash.base.v1beta3.Resources resource = 1;  // ← Field 1 is named "resource" (singular)!
  uint32 count = 2;
  cosmos.base.v1beta1.DecCoin price = 3;
}
```

**CRITICAL**:
- Field 1 is named `resource` (singular)
- Field 1's type is **Resources** (plural) - this is the ResourceUnits equivalent
- This is the CORRECT nesting structure

#### 1.3 Resources Message (aka ResourceUnits)
**Source**: `proto/node/akash/base/v1beta3/resources.proto`

```protobuf
message Resources {
  uint32 id = 1;           // ← Field 1 is "id", NOT "cpu"!
  CPU cpu = 2;             // ← Field 2, not 1!
  Memory memory = 3;       // ← Field 3, not 2!
  repeated Storage storage = 4;  // ← Field 4, not 3!
  GPU gpu = 5;
  repeated Endpoint endpoints = 6;  // ← Field 6, not 4!
}
```

**CRITICAL MISMATCH**:
- The SDK expects: `{cpu: 1, memory: 2, storage: 3, endpoints: 4}`
- The actual schema: `{id: 1, cpu: 2, memory: 3, storage: 4, gpu: 5, endpoints: 6}`
- **Field 1 should be `id`, not `cpu`!**

#### 1.4 CPU Message
**Source**: `proto/node/akash/base/v1beta3/cpu.proto`

```protobuf
message CPU {
  ResourceValue units = 1;
  repeated Attribute attributes = 2;
}
```

#### 1.5 Memory Message
**Source**: `proto/node/akash/base/v1beta3/memory.proto`

```protobuf
message Memory {
  ResourceValue quantity = 1;
  repeated Attribute attributes = 2;
}
```

#### 1.6 Storage Message
**Source**: `proto/node/akash/base/v1beta3/storage.proto`

```protobuf
message Storage {
  string name = 1;
  ResourceValue quantity = 2;
  repeated Attribute attributes = 3;
}
```

#### 1.7 ResourceValue Message
**Source**: `proto/node/akash/base/v1beta3/resourcevalue.proto`

```protobuf
message ResourceValue {
  bytes val = 1;
}
```

---

## 2. CURRENT SDK IMPLEMENTATION (INCORRECT)

### File: `/packages/protobuf/src/message-classes.ts`

#### Lines 479-486: Resources Field Mapping (BUG #1)
```typescript
// Resources (repeated in GroupSpec)
if (fieldName === 'resources' && parentFieldName === 'groups') {
  return {
    resource: 1,   // ← WRONG field name
    count: 2,
    price: 3,
  }
}
```

**PROBLEMS**:
1. Returns field name `resource` (singular) but the SDK's TypeScript types use `resources` (plural)
2. This is technically correct per the protobuf schema (field 1 of ResourceUnit IS named "resource")
3. BUT the SDK's official-types.ts defines the field as `resources: ResourceUnits`, not `resource: Resources`

#### Lines 488-502: Resource/ResourceUnits Field Mapping (BUG #2 & #3)
```typescript
// Resource/CPU/Memory/Storage (nested in resources or standalone)
if (fieldName === 'resource' || fieldName === 'cpu' || fieldName === 'memory' ||
    fieldName === 'storage' || fieldName === 'gpu') {
  return {
    cpu: 1,         // ← WRONG! Should be id: 1, cpu: 2
    memory: 2,      // ← WRONG! Should be memory: 3
    storage: 3,     // ← WRONG! Should be storage: 4
    endpoints: 4,   // ← WRONG! Should be endpoints: 6
    gpu: 5,
    id: 1,          // ← COLLISION with cpu: 1!
    units: 1,       // ← COLLISION with cpu: 1 and id: 1!
    quantity: 1,    // ← COLLISION!
    name: 1,        // ← COLLISION!
    attributes: 2,  // ← COLLISION with memory: 2!
  }
}
```

**PROBLEMS**:
1. **Missing field 1 (id)**: The Resources message starts with `uint32 id = 1`, not cpu!
2. **Wrong field numbers**: cpu should be 2, memory should be 3, storage should be 4, endpoints should be 6
3. **Field collisions**: Multiple fields map to the same number (1 and 2)
4. **Conflates multiple message types**: Tries to handle Resources, CPU, Memory, Storage in one mapping

---

## 3. CORRECT VS INCORRECT MAPPING COMPARISON

### 3.1 GroupSpec.resources Field

| Aspect | Official Schema | SDK official-types.ts | SDK message-classes.ts |
|--------|----------------|----------------------|------------------------|
| Field name | `resources` | `resources` | Returns `{resource: 1}` |
| Field number | 3 | 3 (correct) | 3 (correct) |
| Field type | `repeated ResourceUnit` | `Resource[]` | Looks for 'resource' field |
| **Issue** | - | Type mismatch | Field name mismatch |

### 3.2 ResourceUnit Message (Official) vs Resource Interface (SDK)

| Field | Official ResourceUnit | SDK Resource Interface | SDK Encoder Mapping |
|-------|----------------------|------------------------|---------------------|
| Field 1 | `Resources resource` | `ResourceUnits resources` | `resource: 1` ← **NAME MISMATCH** |
| Field 2 | `uint32 count` | `number count` | `count: 2` ✓ |
| Field 3 | `DecCoin price` | `DecCoin price` | `price: 3` ✓ |

**PROBLEM**: The SDK defines the field as `resources` (plural) but the encoder looks for `resource` (singular).

### 3.3 Resources Message (Official) vs ResourceUnits Interface (SDK)

| Field | Official Resources | SDK ResourceUnits | SDK Encoder Mapping |
|-------|-------------------|-------------------|---------------------|
| Field 1 | `uint32 id` | **MISSING** | `cpu: 1` ← **COMPLETELY WRONG** |
| Field 2 | `CPU cpu` | `CPU cpu` | `memory: 2` ← **WRONG NUMBER** |
| Field 3 | `Memory memory` | `Memory memory` | `storage: 3` ← **WRONG NUMBER** |
| Field 4 | `repeated Storage storage` | `Storage[] storage` | `endpoints: 4` ← **WRONG NUMBER** |
| Field 5 | `GPU gpu` | - | `gpu: 5` ✓ |
| Field 6 | `repeated Endpoint endpoints` | `Endpoint[] endpoints` | **MISSING** |

**CRITICAL PROBLEMS**:
1. The SDK's TypeScript interface **omits the `id` field** entirely
2. The encoder assigns **wrong field numbers** to every field
3. Field 1 is supposed to be `id` but the encoder uses it for `cpu`
4. This causes a complete shift in all field numbers

---

## 4. VISUAL: CORRECT PROTOBUF STRUCTURE

### Correct Wire Format Encoding

```
MsgCreateDeployment
├─ Field 1: DeploymentID {owner, dseq}
├─ Field 2: GroupSpec[] → [
│   └─ GroupSpec {
│       ├─ Field 1 (wire 0x0a): name = "web"
│       ├─ Field 2 (wire 0x12): PlacementRequirements {...}
│       └─ Field 3 (wire 0x1a): ResourceUnit[] → [
│           └─ ResourceUnit {
│               ├─ Field 1 (wire 0x0a): Resources {      ← "resource" field
│               │   ├─ Field 1 (wire 0x08): id = 0       ← MISSING in SDK!
│               │   ├─ Field 2 (wire 0x12): CPU {        ← SDK uses field 1!
│               │   │   └─ Field 1 (wire 0x0a): units {
│               │   │       └─ Field 1 (wire 0x0a): val = <bytes>
│               │   │       }
│               │   │   }
│               │   ├─ Field 3 (wire 0x1a): Memory {     ← SDK uses field 2!
│               │   │   └─ Field 1 (wire 0x0a): quantity {
│               │   │       └─ Field 1 (wire 0x0a): val = <bytes>
│               │   │       }
│               │   │   }
│               │   ├─ Field 4 (wire 0x22): Storage[] → [{  ← SDK uses field 3!
│               │   │   ├─ Field 1 (wire 0x0a): name = "default"
│               │   │   ├─ Field 2 (wire 0x12): quantity {val}
│               │   │   └─ Field 3 (wire 0x1a): attributes
│               │   │   }]
│               │   └─ Field 6 (wire 0x32): Endpoint[]   ← SDK uses field 4!
│               │   }
│               ├─ Field 2 (wire 0x10): count = 1
│               └─ Field 3 (wire 0x1a): price {denom, amount}
│               }
│           ]
│       }
│   ]
├─ Field 3: version = Uint8Array
├─ Field 4: deposit = Coin
└─ Field 5: depositor = string
```

### Current Buggy Encoding

```
MsgCreateDeployment
├─ Field 1: DeploymentID {owner, dseq} ✓
├─ Field 2: GroupSpec[] → [
│   └─ GroupSpec {
│       ├─ Field 1: name = "web" ✓
│       ├─ Field 2: PlacementRequirements {...} ✓
│       └─ Field 3: ??? → [
│           └─ {
│               ├─ Looks for field named "resource" (singular)
│               │   but finds "resources" (plural) in the object
│               ├─ Field mapping collision:
│               │   - cpu: 1, memory: 2, storage: 3 (WRONG numbers)
│               │   - id: 1, units: 1, quantity: 1, name: 1 (ALL map to 1!)
│               ├─ Missing "id" field entirely (should be field 1)
│               └─ Encoded with wrong wire types and field numbers
│               }
│           ]
│       }
│   ]
├─ Field 3: version ✓
├─ Field 4: deposit ✓
└─ Field 5: depositor ✓
```

---

## 5. ROOT CAUSE VERIFICATION

### 5.1 Terminology Mismatch

The Akash protobuf schema uses confusing terminology:
- **ResourceUnit** (message type in GroupSpec) - contains resource, count, price
- **Resources** (message type in ResourceUnit.resource field) - contains id, cpu, memory, storage, endpoints
- The SDK calls this second type "ResourceUnits" but the protobuf calls it "Resources"

### 5.2 Missing `id` Field

The official `Resources` message **requires field 1 to be `uint32 id`**. This field is:
- **Present** in the protobuf schema (field 1)
- **Missing** from the SDK's TypeScript interface definition (`official-types.ts` line 75-80)
- **Not handled** by the encoder at all

**Impact**: When the encoder writes to field 1, it writes `cpu` data instead of `id`, causing the blockchain to reject it.

### 5.3 Field Number Shift

Because the `id` field is missing, all subsequent fields are off by one:
- SDK expects: `{cpu: 1, memory: 2, storage: 3, endpoints: 4}`
- Schema requires: `{id: 1, cpu: 2, memory: 3, storage: 4, endpoints: 6}`

**Impact**: Every single resource specification field is encoded with the wrong field number.

### 5.4 Field Name Mismatch (resource vs resources)

The ResourceUnit message has:
- Field 1 named `resource` (singular)
- Type `Resources` (plural)

The SDK's Resource interface has:
- Field 1 named `resources` (plural)
- Type `ResourceUnits` (plural)

The encoder mapping (lines 479-486) returns `{resource: 1}` but the actual JavaScript object has `resources` as the property name.

**Impact**: The encoder can't find the field to encode because it's looking for the wrong property name.

---

## 6. BLOCKCHAIN REJECTION ANALYSIS

### Why the Akash Node Rejects the Binary

When the SDK sends the malformed protobuf binary, the Akash blockchain node:

1. **Reads Field 2 (groups)** - OK, starts decoding GroupSpec
2. **Reads Field 3 (resources)** - OK, starts decoding repeated ResourceUnit
3. **Reads Field 1 of ResourceUnit** - Expects a `Resources` message
4. **Inside Resources, reads Field 1** - Expects `uint32 id` (wire type 0, varint)
   - But receives CPU message data (wire type 2, length-delimited)
   - **DECODE ERROR**: "unexpected wire type for field 1"
5. **Tries to continue parsing** - Field numbers don't match
   - Receives field 1 data but it's structured like field 2 (CPU)
   - Receives field 2 data but it's structured like field 3 (Memory)
   - **DECODE ERROR**: "unable to resolve type URL" or "unknown field"
6. **Rejects the transaction** - "failed to decode transaction"

### Error Messages Explained

- **"unable to resolve type URL"** - The decoder expected one type but got binary data from a different type
- **"unknown field number"** - The encoder wrote a field number that doesn't exist in the schema
- **"unexpected wire type"** - Field 1 should be varint (id) but got length-delimited (cpu)
- **"failed to decode"** - Generic error when the binary doesn't match the schema

---

## 7. COMPLETE BUG SUMMARY

### Bug #1: Missing `id` Field in TypeScript Interface
**Location**: `/packages/protobuf/src/official-types.ts` lines 75-80

```typescript
export interface ResourceUnits {
  // MISSING: id: number
  cpu: CPU
  memory: Memory
  storage: Storage[]
  endpoints?: Endpoint[]
}
```

**Fix Required**: Add `id?: number` as the first field

### Bug #2: Wrong Field Numbers in Resources Mapping
**Location**: `/packages/protobuf/src/message-classes.ts` lines 488-502

Current mapping:
```typescript
{
  cpu: 1,       // WRONG - should be 2
  memory: 2,    // WRONG - should be 3
  storage: 3,   // WRONG - should be 4
  endpoints: 4, // WRONG - should be 6
  gpu: 5,       // CORRECT
  // ... plus field collisions
}
```

**Fix Required**:
```typescript
{
  id: 1,
  cpu: 2,
  memory: 3,
  storage: 4,
  gpu: 5,
  endpoints: 6,
}
```

### Bug #3: Field Name Mismatch (resource vs resources)
**Location**: `/packages/protobuf/src/message-classes.ts` lines 479-486

The encoder returns `{resource: 1}` but the SDK's interface uses `resources`.

**Two possible fixes**:
1. Change the TypeScript interface to use `resource` (singular) to match protobuf
2. Change the encoder to look for `resources` (plural) to match current interface

**Recommended**: Fix the TypeScript interface to match the protobuf schema.

### Bug #4: Field Collision in catch-all mapping
**Location**: `/packages/protobuf/src/message-classes.ts` lines 488-502

Multiple different fields map to the same number:
- `cpu: 1, id: 1, units: 1, quantity: 1, name: 1` - all map to field 1!
- `memory: 2, attributes: 2` - both map to field 2!

**Fix Required**: Split the catch-all into separate type-specific mappings.

---

## 8. VERIFIED FIXES

Based on the official schema, here are the required changes:

### Fix #1: Update TypeScript Interface
**File**: `/packages/protobuf/src/official-types.ts`

```typescript
export interface ResourceUnits {
  id?: number              // ADD THIS - field 1 in protobuf
  cpu: CPU
  memory: Memory
  storage: Storage[]
  endpoints?: Endpoint[]
}
```

### Fix #2: Update Resource Interface Field Name
**File**: `/packages/protobuf/src/official-types.ts`

```typescript
export interface Resource {
  resource: ResourceUnits   // CHANGE from "resources" to "resource"
  count: number
  price: DecCoin
}
```

### Fix #3: Update Encoder Field Mapping for ResourceUnit
**File**: `/packages/protobuf/src/message-classes.ts` lines 479-486

```typescript
if (fieldName === 'resources' && parentFieldName === 'groups') {
  return {
    resource: 1,  // Keep this - it's correct for ResourceUnit
    count: 2,
    price: 3,
  }
}
```
**NOTE**: This is actually correct! The issue is the TypeScript interface uses the wrong field name.

### Fix #4: Update Encoder Field Mapping for Resources Message
**File**: `/packages/protobuf/src/message-classes.ts` lines 488-502

**DELETE the catch-all and replace with**:

```typescript
// Resources message (the "resource" field inside ResourceUnit)
if (fieldName === 'resource' && parentFieldName === 'resources') {
  return {
    id: 1,
    cpu: 2,
    memory: 3,
    storage: 4,
    gpu: 5,
    endpoints: 6,
  }
}

// CPU message
if (fieldName === 'cpu') {
  return {
    units: 1,
    attributes: 2,
  }
}

// Memory message
if (fieldName === 'memory') {
  return {
    quantity: 1,
    attributes: 2,
  }
}

// Storage message
if (fieldName === 'storage') {
  return {
    name: 1,
    quantity: 2,
    attributes: 3,
  }
}

// ResourceValue message (used in units/quantity)
if (fieldName === 'units' || fieldName === 'quantity') {
  return {
    val: 1,
  }
}
```

---

## 9. VALIDATION EVIDENCE

### Official Protobuf Schema Source Files
All schema definitions verified from: https://github.com/akash-network/akash-api

- `proto/node/akash/deployment/v1beta3/groupspec.proto`
- `proto/node/akash/deployment/v1beta3/resourceunit.proto`
- `proto/node/akash/base/v1beta3/resources.proto`
- `proto/node/akash/base/v1beta3/cpu.proto`
- `proto/node/akash/base/v1beta3/memory.proto`
- `proto/node/akash/base/v1beta3/storage.proto`
- `proto/node/akash/base/v1beta3/resourcevalue.proto`

### Key Schema Facts
1. GroupSpec.resources is `repeated ResourceUnit` (not Resource)
2. ResourceUnit.resource is `Resources` type (not ResourceUnits)
3. Resources.id is field 1 (uint32, not optional)
4. Resources.cpu is field 2 (not field 1)
5. Resources.memory is field 3 (not field 2)
6. Resources.storage is field 4 (not field 3)
7. Resources.endpoints is field 6 (not field 4)

---

## 10. CONCLUSION

**Researcher 1's analysis is CONFIRMED and VERIFIED.**

The root cause is a **triple mismatch**:

1. **Type Name Confusion**: Akash uses "ResourceUnit" and "Resources", SDK uses "Resource" and "ResourceUnits"
2. **Field Name Mismatch**: Protobuf uses `resource` (singular), SDK interface uses `resources` (plural)
3. **Missing Required Field**: Protobuf requires `id` as field 1, SDK interface omits it entirely
4. **Wrong Field Numbers**: Every field in Resources is shifted by -1 in the SDK encoder

The result is that **every deployment creation will fail** because the binary protobuf encoding doesn't match the schema the Akash blockchain expects.

The SDK must:
1. Add the missing `id` field to ResourceUnits interface
2. Rename `resources` to `resource` in the Resource interface
3. Fix all field number mappings in the encoder to match the official schema
4. Remove field number collisions in the encoder

Without these fixes, no MsgCreateDeployment transaction can succeed.

---

**Files Analyzed:**
- Researcher 1 Report: `/home/andrew/akash-mcp-mello/akash-jsdk/RESEARCHER_1_ENCODING_ANALYSIS.md`
- SDK Types: `/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/official-types.ts`
- SDK Encoder: `/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/message-classes.ts`
- Official Schema: https://github.com/akash-network/akash-api (verified via web fetch)

**Verification Date**: 2025-11-16
**Researcher**: Researcher 2
**Status**: Root cause CONFIRMED
