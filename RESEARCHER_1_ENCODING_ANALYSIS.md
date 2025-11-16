# RESEARCHER 1: Message Encoding Pipeline Investigation
## SDK v3.10.6 Invalid Protobuf Binary Root Cause Analysis

### EXECUTIVE SUMMARY
Critical encoding bugs identified in `/packages/protobuf/src/message-classes.ts` that produce invalid protobuf binaries for MsgCreateDeployment messages. The custom encoding implementation has multiple structural flaws.

### 1. ENCODING PATH TRACED

#### Application Level (packages/core/src/modules/deployments.ts)
Lines 86-96: Message creation
```typescript
const msg: any = {
  id: { owner, dseq },              // DeploymentID
  groups,                            // GroupSpec[]
  version,                           // Uint8Array
  deposit: { ... },                  // Coin
  depositor: owner                   // string
}
```

#### Registry Level (packages/core/src/utils/registry.ts)
Lines 107-121: Registry creation and message class registration
- Registers MsgCreateDeployment from message-classes.ts
- CosmJS calls `MsgCreateDeployment.encode(msg, writer)`

#### Encoding Level (packages/protobuf/src/message-classes.ts)
Lines 17-44: createMessageClass() wrapper
Lines 175-195: encodeMessageToProtobuf() main encoder
Lines 254-304: encodeField() field encoder

### 2. CRITICAL BUGS IDENTIFIED

#### BUG #1: Missing Resource Structure Encoding (Lines 479-502)
**Location**: getFieldMapForNestedType() for 'resources' field
**Issue**: Conflated field mappings for ResourceUnits vs Resource

Correct protobuf structure (from official spec):
```protobuf
message GroupSpec {
  string name = 1;
  PlacementRequirements requirements = 2;
  repeated Resource resources = 3;  // <-- Resource, not ResourceUnits
}

message Resource {
  ResourceUnits resources = 1;      // <-- Nested ResourceUnits
  uint32 count = 2;
  cosmos.base.v1beta1.DecCoin price = 3;
}

message ResourceUnits {
  CPU cpu = 1;
  Memory memory = 2;
  repeated Storage storage = 3;
  repeated Endpoint endpoints = 4;
}
```

**Current bug** (lines 479-486):
```typescript
if (fieldName === 'resources' && parentFieldName === 'groups') {
  return {
    resource: 1,   // WRONG: should be 'resources'
    count: 2,
    price: 3,
  }
}
```

Should be:
```typescript
if (fieldName === 'resources' && parentFieldName === 'groups') {
  return {
    resources: 1,  // CORRECT: nested ResourceUnits field
    count: 2,
    price: 3,
  }
}
```

**Impact**: When encoding `groups[0].resources[0]`, the encoder looks for a field named `resource` (singular) but the actual message has `resources` (plural) containing the ResourceUnits. This causes the entire resource specification to be missing or incorrectly encoded.

#### BUG #2: Incorrect Nested Resource Field Mapping (Lines 488-502)
**Location**: getFieldMapForNestedType() for resource sub-fields
**Issue**: Ambiguous field mapping with conflicting numbers

```typescript
if (fieldName === 'resource' || fieldName === 'cpu' || fieldName === 'memory' || ...) {
  return {
    cpu: 1,
    memory: 2,
    storage: 3,
    endpoints: 4,
    gpu: 5,
    id: 1,          // COLLISION with cpu: 1
    units: 1,       // COLLISION with cpu: 1 and id: 1
    quantity: 1,    // COLLISION with cpu: 1, id: 1, units: 1
    name: 1,        // COLLISION - all map to field number 1!
    attributes: 2,  // COLLISION with memory: 2
  }
}
```

**Impact**: Multiple different fields map to the same field number, causing:
- Field collision during encoding
- Incorrect wire format
- Blockchain node rejects the message as malformed

#### BUG #3: Missing Explicit Resource/ResourceUnit Distinction
**Issue**: The encoder doesn't distinguish between:
- `Resource` message (contains resources: ResourceUnits, count, price)
- `ResourceUnits` message (contains cpu, memory, storage, endpoints)

When encoding a Resource, it needs:
1. Field 1 (wire type 2): LENGTH-DELIMITED for ResourceUnits
   - Inside: cpu, memory, storage fields
2. Field 2 (wire type 0): VARINT for count
3. Field 3 (wire type 2): LENGTH-DELIMITED for DecCoin price

**Current behavior**: The encoder treats both as the same structure, breaking the nesting.

### 3. WIRE TYPE ANALYSIS

