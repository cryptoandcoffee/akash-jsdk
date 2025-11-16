# VISUAL SCHEMA MISMATCH GUIDE
## Side-by-Side Comparison: Official Protobuf vs SDK Implementation

---

## QUICK REFERENCE: THE THREE CRITICAL BUGS

### Bug #1: Missing `id` Field
- **Official Schema**: Resources message starts with `uint32 id = 1`
- **SDK Implementation**: ResourceUnits interface has NO `id` field
- **Impact**: Field 1 gets wrong data (cpu instead of id)

### Bug #2: Wrong Field Numbers
- **Official Schema**: `{id: 1, cpu: 2, memory: 3, storage: 4, gpu: 5, endpoints: 6}`
- **SDK Implementation**: `{cpu: 1, memory: 2, storage: 3, endpoints: 4, gpu: 5}`
- **Impact**: Every field is encoded with wrong number

### Bug #3: Field Name Mismatch
- **Official Schema**: ResourceUnit has field named `resource` (singular)
- **SDK Implementation**: Resource interface has field named `resources` (plural)
- **Impact**: Encoder can't find the field to encode

---

## COMPLETE STRUCTURE COMPARISON

### Level 1: GroupSpec Message

```
┌─────────────────────────────────────────────────────────────────────┐
│                        OFFICIAL PROTOBUF SCHEMA                     │
├─────────────────────────────────────────────────────────────────────┤
│ message GroupSpec {                                                 │
│   string name = 1;                                                  │
│   PlacementRequirements requirements = 2;                           │
│   repeated ResourceUnit resources = 3;  ← TYPE: ResourceUnit        │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     SDK TYPESCRIPT INTERFACE                        │
├─────────────────────────────────────────────────────────────────────┤
│ export interface GroupSpec {                                        │
│   name: string;                                                     │
│   requirements: PlacementRequirements;                              │
│   resources: Resource[];  ← TYPE: Resource (NOT ResourceUnit!)      │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘

STATUS: ⚠️  TYPE NAME MISMATCH
  Official: ResourceUnit
  SDK:      Resource
```

---

### Level 2: ResourceUnit/Resource Message

```
┌─────────────────────────────────────────────────────────────────────┐
│               OFFICIAL PROTOBUF: ResourceUnit                       │
├─────────────────────────────────────────────────────────────────────┤
│ message ResourceUnit {                                              │
│   Resources resource = 1;  ← Field name: "resource" (singular)      │
│                            ← Field type: Resources                  │
│   uint32 count = 2;                                                 │
│   DecCoin price = 3;                                                │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                SDK TYPESCRIPT: Resource                             │
├─────────────────────────────────────────────────────────────────────┤
│ export interface Resource {                                         │
│   resources: ResourceUnits;  ← Field name: "resources" (plural)!    │
│                              ← Field type: ResourceUnits             │
│   count: number;                                                    │
│   price: DecCoin;                                                   │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                  SDK ENCODER: Field Mapping                         │
├─────────────────────────────────────────────────────────────────────┤
│ if (fieldName === 'resources' && parentFieldName === 'groups') {    │
│   return {                                                          │
│     resource: 1,  ← Looking for "resource" (singular)               │
│     count: 2,                                                       │
│     price: 3,                                                       │
│   }                                                                 │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘

STATUS: ❌ FIELD NAME MISMATCH
  Protobuf field name:  "resource" (singular)
  SDK interface name:   "resources" (plural)
  Encoder looks for:    "resource" (singular)

  RESULT: Encoder can't find the field because the JavaScript object
          has "resources" but the encoder mapping returns "resource"
```

---

### Level 3: Resources/ResourceUnits Message

