# ANALYSIS INDEX: Invalid Protobuf Binary Root Cause Investigation

## Quick Start - Read This First

**Start here**: `/home/andrew/akash-mcp-mello/akash-jsdk/ROOT_CAUSE_SUMMARY.md`

This provides the complete executive summary, all three bugs, required fixes, and verification methodology.

---

## Document Overview

### 1. ROOT_CAUSE_SUMMARY.md (11 KB)
**Purpose**: Executive summary and complete fix guide
**Read if**: You want the bottom line - what's broken and how to fix it

**Contains**:
- Executive summary of all three bugs
- Official protobuf schema structure
- Required fixes with exact code changes
- Impact analysis
- Validation checklist
- Next steps

**File**: `/home/andrew/akash-mcp-mello/akash-jsdk/ROOT_CAUSE_SUMMARY.md`

---

### 2. RESEARCHER_1_ENCODING_ANALYSIS.md (13 KB)
**Purpose**: Detailed code path analysis and bug identification
**Read if**: You want to understand HOW the bugs were discovered

**Contains**:
- Complete encoding pipeline trace
- Three bugs identified with code locations
- Wire type analysis
- Example encodings (correct vs incorrect)
- Why blockchain rejects the binary
- Recommended fixes

**File**: `/home/andrew/akash-mcp-mello/akash-jsdk/RESEARCHER_1_ENCODING_ANALYSIS.md`

---

### 3. RESEARCHER_2_SCHEMA_VERIFICATION.md (19 KB)
**Purpose**: Official schema verification and comparison
**Read if**: You want proof that the SDK doesn't match the actual protobuf schema

**Contains**:
- Official Akash protobuf schema (from akash-api repository)
- Complete message hierarchy with field numbers
- Current SDK implementation analysis
- Correct vs incorrect mapping comparison tables
- Visual structure diagrams
- Blockchain rejection analysis
- Verified fixes with schema references

**File**: `/home/andrew/akash-mcp-mello/akash-jsdk/RESEARCHER_2_SCHEMA_VERIFICATION.md`

---

### 4. SCHEMA_MISMATCH_VISUAL.md (26 KB)
**Purpose**: Visual side-by-side comparison of schema vs implementation
**Read if**: You want to SEE the differences in a clear, visual format

**Contains**:
- Quick reference to the three bugs
- Side-by-side schema comparisons with ASCII diagrams
- Field-by-field comparison tables
- Wire format hex dumps (correct vs incorrect)
- Decoding process comparison
- Data flow diagrams
- Before/after fix comparison

**File**: `/home/andrew/akash-mcp-mello/akash-jsdk/SCHEMA_MISMATCH_VISUAL.md`

---

## Reading Guide by Role

### For Developers Fixing the Bug
1. Read: `ROOT_CAUSE_SUMMARY.md` (section "REQUIRED FIXES")
2. Reference: `SCHEMA_MISMATCH_VISUAL.md` (section "THE FIX: SIDE-BY-SIDE")
3. Verify: `RESEARCHER_2_SCHEMA_VERIFICATION.md` (section "VERIFIED FIXES")

### For Code Reviewers
1. Read: `RESEARCHER_1_ENCODING_ANALYSIS.md` (complete code analysis)
2. Read: `RESEARCHER_2_SCHEMA_VERIFICATION.md` (schema verification)
3. Verify: `ROOT_CAUSE_SUMMARY.md` (convergence of findings)

### For Project Managers
1. Read: `ROOT_CAUSE_SUMMARY.md` (sections "EXECUTIVE SUMMARY" and "IMPACT ANALYSIS")
2. Skim: `SCHEMA_MISMATCH_VISUAL.md` (section "QUICK REFERENCE")

### For Security Auditors
1. Read: `RESEARCHER_2_SCHEMA_VERIFICATION.md` (official schema verification)
2. Read: `RESEARCHER_1_ENCODING_ANALYSIS.md` (wire format analysis)
3. Reference: `SCHEMA_MISMATCH_VISUAL.md` (wire format hex dumps)

---

## Key Findings Summary

### The Three Bugs

1. **Missing `id` Field**
   - Location: `/packages/protobuf/src/official-types.ts:75-80`
   - Issue: ResourceUnits interface missing required `id?: number` field
   - Impact: Field 1 gets wrong data

2. **Wrong Field Numbers**
   - Location: `/packages/protobuf/src/message-classes.ts:488-502`
   - Issue: All Resources fields mapped to wrong numbers
   - Impact: Every field encoded incorrectly

3. **Field Name Mismatch**
   - Location: `/packages/protobuf/src/official-types.ts:70`
   - Issue: Uses `resources` but protobuf requires `resource`
   - Impact: Encoder can't find field

### Official Protobuf Schema

Source: https://github.com/akash-network/akash-api

