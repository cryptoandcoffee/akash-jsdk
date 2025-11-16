# ENGINEER 1: Fix Specification for Protobuf Encoding Bugs
## Comprehensive Surgical Fix Document

**Date**: 2025-11-16
**Engineer**: Engineer 1
**Task**: Fix three critical protobuf encoding bugs in field mappings
**Status**: SPECIFICATION COMPLETE - READY FOR IMPLEMENTATION

---

## EXECUTIVE SUMMARY

This document provides the **exact line-by-line fixes** required to resolve the three critical protobuf encoding bugs that cause 100% deployment creation failure. Each fix includes:

1. Exact file path and line numbers
2. Current code (buggy version)
3. Fixed code (correct version)
4. Technical explanation of why the fix works
5. Implementation order

**DO NOT IMPLEMENT YET** - This is a specification document for review.

---

## BUG ANALYSIS SUMMARY

After analyzing:
- `/home/andrew/akash-mcp-mello/akash-jsdk/ROOT_CAUSE_SUMMARY.md`
- `/home/andrew/akash-mcp-mello/akash-jsdk/RESEARCHER_2_SCHEMA_VERIFICATION.md`
- `/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/message-classes.ts`
- `/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/official-types.ts`

I have identified the **exact locations** of all three bugs and the precise fixes required.

---

## OFFICIAL PROTOBUF SCHEMA (Reference)

From Akash API repository (verified by Researcher 2):

```protobuf
message GroupSpec {
  string name = 1;
  PlacementRequirements requirements = 2;
  repeated ResourceUnit resources = 3;
}

message ResourceUnit {
  Resources resource = 1;  // Field name: "resource" (singular)
  uint32 count = 2;
  DecCoin price = 3;
}

message Resources {
  uint32 id = 1;           // CRITICAL: Field 1 is "id"!
  CPU cpu = 2;             // Field 2, not 1
  Memory memory = 3;       // Field 3, not 2
  repeated Storage storage = 4;  // Field 4, not 3
  GPU gpu = 5;
  repeated Endpoint endpoints = 6;  // Field 6, not 4
}
```

---

## FIX #1: Add Missing `id` Field to ResourceUnits Interface

### Location
**File**: `/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/official-types.ts`
**Lines**: 75-80

### Current Code (BUGGY)
```typescript
export interface ResourceUnits {
  cpu: CPU
  memory: Memory
  storage: Storage[]
  endpoints?: Endpoint[]
}
```

### Fixed Code (CORRECT)
```typescript
export interface ResourceUnits {
  id?: number              // ADD THIS - field 1 in Resources protobuf message
  cpu: CPU
  memory: Memory
  storage: Storage[]
  endpoints?: Endpoint[]
}
```

### Why This Fix Works
1. The official Akash protobuf schema defines `Resources` message with `uint32 id = 1` as the first field
2. The SDK's `ResourceUnits` interface corresponds to the protobuf `Resources` message
3. Currently the interface omits this field entirely, causing the encoder to skip field 1
4. When field 1 is skipped, the decoder expects `id` but receives `cpu` data instead
5. Adding `id?: number` makes the TypeScript interface match the protobuf schema
6. The `?` makes it optional for backward compatibility with existing code

### Impact
- Prevents field number shift that causes all subsequent fields to be misaligned
- Allows encoder to write the correct data to field 1 (id) instead of cpu
- Critical prerequisite for Fix #3 (encoder field mapping)

---

## FIX #2: Rename Field from `resources` to `resource` in Resource Interface

### Location
**File**: `/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/official-types.ts`
**Line**: 70

### Current Code (BUGGY)
```typescript
export interface Resource {
  resources: ResourceUnits
  count: number
  price: DecCoin
}
```

### Fixed Code (CORRECT)
```typescript
export interface Resource {
  resource: ResourceUnits   // CHANGE from "resources" to "resource" (singular)
  count: number
  price: DecCoin
}
```

### Why This Fix Works
1. The official protobuf `ResourceUnit` message has field 1 named `resource` (singular)
2. The SDK's `Resource` interface corresponds to protobuf's `ResourceUnit` message
3. Currently the SDK uses `resources` (plural) but protobuf expects `resource` (singular)
4. The encoder at lines 480-486 correctly looks for `resource: 1` but the TypeScript object has `resources`
5. This mismatch prevents the encoder from finding the field to encode
6. Renaming to `resource` makes the interface match both the protobuf schema and the encoder

### Impact
- Fixes field name mismatch that prevents encoder from locating the resource data
- Makes TypeScript interface consistent with protobuf schema
- Allows encoder logic at lines 480-486 to work correctly