```
┌─────────────────────────────────────────────────────────────────────┐
│               OFFICIAL PROTOBUF: Resources                          │
├─────────────────────────────────────────────────────────────────────┤
│ message Resources {                                                 │
│   uint32 id = 1;            ← FIELD 1: id (required!)               │
│   CPU cpu = 2;              ← FIELD 2: cpu                          │
│   Memory memory = 3;        ← FIELD 3: memory                       │
│   repeated Storage storage = 4;  ← FIELD 4: storage                 │
│   GPU gpu = 5;              ← FIELD 5: gpu                          │
│   repeated Endpoint endpoints = 6;  ← FIELD 6: endpoints            │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                SDK TYPESCRIPT: ResourceUnits                        │
├─────────────────────────────────────────────────────────────────────┤
│ export interface ResourceUnits {                                    │
│   // MISSING: id field!     ← MISSING FIELD 1!                      │
│   cpu: CPU;                 ← Should be field 2, treated as 1       │
│   memory: Memory;           ← Should be field 3, treated as 2       │
│   storage: Storage[];       ← Should be field 4, treated as 3       │
│   endpoints?: Endpoint[];   ← Should be field 6, treated as 4       │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│              SDK ENCODER: Field Mapping (BUGGY)                     │
├─────────────────────────────────────────────────────────────────────┤
│ if (fieldName === 'resource' || fieldName === 'cpu' || ...) {       │
│   return {                                                          │
│     cpu: 1,        ← WRONG! Should be 2                             │
│     memory: 2,     ← WRONG! Should be 3                             │
│     storage: 3,    ← WRONG! Should be 4                             │
│     endpoints: 4,  ← WRONG! Should be 6                             │
│     gpu: 5,        ← CORRECT                                        │
│     id: 1,         ← COLLISION! Same as cpu: 1                      │
│     units: 1,      ← COLLISION! Same as cpu: 1 and id: 1            │
│     quantity: 1,   ← COLLISION!                                     │
│     name: 1,       ← COLLISION!                                     │
│     attributes: 2, ← COLLISION! Same as memory: 2                   │
│   }                                                                 │
│ }                                                                   │
└─────────────────────────────────────────────────────────────────────┘

STATUS: ❌❌❌ CRITICAL FAILURE
  1. Missing "id" field entirely
  2. All field numbers shifted by -1
  3. Multiple field collisions (1: cpu, id, units, quantity, name)

  RESULT: Blockchain receives completely malformed binary data
```

---

## FIELD-BY-FIELD COMPARISON TABLE

### Resources/ResourceUnits Message Fields

| Field Name | Official Protobuf | SDK Interface | SDK Encoder | Status |
|------------|-------------------|---------------|-------------|--------|
| id         | Field 1 (uint32)  | **MISSING**   | Maps to 1   | ❌ MISSING |
| cpu        | Field 2 (CPU)     | Present       | Maps to 1   | ❌ WRONG # |
| memory     | Field 3 (Memory)  | Present       | Maps to 2   | ❌ WRONG # |
| storage    | Field 4 (Storage[]) | Present     | Maps to 3   | ❌ WRONG # |
| gpu        | Field 5 (GPU)     | Not in interface | Maps to 5 | ⚠️  PARTIAL |
| endpoints  | Field 6 (Endpoint[]) | Present (optional) | Maps to 4 | ❌ WRONG # |

---

## WIRE FORMAT COMPARISON

### What the Blockchain Expects (Correct)

```
GroupSpec.resources[0] encoding:
  0x1a <len>                    ← Field 3 of GroupSpec (resources)
    [ResourceUnit message]
      0x0a <len>                ← Field 1 of ResourceUnit (resource)
        [Resources message]
          0x08 0x00             ← Field 1: id = 0 (varint)
          0x12 <len>            ← Field 2: cpu (length-delimited)
            [CPU message]
              0x0a <len>        ← Field 1: units
                [ResourceValue]
                  0x0a <len>    ← Field 1: val
                    <bytes>
          0x1a <len>            ← Field 3: memory (length-delimited)
            [Memory message]
              0x0a <len>        ← Field 1: quantity
                [ResourceValue]
                  0x0a <len>    ← Field 1: val
                    <bytes>
          0x22 <len>            ← Field 4: storage (length-delimited)
            [Storage message]
              0x0a <len>        ← Field 1: name
                "default"
              0x12 <len>        ← Field 2: quantity
                [ResourceValue]
          0x32 <len>            ← Field 6: endpoints (length-delimited)
      0x10 0x01                 ← Field 2 of ResourceUnit: count = 1
      0x1a <len>                ← Field 3 of ResourceUnit: price
```

### What the SDK Produces (Incorrect)

```
GroupSpec.resources[0] encoding:
  0x1a <len>                    ← Field 3 of GroupSpec (resources)
    [Attempts to encode, but...]
      ❌ Looks for field "resource" (singular)
         but object has "resources" (plural)
         → Field might not be found/encoded!

      IF field is found:
      0x0a <len>                ← Field 1 (trying to encode "resources")
        [Malformed Resources message]
          0x0a <len>            ← Field 1: cpu (WRONG! Should be id!)
            [CPU message where id should be]
            → Blockchain expects varint (id)
            → Receives length-delimited (CPU)
            → DECODE ERROR: unexpected wire type

          0x12 <len>            ← Field 2: memory (WRONG! Should be cpu!)
            [Memory message where cpu should be]
            → DECODE ERROR: type mismatch

          0x1a <len>            ← Field 3: storage (WRONG! Should be memory!)
            [Storage array where memory should be]
            → DECODE ERROR: type mismatch

          0x22 <len>            ← Field 4: endpoints (WRONG! Should be storage!)
            → DECODE ERROR: unexpected field number

          MISSING Field 6 (endpoints)
```

