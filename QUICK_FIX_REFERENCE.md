# Quick Fix Reference - Protobuf Encoding Bugs

**FAST REFERENCE FOR ENGINEERS 2 & 3**

---

## Three Bugs, Three Files, ~50 Lines

### BUG #1: Missing `id` Field
**File**: `/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/official-types.ts`
**Line**: 75

**CHANGE THIS**:
```typescript
export interface ResourceUnits {
  cpu: CPU
```

**TO THIS**:
```typescript
export interface ResourceUnits {
  id?: number              // ADD THIS LINE
  cpu: CPU
```

---

### BUG #2: Wrong Field Name
**File**: `/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/official-types.ts`
**Line**: 70

**CHANGE THIS**:
```typescript
export interface Resource {
  resources: ResourceUnits
```

**TO THIS**:
```typescript
export interface Resource {
  resource: ResourceUnits   // resources → resource (plural to singular)
```

---

### BUG #3: Wrong Field Numbers
**File**: `/home/andrew/akash-mcp-mello/akash-jsdk/packages/protobuf/src/message-classes.ts`
**Lines**: 488-502

**DELETE THESE 15 LINES**:
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

**REPLACE WITH THESE 33 LINES**:
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

## Implementation Order

1. **First**: Bug #1 (add `id` field)
2. **Second**: Bug #3 (fix encoder mappings)
3. **Last**: Bug #2 (rename field - BREAKING CHANGE)

---

## After Fixes: Update Usage Sites

Search for all uses of the old field name:
```bash
grep -r "resources:" packages/ --include="*.ts" --include="*.tsx"
```

Change each instance from:
```typescript
resources: ResourceUnits
```

To:
```typescript
resource: ResourceUnits
```

---

## Validate

```bash
pnpm run build
pnpm test
```

Both should succeed.

---

**See Full Details**: `/home/andrew/akash-mcp-mello/akash-jsdk/ENGINEER_1_FIX_SPECIFICATION.md`