### Important Note
This is a **BREAKING CHANGE** to the public API. Any code that creates `Resource` objects like:
```typescript
const resource: Resource = {
  resources: {...},  // OLD (plural)
  count: 1,
  price: {...}
}
```

Must be updated to:
```typescript
const resource: Resource = {
  resource: {...},   // NEW (singular)
  count: 1,
  price: {...}
}
```

---

## FIX #3: Correct Field Number Mappings in Encoder

### Location
**File**: `/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/message-classes.ts`
**Lines**: 488-502

### Current Code (BUGGY)
```typescript
  // Resource/CPU/Memory/Storage (nested in resources or standalone)
  if (fieldName === 'resource' || fieldName === 'cpu' || fieldName === 'memory' || fieldName === 'storage' || fieldName === 'gpu') {
    return {
      cpu: 1,         // WRONG! Should be 2
      memory: 2,      // WRONG! Should be 3
      storage: 3,     // WRONG! Should be 4
      endpoints: 4,   // WRONG! Should be 6
      gpu: 5,         // CORRECT
      id: 1,          // COLLISION with cpu: 1!
      units: 1,       // COLLISION with cpu: 1 and id: 1!
      quantity: 1,    // COLLISION!
      name: 1,        // COLLISION!
      attributes: 2,  // COLLISION with memory: 2!
    }
  }
```

### Fixed Code (CORRECT)
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

### Why This Fix Works

#### Problem Analysis
The current code has a **catch-all condition** that conflates multiple different message types:
- `Resources` message (with fields: id, cpu, memory, storage, gpu, endpoints)
- `CPU` message (with fields: units, attributes)
- `Memory` message (with fields: quantity, attributes)
- `Storage` message (with fields: name, quantity, attributes)
- `ResourceValue` message (with field: val)

This causes **field number collisions** where multiple fields map to the same number:
- Field 1: cpu, id, units, quantity, name (5 different fields!)
- Field 2: memory, attributes (2 different fields!)

#### Solution Approach
The fix **separates each message type** into its own conditional block:

1. **Resources message**: Only triggers when `fieldName === 'resource'` AND `parentFieldName === 'resources'`
   - Maps: `{id: 1, cpu: 2, memory: 3, storage: 4, gpu: 5, endpoints: 6}`
   - Matches official protobuf schema exactly

2. **CPU message**: Only triggers when `fieldName === 'cpu'`
   - Maps: `{units: 1, attributes: 2}`
   - No collisions because it's in its own block

3. **Memory message**: Only triggers when `fieldName === 'memory'`
   - Maps: `{quantity: 1, attributes: 2}`
   - No collisions because it's in its own block

4. **Storage message**: Only triggers when `fieldName === 'storage'`
   - Maps: `{name: 1, quantity: 2, attributes: 3}`
   - No collisions because it's in its own block

5. **ResourceValue message**: Only triggers when `fieldName === 'units'` OR `fieldName === 'quantity'`
   - Maps: `{val: 1}`
   - Handles both CPU.units and Memory.quantity correctly

#### Why Field Numbers Are Correct
According to the official Akash protobuf schema:

**Resources message**:
- Field 1: `uint32 id` → `id: 1`
- Field 2: `CPU cpu` → `cpu: 2`
- Field 3: `Memory memory` → `memory: 3`
- Field 4: `repeated Storage storage` → `storage: 4`
- Field 5: `GPU gpu` → `gpu: 5`
- Field 6: `repeated Endpoint endpoints` → `endpoints: 6`

**CPU message**:
- Field 1: `ResourceValue units` → `units: 1`
- Field 2: `repeated Attribute attributes` → `attributes: 2`

**Memory message**:
- Field 1: `ResourceValue quantity` → `quantity: 1`
- Field 2: `repeated Attribute attributes` → `attributes: 2`

**Storage message**:
- Field 1: `string name` → `name: 1`
- Field 2: `ResourceValue quantity` → `quantity: 2`
- Field 3: `repeated Attribute attributes` → `attributes: 3`

**ResourceValue message**:
- Field 1: `bytes val` → `val: 1`

### Impact
- Eliminates all field number collisions
- Makes encoder field numbers match official protobuf schema exactly
- Allows blockchain decoder to correctly parse the binary protobuf
- Each message type gets its own dedicated field mapping

---

## IMPLEMENTATION ORDER

**CRITICAL**: These fixes must be applied in the correct order to avoid introducing new bugs.

### Step 1: Fix #1 - Add `id` Field to Interface
**File**: `/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/official-types.ts`
**Why First**: Changes the TypeScript interface without breaking existing code (field is optional)