---

## DECODING PROCESS COMPARISON

### Blockchain Decoder Processing (Official Schema)

```
Step 1: Read field header
  → 0x1a (field 3, wire type 2) = GroupSpec.resources

Step 2: Read length-delimited data (ResourceUnit)
  → 0x0a (field 1, wire type 2) = ResourceUnit.resource

Step 3: Read length-delimited data (Resources)
  → 0x08 (field 1, wire type 0) = Resources.id
  → Decode varint: id = 0 ✓

Step 4: Continue reading Resources fields
  → 0x12 (field 2, wire type 2) = Resources.cpu ✓
  → 0x1a (field 3, wire type 2) = Resources.memory ✓
  → 0x22 (field 4, wire type 2) = Resources.storage ✓
  → 0x32 (field 6, wire type 2) = Resources.endpoints ✓

Step 5: Continue reading ResourceUnit fields
  → 0x10 (field 2, wire type 0) = ResourceUnit.count ✓
  → 0x1a (field 3, wire type 2) = ResourceUnit.price ✓

RESULT: ✅ Successfully decoded
```

### Blockchain Decoder Processing (SDK Binary)

```
Step 1: Read field header
  → 0x1a (field 3, wire type 2) = GroupSpec.resources ✓

Step 2: Read length-delimited data (expects ResourceUnit)
  → May not have proper data if field name mismatch prevented encoding

Step 3: If encoded, read length-delimited data (expects Resources)
  → 0x0a (field 1, wire type 2)
  → Expects: Resources.id (wire type 0, varint)
  → Receives: CPU message (wire type 2, length-delimited)
  → ❌ ERROR: unexpected wire type for field 1

Step 4: Try to continue (may fail immediately or skip)
  → 0x12 (field 2, wire type 2)
  → Expects: Resources.cpu (CPU message)
  → Receives: Memory message
  → ❌ ERROR: type mismatch, unable to decode

Step 5: Parsing corrupted
  → Rest of message is garbage
  → ❌ FATAL: failed to decode transaction

RESULT: ❌ Transaction rejected
  Error: "unable to resolve type URL"
  Error: "failed to decode transaction"
  Error: "unknown field" or "unexpected wire type"
```

---

## DATA FLOW DIAGRAM

```
┌──────────────────────────────────────────────────────────────────────┐
│                         SDK MESSAGE CREATION                         │
├──────────────────────────────────────────────────────────────────────┤
│ JavaScript Object:                                                   │
│ {                                                                    │
│   id: { owner: 'akash1...', dseq: '123' },                          │
│   groups: [{                                                         │
│     name: 'web',                                                     │
│     requirements: {...},                                             │
│     resources: [{              ← Field name: "resources" (plural)    │
│       resources: {             ← Nested: "resources" (plural)        │
│         cpu: {...},            ← No "id" field!                      │
│         memory: {...},                                               │
│         storage: [...]                                               │
│       },                                                             │
│       count: 1,                                                      │
│       price: {...}                                                   │
│     }]                                                               │
│   }],                                                                │
│   ...                                                                │
│ }                                                                    │
└──────────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────────┐
│                         SDK ENCODER (BUGGY)                          │
├──────────────────────────────────────────────────────────────────────┤
│ For fieldName='resources', parentFieldName='groups':                 │
│   Returns mapping: {resource: 1, count: 2, price: 3}                 │
│   ❌ Looks for field "resource" but object has "resources"           │
│                                                                      │
│ For the nested resources object:                                     │
│   Returns mapping: {cpu: 1, memory: 2, storage: 3, endpoints: 4}    │
│   ❌ Wrong numbers! Should be {id: 1, cpu: 2, memory: 3, ...}        │
│                                                                      │
│ Produces malformed binary with:                                      │
│   - Missing or wrong field 1 (cpu data where id should be)           │
│   - All other fields shifted by -1                                   │
└──────────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    AKASH BLOCKCHAIN DECODER                          │
├──────────────────────────────────────────────────────────────────────┤
│ Uses official protobuf schema:                                       │
│   - ResourceUnit.resource (field 1) of type Resources                │
│   - Resources.id (field 1) of type uint32                            │
│   - Resources.cpu (field 2) of type CPU                              │
│   - etc.                                                             │
│                                                                      │
│ Receives binary from SDK:                                            │
│   - Field 1 has CPU message (wrong wire type)                        │
│   - Field 2 has Memory message (wrong type)                          │
│   - Field numbers don't match schema                                 │
│                                                                      │
│ ❌ REJECTION: "unable to resolve type URL"                           │
│ ❌ REJECTION: "failed to decode transaction"                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## THE FIX: SIDE-BY-SIDE

### Current (Broken) vs Fixed (Working)

#### TypeScript Interface: ResourceUnits

```typescript
// CURRENT (BROKEN)
export interface ResourceUnits {
  cpu: CPU
  memory: Memory
  storage: Storage[]
  endpoints?: Endpoint[]
}