#### Correct MsgCreateDeployment Wire Format:
```
Field 1 (id): DeploymentID
  - Wire type 2 (length-delimited)
  - Contains:
    - Field 1 (owner): string, wire type 2
    - Field 2 (dseq): uint64, wire type 0 (varint)

Field 2 (groups): repeated GroupSpec
  - Wire type 2 (length-delimited) for each GroupSpec
  - Contains:
    - Field 1 (name): string, wire type 2
    - Field 2 (requirements): PlacementRequirements, wire type 2
    - Field 3 (resources): repeated Resource, wire type 2 for each
      - Contains:
        - Field 1 (resources): ResourceUnits, wire type 2
          - Field 1 (cpu): CPU, wire type 2
            - Field 1 (units): ResourceValue, wire type 2
              - Field 1 (val): bytes, wire type 2
          - Field 2 (memory): Memory, wire type 2
            - Field 1 (quantity): ResourceValue, wire type 2
              - Field 1 (val): bytes, wire type 2
          - Field 3 (storage): repeated Storage, wire type 2
            - Field 1 (name): string, wire type 2
            - Field 2 (quantity): ResourceValue, wire type 2
        - Field 2 (count): uint32, wire type 0
        - Field 3 (price): DecCoin, wire type 2

Field 3 (version): bytes, wire type 2
Field 4 (deposit): Coin, wire type 2
Field 5 (depositor): string, wire type 2
```

#### Current Buggy Encoding Output:
```
Field 1: Correct (DeploymentID encodes properly)
Field 2: WRONG structure
  - Missing proper Resource wrapper
  - ResourceUnits fields directly at wrong level
  - Field number collisions cause garbage data
Field 3: Correct (version bytes)
Field 4: Correct (deposit Coin)
Field 5: Correct (depositor string)
```

### 4. EXAMPLE: Correct vs Incorrect Encoding

#### Input Message:
```javascript
{
  id: { owner: 'akash1test', dseq: '123' },
  groups: [{
    name: 'web',
    requirements: { signedBy: { allOf: [], anyOf: [] }, attributes: [] },
    resources: [{
      resources: {
        cpu: { units: { val: Uint8Array([232, 3, 0, 0, 0, 0, 0, 0]) } },
        memory: { quantity: { val: Uint8Array([0, 0, 0, 32, 0, 0, 0, 0]) } },
        storage: [{ name: 'default', quantity: { val: Uint8Array([...]) } }]
      },
      count: 1,
      price: { denom: 'uakt', amount: '10000' }
    }]
  }],
  version: Uint8Array([1, 0, 0]),
  deposit: { denom: 'uakt', amount: '5000000' },
  depositor: 'akash1test'
}
```

#### Correct Encoding (field numbers):
```
MsgCreateDeployment
├─ 1: DeploymentID {owner, dseq}
├─ 2: GroupSpec[] → [
│   └─ GroupSpec {
│       ├─ 1: name='web'
│       ├─ 2: PlacementRequirements {...}
│       └─ 3: Resource[] → [
│           └─ Resource {
│               ├─ 1: ResourceUnits {    ← CRITICAL: This level is missing!
│               │   ├─ 1: CPU {units{val}}
│               │   ├─ 2: Memory {quantity{val}}
│               │   ├─ 3: Storage[] → [{name, quantity{val}}]
│               │   └─ 4: Endpoint[] → [...]
│               │   }
│               ├─ 2: count=1
│               └─ 3: price={denom, amount}
│               }
│           ]
│       }
│   ]
├─ 3: version=Uint8Array
├─ 4: deposit=Coin
└─ 5: depositor=string
```

#### Buggy Current Encoding:
```
MsgCreateDeployment
├─ 1: DeploymentID {owner, dseq} ✓
├─ 2: GroupSpec[] → [
│   └─ GroupSpec {
│       ├─ 1: name='web' ✓
│       ├─ 2: PlacementRequirements {...} ✓
│       └─ 3: ??? WRONG STRUCTURE
│           - Looking for 'resource' field (singular) - NOT FOUND
│           - Field number collisions
│           - Missing ResourceUnits wrapper
│           - cpu/memory/storage encoded at wrong nesting level
│       }
│   ]
├─ 3: version ✓
├─ 4: deposit ✓
└─ 5: depositor ✓
```

### 5. WHY BLOCKCHAIN REJECTS IT

The Akash blockchain node uses the official protobuf definitions and expects:
1. **Strict field numbering**: Field 1 must be ResourceUnits (a nested message), not individual cpu/memory fields
2. **Correct wire types**: ResourceUnits must be wire type 2 (length-delimited), containing its own fields
3. **Proper nesting depth**: CPU/Memory/Storage are 3-4 levels deep, not 2 levels

When the buggy encoder produces:
- Wrong field numbers (collisions)
- Wrong nesting depth (missing ResourceUnits layer)
- Mixed up wire types

The blockchain's protobuf decoder fails with:
- "Unknown field number" errors
- "Unexpected wire type" errors
- "Malformed message" errors
- "Failed to decode transaction"

### 6. REQUIRED FIXES