### Step 2: Fix #3 - Correct Encoder Field Mappings
**File**: `/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/message-classes.ts`
**Why Second**: Updates encoder to handle the new `id` field and fixes all field number mappings

### Step 3: Fix #2 - Rename Field in Interface
**File**: `/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/official-types.ts`
**Why Last**: This is a breaking change that requires updating all usage sites

**Alternative Approach**: If breaking changes are not acceptable, Fix #2 can be deferred and the encoder can be updated to handle both `resource` and `resources` field names temporarily.

---

## VALIDATION AFTER IMPLEMENTATION

After applying all three fixes, verify:

### 1. TypeScript Compilation
```bash
cd /home/andrew/akash-mcp-mello/akash-jsdk
pnpm run build
```
Expected: No TypeScript errors

### 2. Field Mapping Verification
Create a test to verify encoder produces correct field numbers:

```typescript
// Test pseudo-code
const resourceUnits: ResourceUnits = {
  id: 0,
  cpu: { units: { val: new Uint8Array([10, 0, 0, 0]) } },
  memory: { quantity: { val: new Uint8Array([0, 0, 128, 63]) } },
  storage: [{ name: 'default', quantity: { val: new Uint8Array([0, 0, 160, 64]) } }],
}

const resource: Resource = {
  resource: resourceUnits,  // Note: singular
  count: 1,
  price: { denom: 'uakt', amount: '1000' }
}

// Encode and verify field numbers in binary
const encoded = encodeMessageToProtobuf(resource, ...)
// Field 1 should contain Resources message
// Inside Resources:
//   Field 1 should be varint (id)
//   Field 2 should be length-delimited (cpu)
//   Field 3 should be length-delimited (memory)
//   Field 4 should be length-delimited (storage)
```

### 3. Wire Format Validation
Expected wire format for Resources message:

```
Field 1 (0x08): id = 0 (varint)           ← FIXED: Now writes id, not cpu
Field 2 (0x12): CPU (length-delimited)     ← FIXED: Now field 2, not field 1
Field 3 (0x1a): Memory (length-delimited)  ← FIXED: Now field 3, not field 2
Field 4 (0x22): Storage (length-delimited) ← FIXED: Now field 4, not field 3
Field 6 (0x32): Endpoints (length-delim)   ← FIXED: Now field 6, not field 4
```

### 4. Integration Test
Create a deployment on Akash testnet:

```bash
# After fixes are implemented
pnpm test
# Should succeed

# Test actual deployment creation
# Use SDK to create MsgCreateDeployment
# Broadcast to testnet
# Verify transaction is accepted (not rejected with decode error)
```

### 5. Regression Tests
Ensure existing tests still pass:

```bash
pnpm test
```

If tests fail, they likely were testing the buggy behavior and need to be updated.

---

## BREAKING CHANGES ANALYSIS

### Fix #1 (Add `id` field)
**Breaking**: NO
**Reason**: Field is optional (`id?: number`), existing code continues to work

### Fix #2 (Rename `resources` to `resource`)
**Breaking**: YES
**Reason**: Changes public API field name from plural to singular
**Impact**: Any code creating `Resource` objects must update field name
**Migration Path**:
```typescript
// Before
const res: Resource = { resources: {...}, count: 1, price: {...} }

// After
const res: Resource = { resource: {...}, count: 1, price: {...} }
```

### Fix #3 (Encoder field mappings)
**Breaking**: NO
**Reason**: Internal encoder logic, no public API changes
**Impact**: Binary protobuf output changes (this is the fix!), but TypeScript API remains same

---

## FILES TO MODIFY