// FIXED
export interface ResourceUnits {
  id?: number          // ← ADD THIS (field 1)
  cpu: CPU             // Now correctly maps to field 2
  memory: Memory       // Now correctly maps to field 3
  storage: Storage[]   // Now correctly maps to field 4
  endpoints?: Endpoint[]  // Now correctly maps to field 6
}
```

#### TypeScript Interface: Resource

```typescript
// CURRENT (BROKEN)
export interface Resource {
  resources: ResourceUnits  // ← Wrong field name
  count: number
  price: DecCoin
}

// FIXED
export interface Resource {
  resource: ResourceUnits   // ← Changed to singular to match protobuf
  count: number
  price: DecCoin
}
```

#### Encoder: Resources Field Mapping

```typescript
// CURRENT (BROKEN)
if (fieldName === 'resource' || fieldName === 'cpu' || ...) {
  return {
    cpu: 1,        // ← WRONG
    memory: 2,     // ← WRONG
    storage: 3,    // ← WRONG
    endpoints: 4,  // ← WRONG
    gpu: 5,
    id: 1,         // ← COLLISION
    units: 1,      // ← COLLISION
    // ... more collisions
  }
}

// FIXED
if (fieldName === 'resource' && parentFieldName === 'resources') {
  return {
    id: 1,         // ← CORRECT: field 1
    cpu: 2,        // ← CORRECT: field 2
    memory: 3,     // ← CORRECT: field 3
    storage: 4,    // ← CORRECT: field 4
    gpu: 5,        // ← CORRECT: field 5
    endpoints: 6,  // ← CORRECT: field 6
  }
}

// Separate mappings for CPU, Memory, Storage (no collisions)
if (fieldName === 'cpu') {
  return { units: 1, attributes: 2 }
}
if (fieldName === 'memory') {
  return { quantity: 1, attributes: 2 }
}
if (fieldName === 'storage') {
  return { name: 1, quantity: 2, attributes: 3 }
}
```

---

## SUMMARY: THE PERFECT STORM

Three bugs that compound each other:

1. **Type Name Confusion** (ResourceUnit vs Resource, Resources vs ResourceUnits)
   - Protobuf: ResourceUnit contains Resources
   - SDK: Resource contains ResourceUnits
   - Makes it hard to track which is which

2. **Field Name Mismatch** (resource vs resources)
   - Protobuf: field named `resource` (singular)
   - SDK: field named `resources` (plural)
   - Encoder can't find the field to encode

3. **Missing Required Field** (id)
   - Protobuf: field 1 is `id`
   - SDK: no `id` field at all
   - All fields shifted to wrong numbers

**Result**: Complete encoding failure. No deployment can succeed.

**Solution**: Fix all three issues simultaneously.

---

## FILE LOCATIONS

### Files to Fix
1. `/packages/protobuf/src/official-types.ts`
   - Line 69-73: Resource interface (change `resources` → `resource`)
   - Line 75-80: ResourceUnits interface (add `id?: number` as first field)

2. `/packages/protobuf/src/message-classes.ts`
   - Lines 479-486: ResourceUnit field mapping (already correct)
   - Lines 488-502: Resources field mapping (fix field numbers, remove collisions)

### Verification Files
- Official Schema: https://github.com/akash-network/akash-api
- Researcher 1 Report: `/home/andrew/akash-mcp-mello/akash-jsdk/RESEARCHER_1_ENCODING_ANALYSIS.md`
- Researcher 2 Report: `/home/andrew/akash-mcp-mello/akash-jsdk/RESEARCHER_2_SCHEMA_VERIFICATION.md`

---

**Last Updated**: 2025-11-16
**Status**: Root cause verified and documented
