# Execution Checklist - Protobuf Encoding Bug Fixes

**For Engineers 2 & 3**

---

## Pre-Implementation Verification

- [ ] Read `/home/andrew/akash-mcp-mello/akash-jsdk/ENGINEER_1_FIX_SPECIFICATION.md`
- [ ] Read `/home/andrew/akash-mcp-mello/akash-jsdk/QUICK_FIX_REFERENCE.md`
- [ ] Understand the three bugs and why each fix is needed
- [ ] Current working directory: `/home/andrew/akash-mcp-mello/akash-jsdk`
- [ ] Git status clean (commit or stash any uncommitted changes)

---

## Step 1: Fix #1 - Add `id` Field to ResourceUnits Interface

### File
`/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/official-types.ts`

### Exact Location
**Line 75**: Start of `ResourceUnits` interface
**Line 76**: Where `cpu: CPU` currently is

### Action
Add this line BEFORE `cpu: CPU`:
```typescript
  id?: number
```

### Result
```typescript
export interface ResourceUnits {
  id?: number              // ← NEW LINE
  cpu: CPU
  memory: Memory
  storage: Storage[]
  endpoints?: Endpoint[]
}
```

### Verification
- [ ] Line added at correct location (line 76)
- [ ] Proper indentation (2 spaces)
- [ ] Optional field marker `?` present
- [ ] Type is `number` not `Number`

---

## Step 2: Fix #3 - Correct Encoder Field Mappings

### File
`/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/message-classes.ts`

### Exact Location
**Lines 488-502**: The buggy catch-all condition

### Action
**DELETE** these 15 lines:
```typescript
  // Resource/CPU/Memory/Storage (nested in resources or standalone)
  if (fieldName === 'resource' || fieldName === 'cpu' || fieldName === 'memory' || fieldName === 'storage' || fieldName === 'gpu') {
    return {
      cpu: 1,
      memory: 2,
      storage: 3,
      endpoints: 4,
      gpu: 5,
      id: 1,
      units: 1,
      quantity: 1,
      name: 1,
      attributes: 2,
    }
  }
```

**REPLACE WITH** these 33 lines:
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

### Verification
- [ ] Old catch-all condition completely removed
- [ ] Five new type-specific conditions added
- [ ] Resources mapping: `{id: 1, cpu: 2, memory: 3, storage: 4, gpu: 5, endpoints: 6}`
- [ ] CPU mapping: `{units: 1, attributes: 2}`
- [ ] Memory mapping: `{quantity: 1, attributes: 2}`
- [ ] Storage mapping: `{name: 1, quantity: 2, attributes: 3}`
- [ ] ResourceValue mapping: `{val: 1}`
- [ ] Proper indentation throughout

---

## Step 3: Build and Test (Before Breaking Change)

### Commands
```bash
cd /home/andrew/akash-mcp-mello/akash-jsdk
pnpm run build
```

### Expected Result
- [ ] Build succeeds with no TypeScript errors
- [ ] No compilation warnings related to ResourceUnits or Resource

### If Build Fails
1. Check syntax errors in the code you modified
2. Verify field names are spelled correctly
3. Verify proper TypeScript syntax (commas, colons, brackets)

---

## Step 4: Find All Usage Sites (Before Fix #2)

### Command
```bash
cd /home/andrew/akash-mcp-mello/akash-jsdk
grep -rn "resources:" packages/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"
```

### Expected Output
List of files that use `resources:` field in Resource objects

### Action
- [ ] Document all files that need updating
- [ ] Create list of line numbers for each file
- [ ] Verify each usage is actually creating a `Resource` object (not other types)

---

## Step 5: Fix #2 - Rename Field in Resource Interface

### File
`/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/official-types.ts`

### Exact Location
**Line 69**: Start of `Resource` interface
**Line 70**: Where `resources: ResourceUnits` currently is

### Action
Change line 70 from:
```typescript
  resources: ResourceUnits
```

To:
```typescript
  resource: ResourceUnits
```

### Result
```typescript
export interface Resource {
  resource: ResourceUnits   // ← CHANGED (plural to singular)
  count: number
  price: DecCoin
}
```