```
GroupSpec
  └─ resources: ResourceUnit[]
      └─ resource: Resources (field 1)
          ├─ id: uint32 (field 1) ← MISSING in SDK
          ├─ cpu: CPU (field 2) ← SDK uses field 1
          ├─ memory: Memory (field 3) ← SDK uses field 2
          ├─ storage: Storage[] (field 4) ← SDK uses field 3
          ├─ gpu: GPU (field 5)
          └─ endpoints: Endpoint[] (field 6) ← SDK uses field 4
```

---

## Files to Modify

### 1. `/packages/protobuf/src/official-types.ts`

**Line 70** - Change:
```typescript
export interface Resource {
  resources: ResourceUnits  // ← Change to "resource"
  count: number
  price: DecCoin
}
```

**Lines 75-80** - Add `id` field:
```typescript
export interface ResourceUnits {
  id?: number  // ← ADD THIS
  cpu: CPU
  memory: Memory
  storage: Storage[]
  endpoints?: Endpoint[]
}
```

### 2. `/packages/protobuf/src/message-classes.ts`

**Lines 488-502** - Replace entire block with:
```typescript
// Resources message (field 1 of ResourceUnit)
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

---

## Verification Steps

After applying fixes:

1. **Build**:
   ```bash
   pnpm build
   ```

2. **Run tests**:
   ```bash
   pnpm test
   ```

3. **Validate release**:
   ```bash
   pnpm run validate:release
   ```

4. **Test on Akash testnet**:
   - Create a deployment
   - Verify transaction is accepted
   - Confirm deployment is created

5. **Compare wire format**:
   - Encode a test message
   - Compare hex output to known-good encoding
   - Verify field numbers match schema

---

## Research Methodology

### Researcher 1: Code Path Analysis
- Traced execution from `deployments.ts` → `registry.ts` → `message-classes.ts`
- Analyzed encoder logic line by line
- Identified field mapping bugs
- Constructed wire format analysis
- Simulated blockchain decoder

### Researcher 2: Schema Verification
- Fetched official protobuf definitions from akash-api repository
- Extracted exact field numbers and types
- Compared schema to SDK implementation
- Created field-by-field comparison tables
- Verified blockchain rejection reasons

### Convergence
Both researchers independently identified the same three bugs, confirming the root cause.

---

## Additional Context

### Why This Happened
- SDK migrated from full protobuf generation to type-only mode
- Custom encoder was hand-written without schema reference
- Used heuristic field name matching instead of schema-driven encoding
- No wire format validation tests
- No integration tests with actual Akash blockchain

### Why It's Critical
- 100% of deployment creation operations fail
- Blockchain rejects all MsgCreateDeployment transactions
- Users cannot deploy workloads to Akash
- Core functionality is completely broken

### Why It's Fixable
- Root cause is definitively identified
- Fixes are surgical (two files, ~30 lines)
- No breaking API changes required
- Can be patched and released quickly

---

## Timeline

- **Initial Discovery**: SDK v3.10.6 deployments failing
- **Researcher 1 Analysis**: Code path traced, bugs identified
- **Researcher 2 Verification**: Official schema retrieved, bugs confirmed
- **Analysis Complete**: 2025-11-16
- **Status**: Root cause verified, fixes documented

---

## Contact / Questions

For questions about this analysis:
- Refer to the detailed reports in this directory
- Check the official Akash protobuf schema: https://github.com/akash-network/akash-api
- Review the SDK source code in `/packages/protobuf/src/`

---

## Document Sizes

| Document | Size | Purpose |
|----------|------|---------|
| ROOT_CAUSE_SUMMARY.md | 11 KB | Executive summary & fixes |
| RESEARCHER_1_ENCODING_ANALYSIS.md | 13 KB | Code analysis |
| RESEARCHER_2_SCHEMA_VERIFICATION.md | 19 KB | Schema verification |
| SCHEMA_MISMATCH_VISUAL.md | 26 KB | Visual comparisons |
| ANALYSIS_INDEX.md | This file | Navigation guide |

**Total Analysis**: ~69 KB of detailed documentation

---

## Quick Links

- **Official Akash API**: https://github.com/akash-network/akash-api
- **Protobuf Definitions**: https://github.com/akash-network/akash-api/tree/main/proto/node/akash
- **GroupSpec**: https://github.com/akash-network/akash-api/blob/main/proto/node/akash/deployment/v1beta3/groupspec.proto
- **ResourceUnit**: https://github.com/akash-network/akash-api/blob/main/proto/node/akash/deployment/v1beta3/resourceunit.proto
- **Resources**: https://github.com/akash-network/akash-api/blob/main/proto/node/akash/base/v1beta3/resources.proto

---

**Last Updated**: 2025-11-16
**Analysis Status**: COMPLETE
**Root Cause**: VERIFIED
**Fixes**: DOCUMENTED