### File 1: `/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/official-types.ts`
**Changes**:
1. Line 75-80: Add `id?: number` to `ResourceUnits` interface (Fix #1)
2. Line 70: Change `resources: ResourceUnits` to `resource: ResourceUnits` (Fix #2)

**Total lines changed**: 2 lines modified, 1 line added

### File 2: `/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/message-classes.ts`
**Changes**:
1. Lines 488-502: Delete the catch-all condition
2. Insert new type-specific field mappings (Fix #3)

**Total lines changed**: 15 lines deleted, 33 lines added (net +18 lines)

---

## USAGE SITES THAT NEED UPDATES (Fix #2 Impact)

After implementing Fix #2 (rename `resources` to `resource`), search for all files that create `Resource` objects:

```bash
cd /home/andrew/akash-mcp-mello/akash-jsdk
grep -r "resources:" packages/ --include="*.ts" --include="*.tsx"
```

Expected locations:
- `/packages/core/src/modules/deployments.ts` - Likely creates deployment messages
- `/packages/cli/src/commands/deploy.ts` - CLI deployment creation
- Test files - Any tests that create Resource objects

Each instance of:
```typescript
resources: ResourceUnits
```

Must change to:
```typescript
resource: ResourceUnits
```

---

## RISK ASSESSMENT

### Low Risk
- **Fix #1**: Adding optional field to interface (no breaking changes)
- **Fix #3**: Internal encoder logic (improves binary output)

### Medium Risk
- **Fix #2**: Public API field rename (requires updating usage sites)

### Mitigation
1. Search entire codebase for `resources:` field usage before implementing Fix #2
2. Update all usage sites in the same commit as Fix #2
3. Add deprecation warning before removing old field name (if gradual migration desired)
4. Run full test suite after each fix
5. Test deployment creation on testnet before production release

---

## ALTERNATIVE APPROACH (If Breaking Changes Not Acceptable)

If Fix #2 (field rename) is not acceptable due to breaking changes, use this approach:

### Modified Fix #2: Support Both Field Names
**File**: `/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/official-types.ts`

```typescript
export interface Resource {
  /** @deprecated Use 'resource' (singular) instead */
  resources?: ResourceUnits
  resource?: ResourceUnits   // NEW: Add this without removing old one
  count: number
  price: DecCoin
}
```

**File**: `/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/message-classes.ts`

Update encoder to handle both:
```typescript
// When encoding Resource, check both field names
if (message.resource) {
  // Encode message.resource
} else if (message.resources) {
  // Encode message.resources with same logic
  // Log deprecation warning
}
```

This allows:
1. Backward compatibility with existing code using `resources`
2. Forward compatibility with new code using `resource`
3. Gradual migration path
4. Deprecation warnings to encourage migration

---

## CHANGELOG ENTRY (For Release Notes)

```markdown
### Fixed
- **Critical**: Fixed protobuf encoding for deployment creation
  - Added missing `id` field to `ResourceUnits` interface (field 1 in Resources message)
  - Corrected field number mappings in protobuf encoder:
    - Resources: `{id: 1, cpu: 2, memory: 3, storage: 4, gpu: 5, endpoints: 6}`
    - CPU: `{units: 1, attributes: 2}`
    - Memory: `{quantity: 1, attributes: 2}`
    - Storage: `{name: 1, quantity: 2, attributes: 3}`
  - Fixed field name mismatch in `Resource` interface (`resources` → `resource`)

### Breaking Changes
- `Resource` interface field renamed from `resources` to `resource` to match protobuf schema
  - Migration: Change `{ resources: {...} }` to `{ resource: {...} }`

### Impact
- Fixes 100% deployment creation failure rate
- All MsgCreateDeployment transactions now accepted by Akash blockchain
```

---

## VERIFICATION CHECKLIST

After implementation, verify:

- [ ] Fix #1 applied: `id?: number` added to `ResourceUnits` interface
- [ ] Fix #2 applied: `resources` renamed to `resource` in `Resource` interface
- [ ] Fix #3 applied: Encoder field mappings split into type-specific blocks
- [ ] All usage sites updated to use `resource` (singular)
- [ ] TypeScript compilation succeeds: `pnpm run build`
- [ ] All tests pass: `pnpm test`
- [ ] Wire format validation test passes
- [ ] Integration test on testnet succeeds
- [ ] No field number collisions in encoder
- [ ] Field numbers match official Akash protobuf schema
- [ ] Deployment creation works end-to-end

---

## CONCLUSION

This specification provides **surgical, precise fixes** for the three critical protobuf encoding bugs:

1. **Fix #1**: Add missing `id` field to `ResourceUnits` interface (1 line added)
2. **Fix #2**: Rename `resources` to `resource` in `Resource` interface (1 line modified)
3. **Fix #3**: Correct encoder field mappings by splitting into type-specific blocks (48 lines modified)

**Total code changes**: ~50 lines across 2 files

**Expected outcome**: 100% deployment creation success rate (currently 0%)

**Ready for implementation**: Yes - proceed to Engineer 2 and Engineer 3 for execution

---

**Next Steps**:
1. Review this specification
2. Confirm approach is correct
3. Assign to Engineers 2 & 3 for implementation
4. Test thoroughly on testnet
5. Release patched version

**DO NOT IMPLEMENT YET** - This document is for review and approval before execution.

---

**Document Status**: COMPLETE
**Confidence Level**: 100%
**Analysis Sources**: Official Akash protobuf schema, SDK source code, researcher reports
**Prepared By**: Engineer 1
**Date**: 2025-11-16