### Verification
- [ ] Field name changed from `resources` to `resource`
- [ ] Type remains `ResourceUnits` (unchanged)
- [ ] No other lines modified

---

## Step 6: Update All Usage Sites

### For Each File Found in Step 4

**Find and replace**:
- Old: `resources: <value>`
- New: `resource: <value>`

**Example**:
```typescript
// Before
const res: Resource = {
  resources: resourceUnits,
  count: 1,
  price: { denom: 'uakt', amount: '1000' }
}

// After
const res: Resource = {
  resource: resourceUnits,  // ← CHANGED
  count: 1,
  price: { denom: 'uakt', amount: '1000' }
}
```

### Verification Per File
- [ ] All instances of `resources:` in Resource objects changed to `resource:`
- [ ] No unrelated code modified
- [ ] Proper syntax maintained

---

## Step 7: Final Build and Test

### Commands
```bash
cd /home/andrew/akash-mcp-mello/akash-jsdk
pnpm run build
pnpm test
```

### Expected Results
- [ ] Build succeeds with no errors
- [ ] All tests pass
- [ ] No TypeScript compilation errors
- [ ] No runtime errors

### If Tests Fail
1. Review test failures to see if they're testing the old (buggy) behavior
2. Update tests to use new field name `resource` instead of `resources`
3. Verify tests are actually testing correct protobuf encoding

---

## Step 8: Validation Tests

### Create Test Deployment (If Possible)

```bash
# If you have access to Akash testnet credentials
pnpm run build
# Test deployment creation via CLI or programmatic test
```

### Verify Wire Format (Advanced)

Create a unit test to verify binary output:
```typescript
import { encodeMessageToProtobuf, getFieldMapForNestedType } from './message-classes'

const resourceUnits = {
  id: 0,
  cpu: { units: { val: new Uint8Array([10, 0, 0, 0]) } },
  memory: { quantity: { val: new Uint8Array([0, 0, 128, 63]) } },
  storage: [{ name: 'default', quantity: { val: new Uint8Array([0, 0, 160, 64]) } }],
}

const resource = {
  resource: resourceUnits,
  count: 1,
  price: { denom: 'uakt', amount: '1000' }
}

const fieldMap = getFieldMapForNestedType('resources', 'groups')
const encoded = encodeMessageToProtobuf(resource, fieldMap, 'resources')

// Verify binary contains:
// - Field 1 with Resources message
// - Inside Resources: Field 1 = varint (id), Field 2 = CPU, Field 3 = Memory, Field 4 = Storage
console.log('Encoded bytes:', encoded)
```

### Verification
- [ ] Test deployment creation succeeds (if testnet available)
- [ ] Wire format validation test passes
- [ ] Binary output contains correct field numbers
- [ ] Field 1 of Resources is varint (id) not length-delimited (cpu)

---

## Step 9: Code Review

### Self-Review Checklist
- [ ] All three fixes applied correctly
- [ ] No syntax errors
- [ ] No unintended changes to other code
- [ ] Proper indentation and formatting
- [ ] All usage sites updated
- [ ] Tests updated if needed

### Peer Review
- [ ] Request review from Engineer 3 or team lead
- [ ] Walk through each change
- [ ] Explain why each fix is necessary
- [ ] Show before/after comparison

---

## Step 10: Commit Changes

### Git Commands
```bash
cd /home/andrew/akash-mcp-mello/akash-jsdk
git add packages/protobuf/src/official-types.ts
git add packages/protobuf/src/message-classes.ts
# Add any other files modified (usage sites)
git status
```