#### Fix #1: Correct Resource vs ResourceUnits mapping
File: `/packages/protobuf/src/message-classes.ts`
Lines: 479-486

Change:
```typescript
if (fieldName === 'resources' && parentFieldName === 'groups') {
  return {
    resource: 1,  // WRONG
    count: 2,
    price: 3,
  }
}
```

To:
```typescript
if (fieldName === 'resources' && parentFieldName === 'groups') {
  return {
    resources: 1,  // CORRECT: nested ResourceUnits field
    count: 2,
    price: 3,
  }
}
```

#### Fix #2: Separate ResourceUnits field mapping
Add new case:
```typescript
if (fieldName === 'resources' && (parentFieldName === 'resources' || context === 'ResourceUnits')) {
  return {
    cpu: 1,
    memory: 2,
    storage: 3,
    endpoints: 4,
    gpu: 5,
  }
}
```

#### Fix #3: Remove field number collisions (Lines 488-502)
Remove the catch-all that causes collisions:
```typescript
// DELETE THIS - causes field number collisions:
if (fieldName === 'resource' || fieldName === 'cpu' || fieldName === 'memory' || fieldName === 'storage' || fieldName === 'gpu') {
  return {
    cpu: 1,
    memory: 2,
    storage: 3,
    endpoints: 4,
    gpu: 5,
    id: 1,        // COLLISION
    units: 1,     // COLLISION
    quantity: 1,  // COLLISION
    name: 1,      // COLLISION
    attributes: 2, // COLLISION
  }
}
```

Replace with specific mappings:
```typescript
// CPU message
if (fieldName === 'cpu') {
  return { units: 1, attributes: 2 }
}

// Memory message
if (fieldName === 'memory') {
  return { quantity: 1, attributes: 2 }
}

// Storage message
if (fieldName === 'storage') {
  return { name: 1, quantity: 2, attributes: 3 }
}

// ResourceValue message
if (fieldName === 'units' || fieldName === 'quantity') {
  return { val: 1 }
}
```

### 7. VALIDATION TEST

After fixes, the encoder should produce:
```hex
Field 2 (groups):
  0x12 <len>              # Field 2, wire type 2
    0x0a <len>            # Field 1 (name), wire type 2
      'web'
    0x12 <len>            # Field 2 (requirements), wire type 2
      ...
    0x1a <len>            # Field 3 (resources), wire type 2
      0x0a <len>          # Field 1 (resources: ResourceUnits), wire type 2
        0x0a <len>        # Field 1 (cpu), wire type 2
          0x0a <len>      # Field 1 (units), wire type 2
            0x0a <len>    # Field 1 (val), wire type 2
              <8 bytes>
        0x12 <len>        # Field 2 (memory), wire type 2
          0x0a <len>      # Field 1 (quantity), wire type 2
            0x0a <len>    # Field 1 (val), wire type 2
              <8 bytes>
        0x1a <len>        # Field 3 (storage), wire type 2
          ...
      0x10 0x01           # Field 2 (count), wire type 0, value=1
      0x1a <len>          # Field 3 (price), wire type 2
        ...
```

### 8. ROOT CAUSE SUMMARY

**Primary Issue**: The custom protobuf encoder in `message-classes.ts` was implemented WITHOUT reference to the actual Akash protobuf schema definitions. It uses heuristic field name matching which:

1. **Misunderstands the nesting structure** of Resource → ResourceUnits
2. **Creates field number collisions** by mapping different fields to the same number
3. **Breaks the wire format** by encoding nested messages at wrong depths

**Why this happened**:
- SDK v2 migration removed actual protobuf code generation
- Replaced with "type-only" mode using plain TypeScript interfaces
- Custom encoder was hand-written to bridge the gap
- But the custom encoder doesn't match the actual protobuf spec

**Impact**: Any deployment creation transaction will fail blockchain validation because the binary protobuf message is malformed at the Resource/ResourceUnits level.

### 9. FILES AFFECTED

Primary bug location:
- `/packages/protobuf/src/message-classes.ts` (lines 479-502, 434-559)

Dependency chain:
- `/packages/core/src/utils/registry.ts` (registers the buggy message class)
- `/packages/core/src/modules/deployments.ts` (uses the registry)
- `/packages/protobuf/src/index.ts` (exports the message classes)

Test coverage gap:
- No tests validate actual protobuf wire format encoding
- No tests compare against known-good blockchain accepted messages
- No integration tests with actual Akash node

### 10. RECOMMENDED NEXT STEPS

1. **IMMEDIATE**: Fix the three bugs identified in section 6
2. **VALIDATION**: Add wire format tests comparing to known-good encodings
3. **LONG-TERM**: Consider switching back to proper protobuf code generation instead of hand-written encoders
4. **TESTING**: Add integration tests that submit to a test Akash network and verify acceptance

---

END OF RESEARCHER 1 TECHNICAL REPORT