### Commit Message
```
fix(protobuf): correct field mappings for deployment creation

Fixes three critical protobuf encoding bugs causing 100% deployment
creation failure:

1. Add missing `id` field to ResourceUnits interface (Resources.id = field 1)
2. Rename Resource.resources to Resource.resource (match protobuf schema)
3. Correct encoder field number mappings:
   - Resources: {id: 1, cpu: 2, memory: 3, storage: 4, gpu: 5, endpoints: 6}
   - Split catch-all mapping into type-specific blocks
   - Eliminate field number collisions

BREAKING CHANGE: Resource interface field renamed from `resources` to
`resource` to match protobuf ResourceUnit.resource field name.

Migration: Change `{ resources: {...} }` to `{ resource: {...} }`

Closes #XXX (if issue exists)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Verification
- [ ] Commit message is clear and descriptive
- [ ] All modified files included in commit
- [ ] Breaking change noted in commit message
- [ ] Migration instructions provided

---

## Step 11: Post-Commit Verification

### Commands
```bash
git log -1 --stat
git show HEAD
```

### Verification
- [ ] Commit includes correct files
- [ ] Changes match specification
- [ ] No unintended files committed

---

## Step 12: Documentation Updates (If Needed)

### Files That May Need Updates
- [ ] `packages/protobuf/README.md` - Update if it documents the Resource interface
- [ ] `packages/core/README.md` - Update if it has examples using Resource
- [ ] `CHANGELOG.md` - Add entry for this fix
- [ ] API documentation - Update if auto-generated

### CHANGELOG Entry
```markdown
## [Unreleased]

### Fixed
- **Critical**: Fixed protobuf encoding for deployment creation
  - Added missing `id` field to `ResourceUnits` interface
  - Corrected field number mappings in protobuf encoder
  - Fixed 100% deployment creation failure rate

### Breaking Changes
- `Resource` interface field renamed from `resources` to `resource`
  - Migration: Change `{ resources: {...} }` to `{ resource: {...} }`
```

---

## Rollback Plan (If Needed)

If something goes wrong:

```bash
# Undo last commit (keep changes)
git reset --soft HEAD^

# Undo last commit (discard changes)
git reset --hard HEAD^

# Restore specific file
git checkout HEAD^ -- packages/protobuf/src/official-types.ts
```

---

## Success Criteria

### All Must Be True
- [ ] All three fixes implemented correctly
- [ ] Build succeeds: `pnpm run build`
- [ ] Tests pass: `pnpm test`
- [ ] No TypeScript errors
- [ ] All usage sites updated
- [ ] Proper git commit created
- [ ] Changes match specification document

### Deployment Success (Integration Test)
- [ ] MsgCreateDeployment can be created
- [ ] Binary encoding matches protobuf schema
- [ ] Akash blockchain accepts transactions (if testnet available)

---

## Troubleshooting

### Build Fails with TypeScript Error
**Problem**: `Property 'resource' does not exist on type 'Resource'`
**Solution**: You haven't applied Fix #2 yet, or you missed a usage site

### Build Fails with Type Mismatch
**Problem**: `Type 'number' is not assignable to type 'Number'`
**Solution**: Check that you used `number` (lowercase) not `Number` (uppercase)

### Tests Fail After Changes
**Problem**: Tests expect old field name `resources`
**Solution**: Update test code to use new field name `resource`

### Encoder Still Produces Wrong Binary
**Problem**: Field mappings not updated correctly
**Solution**: Verify lines 488-502 in message-classes.ts match specification exactly

---

## Final Checklist

- [ ] All three bugs fixed
- [ ] All files modified as specified
- [ ] Build succeeds
- [ ] Tests pass
- [ ] Usage sites updated
- [ ] Commit created
- [ ] Documentation updated (if needed)
- [ ] Peer review requested
- [ ] Ready for merge

---

**Reference Documents**:
- Detailed specification: `/home/andrew/akash-mcp-mello/akash-jsdk/ENGINEER_1_FIX_SPECIFICATION.md`
- Quick reference: `/home/andrew/akash-mcp-mello/akash-jsdk/QUICK_FIX_REFERENCE.md`
- Before/after comparison: `/home/andrew/akash-mcp-mello/akash-jsdk/BEFORE_AFTER_COMPARISON.md`
- Root cause analysis: `/home/andrew/akash-mcp-mello/akash-jsdk/ROOT_CAUSE_SUMMARY.md`

---

**Prepared By**: Engineer 1
**Date**: 2025-11-16
**Status**: Ready for execution
