# DEPLOYMENT CREATION FIX VERIFICATION GUIDE
## Step-by-Step Instructions for Testing v3.10.6

**Version**: v3.10.6
**Date**: 2025-11-16
**Purpose**: Verify that deployment creation now works after fixing the protobuf encoding bug

---

## QUICK START: Is Your Problem Fixed?

If you were experiencing deployment creation failures with v3.10.0-v3.10.5, follow these steps to verify the fix:

### 1. Check Your Current Version

```bash
npm list @cryptoandcoffee/akash-jsdk-core
```

**Expected output:**
```
@cryptoandcoffee/akash-jsdk-core@3.10.6
```

If you see a different version (like 3.10.0-3.10.5), **upgrade first**:

```bash
npm install @cryptoandcoffee/akash-jsdk-core@3.10.6
```

### 2. Test Deployment Creation

#### Option A: Using the CLI

```bash
# Create a deployment using the CLI
npx @cryptoandcoffee/akash-jsdk-cli deploy my-deployment.yaml \
  --wallet-mnemonic "your mnemonic here" \
  --chain-id testnet-02 \
  --rpc-endpoint https://rpc.testnet.akash.network:443

# ✅ Expected: "Deployment created successfully"
# ❌ Before fix: "Failed to decode transaction" or "Unable to resolve type URL"
```

#### Option B: Using the SDK Programmatically

```typescript
import { AkashClient } from '@cryptoandcoffee/akash-jsdk-core'

const client = new AkashClient({
  rpcEndpoint: 'https://rpc.testnet.akash.network:443',
  chainId: 'testnet-02'
})

// Connect with your wallet
await client.connect({
  mnemonic: 'your twelve word mnemonic phrase here',
  prefix: 'akash'
})

// Create a deployment
try {
  const result = await client.deployments.create({
    sdl: yourSDLContent,
    deposit: {
      denom: 'uakt',
      amount: '5000000'  // 5 AKT deposit
    }
  })

  console.log('✅ SUCCESS! Deployment created:', result.deploymentId)
  console.log('Transaction hash:', result.transactionHash)
} catch (error) {
  console.error('❌ FAILED:', error.message)
  // If you see this, please report the issue
}
```

---

## DETAILED VERIFICATION STEPS

### Step 1: Update to v3.10.6

#### For npm Users:
```bash
npm install @cryptoandcoffee/akash-jsdk-core@3.10.6
```

#### For pnpm Users:
```bash
pnpm add @cryptoandcoffee/akash-jsdk-core@3.10.6
```

#### For yarn Users:
```bash
yarn add @cryptoandcoffee/akash-jsdk-core@3.10.6
```

#### Verify Installation:
```bash
npm list @cryptoandcoffee/akash-jsdk-core
# Should show: @cryptoandcoffee/akash-jsdk-core@3.10.6

# If using pnpm:
pnpm list @cryptoandcoffee/akash-jsdk-core

# If using yarn:
yarn list --pattern @cryptoandcoffee/akash-jsdk-core
```

---

### Step 2: Prepare Test Environment

#### 2.1 Get Testnet Tokens

Before testing deployment creation, you need testnet AKT tokens:

**Option 1: Use Akash Faucet**
```
Visit: https://faucet.testnet.akash.network/
Enter your testnet address
Request tokens
```

**Option 2: Ask in Discord**
```
Join: https://discord.akash.network
Channel: #testnet
Ask: "Can someone send me testnet AKT to test deployments?"
```

#### 2.2 Prepare Your Wallet

```typescript
import { AkashClient } from '@cryptoandcoffee/akash-jsdk-core'

// Generate a new testnet wallet (save the mnemonic!)
const wallet = await AkashClient.generateWallet('akash')
console.log('Address:', wallet.address)
console.log('Mnemonic:', wallet.mnemonic)
// Save the mnemonic securely - you'll need it to access funds

// OR use existing mnemonic
const existingWallet = await AkashClient.recoverWallet(
  'your twelve word mnemonic phrase here',
  'akash'
)
```

#### 2.3 Check Your Balance

```typescript
const client = new AkashClient({
  rpcEndpoint: 'https://rpc.testnet.akash.network:443',
  chainId: 'testnet-02'
})

await client.connect({
  mnemonic: 'your mnemonic here',
  prefix: 'akash'
})

const balance = await client.wallet.getBalance()
console.log('Balance:', balance)
// Minimum needed: ~5 AKT for deposit + gas
```

---

### Step 3: Create a Test SDL File

Save this as `test-deployment.yaml`:

```yaml
---
version: "2.0"

services:
  web:
    image: nginx:latest
    expose:
      - port: 80
        as: 80
        to:
          - global: true

profiles:
  compute:
    web:
      resources:
        cpu:
          units: 0.5
        memory:
          size: 512Mi
        storage:
          size: 1Gi
  placement:
    westcoast:
      attributes:
        host: akash
      signedBy:
        anyOf:
          - akash1365yvmc4s7awdyj3n2sav7xfx76adc6dnmlx63
      pricing:
        web:
          denom: uakt
          amount: 100

deployment:
  web:
    westcoast:
      profile: web
      count: 1
```

---

### Step 4: Test Deployment Creation

#### Method 1: Using JavaScript/TypeScript

```typescript
import { AkashClient } from '@cryptoandcoffee/akash-jsdk-core'
import fs from 'fs'

async function testDeploymentCreation() {
  // 1. Setup client
  const client = new AkashClient({
    rpcEndpoint: 'https://rpc.testnet.akash.network:443',
    chainId: 'testnet-02',
    logger: {
      level: 'debug'  // Enable debug logging to see what's happening
    }
  })

  // 2. Connect wallet
  console.log('Connecting wallet...')
  await client.connect({
    mnemonic: 'your twelve word mnemonic phrase here',
    prefix: 'akash'
  })
  console.log('Wallet connected:', client.wallet.address)

  // 3. Load SDL
  console.log('Loading SDL...')
  const sdlContent = fs.readFileSync('test-deployment.yaml', 'utf-8')

  // 4. Create deployment
  console.log('Creating deployment...')
  try {
    const result = await client.deployments.create({
      sdl: sdlContent,
      deposit: {
        denom: 'uakt',
        amount: '5000000'  // 5 AKT
      }
    })

    console.log('\n✅ SUCCESS! Deployment created!')
    console.log('Deployment ID:', result.deploymentId)
    console.log('Transaction hash:', result.transactionHash)
    console.log('Block height:', result.height)

    return result
  } catch (error) {
    console.error('\n❌ FAILED!')
    console.error('Error:', error.message)
    console.error('Full error:', error)
    throw error
  }
}

// Run the test
testDeploymentCreation()
  .then(() => {
    console.log('\n🎉 Verification complete - deployment creation works!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Verification failed - please report this issue')
    process.exit(1)
  })
```

#### Method 2: Using CLI

```bash
# Set environment variables
export AKASH_MNEMONIC="your twelve word mnemonic phrase here"
export AKASH_CHAIN_ID="testnet-02"
export AKASH_RPC_ENDPOINT="https://rpc.testnet.akash.network:443"

# Create deployment
npx @cryptoandcoffee/akash-jsdk-cli deploy test-deployment.yaml \
  --wallet-mnemonic "$AKASH_MNEMONIC" \
  --chain-id "$AKASH_CHAIN_ID" \
  --rpc-endpoint "$AKASH_RPC_ENDPOINT"
```

---

### Step 5: Verify Success

#### What Success Looks Like:

**Console Output:**
```
Connecting wallet...
Wallet connected: akash1abc...xyz
Loading SDL...
Creating deployment...
Broadcasting transaction...
Transaction confirmed!

✅ SUCCESS! Deployment created!
Deployment ID: {
  owner: 'akash1abc...xyz',
  dseq: '123456'
}
Transaction hash: ABC123DEF456...
Block height: 7891234
```

**On Akash Explorer:**
```
Visit: https://testnet.akash.network/transactions/[YOUR_TX_HASH]
Status: ✅ Success
Message: MsgCreateDeployment
```

#### What Failure Looks Like (if bug still exists):

**Console Output:**
```
Creating deployment...
Broadcasting transaction...

❌ FAILED!
Error: failed to execute message; message index: 0:
  unable to resolve type URL /akash.deployment.v1beta3.MsgCreateDeployment:
  tx parse error
```

**On Akash Explorer:**
```
Status: ❌ Failed
Error: "failed to decode transaction" or "unable to resolve type URL"
```

---

## TROUBLESHOOTING

### Issue 1: "Insufficient funds" Error

**Problem:**
```
Error: insufficient funds: insufficient account funds
```

**Solution:**
1. Check your balance:
```typescript
const balance = await client.wallet.getBalance()
console.log('Balance:', balance)
```

2. Get more testnet tokens from faucet or Discord
3. Ensure you have at least 5 AKT + gas (recommend 10 AKT total)

---

### Issue 2: "Account does not exist" Error

**Problem:**
```
Error: account akash1abc...xyz does not exist
```

**Solution:**
1. Your address hasn't received any tokens yet
2. Get testnet tokens from faucet first
3. Wait for transaction to confirm
4. Retry deployment creation

---

### Issue 3: "Failed to decode transaction" Error (Old Bug)

**Problem:**
```
Error: failed to decode transaction: unable to resolve type URL
```

**This means the fix isn't working!**

**Checklist:**
1. ✓ Verify you're on v3.10.6:
```bash
npm list @cryptoandcoffee/akash-jsdk-core
```

2. ✓ Clear node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

3. ✓ Check for version conflicts:
```bash
npm ls @cryptoandcoffee/akash-jsdk-core
# Should only show ONE version: 3.10.6
```

4. ✓ If still failing, **please report the issue** with:
   - Full error message
   - SDK version (`npm list`)
   - Node.js version (`node --version`)
   - Platform (OS)
   - Minimal code to reproduce

---

### Issue 4: "Invalid SDL" Error

**Problem:**
```
Error: Invalid SDL: missing required field 'version'
```

**Solution:**
1. Verify your SDL file is valid YAML
2. Ensure it has all required sections:
   - `version: "2.0"`
   - `services`
   - `profiles.compute`
   - `profiles.placement`
   - `deployment`

3. Use the example SDL from Step 3 as a starting point

---

### Issue 5: Connection Timeouts

**Problem:**
```
Error: timeout of 60000ms exceeded
```

**Solution:**
1. Check RPC endpoint is reachable:
```bash
curl https://rpc.testnet.akash.network:443/status
```

2. Try alternative RPC endpoints:
```typescript
const client = new AkashClient({
  rpcEndpoint: 'https://rpc.testnet.akash.network:443',
  // Or try: 'https://rpc-testnet.akash.forbole.com:443'
  chainId: 'testnet-02'
})
```

3. Increase timeout:
```typescript
const client = new AkashClient({
  rpcEndpoint: '...',
  chainId: '...',
  timeout: 120000  // 2 minutes
})
```

---

## VERIFICATION CHECKLIST

After testing, confirm:

- [ ] ✓ SDK version is 3.10.6
- [ ] ✓ Deployment creation succeeds (no "decode transaction" error)
- [ ] ✓ Transaction appears on Akash explorer with "Success" status
- [ ] ✓ Deployment ID is returned correctly
- [ ] ✓ Transaction hash is returned
- [ ] ✓ No protobuf encoding errors in logs

If all items are checked, **the fix is verified!**

---

## UNDERSTANDING ERROR MESSAGES

### Before Fix (v3.10.0-v3.10.5)

**Error Messages You Would See:**
```
"failed to execute message; message index: 0: unable to resolve type URL /akash.deployment.v1beta3.MsgCreateDeployment: tx parse error"

"failed to decode transaction"

"proto: wrong wireType = 2 for field Id"

"unexpected wire type for field 1"
```

**What These Mean:**
The SDK was creating invalid protobuf binary data. The blockchain couldn't parse it because:
- Field numbers were wrong
- Wire types didn't match expected types
- Required fields were missing

### After Fix (v3.10.6)

**Success Messages You Should See:**
```
"Transaction confirmed!"
"Deployment created successfully"
"MsgCreateDeployment executed"
```

**What This Means:**
The SDK now creates valid protobuf binary data that the blockchain can parse and process correctly.

---

## COMPARING BINARY OUTPUTS (Advanced)

For developers who want to verify the fix at the binary level:

### Before Fix (Invalid Binary):
```hex
0x0a 0x0a ...  ← Field 1: Wrong type (message instead of varint)
0x12 0x08 ...  ← Field 2: Wrong data
0x1a 0x0d ...  ← Field 3: Wrong data
Result: Blockchain rejects with "unexpected wire type"
```

### After Fix (Valid Binary):
```hex
0x08 0x00      ← Field 1: Correct type (varint for id)
0x12 0x0a ...  ← Field 2: Correct type (message for cpu)
0x1a 0x08 ...  ← Field 3: Correct type (message for memory)
Result: Blockchain accepts and processes
```

**How to Inspect Binary Output:**
```typescript
import { MsgCreateDeployment } from '@cryptoandcoffee/akash-jsdk-protobuf'

const msg = MsgCreateDeployment.fromJson({...})
const binary = msg.toBinary()

console.log('Binary length:', binary.length)
console.log('First 20 bytes:', Array.from(binary.slice(0, 20)))
console.log('Hex:', Buffer.from(binary.slice(0, 20)).toString('hex'))
```

---

## NEXT STEPS AFTER VERIFICATION

### If Verification Succeeds:

1. **Update your production code** to use v3.10.6
2. **Test on mainnet** (use small amounts first!)
3. **Monitor your deployments** to ensure everything works
4. **Report success** - let us know the fix worked for you!

### If Verification Fails:

1. **Double-check you're on v3.10.6**:
```bash
npm list @cryptoandcoffee/akash-jsdk-core
```

2. **Clear cache and reinstall**:
```bash
rm -rf node_modules package-lock.json
npm install
```

3. **Try on a fresh environment**:
```bash
mkdir test-akash-fix
cd test-akash-fix
npm init -y
npm install @cryptoandcoffee/akash-jsdk-core@3.10.6
```

4. **Report the issue** with full details:
   - Platform (OS, Node.js version)
   - Full error message
   - Code to reproduce
   - Screenshot of `npm list` output

---

## GETTING HELP

### Community Support:

**Discord**: https://discord.akash.network
- Channel: #developers
- Ask questions about SDK issues
- Get help from maintainers and community

**GitHub Issues**: https://github.com/cryptoandcoffee/akash-jsdk/issues
- Report bugs
- Request features
- Search existing issues

**Documentation**: https://github.com/cryptoandcoffee/akash-jsdk
- SDK documentation
- API reference
- Examples and tutorials

### Reporting Issues:

When reporting issues, include:

1. **SDK Version**:
```bash
npm list @cryptoandcoffee/akash-jsdk-core
```

2. **Environment**:
```bash
node --version
npm --version
# OS and platform
```

3. **Error Message** (full output, not truncated)

4. **Minimal Reproduction**:
```typescript
// Smallest possible code that reproduces the issue
```

5. **Expected vs Actual Behavior**

---

## FREQUENTLY ASKED QUESTIONS

### Q: Do I need to re-create existing deployments?
**A:** No. Existing deployments are unaffected. Only **new** deployment creation was broken in v3.10.0-v3.10.5.

### Q: Can I use v3.10.6 on mainnet?
**A:** Yes, after testing on testnet to verify your integration works correctly.

### Q: Will upgrading break my existing code?
**A:** No. The public API is unchanged. Your existing code will work without modifications.

### Q: What if I can't upgrade immediately?
**A:** You can use v3.9.x which didn't have this bug, or upgrade when ready.

### Q: How do I know if I was affected by this bug?
**A:** If you were using v3.10.0-v3.10.5 and seeing "failed to decode transaction" or "unable to resolve type URL" errors when creating deployments, you were affected.

### Q: Does this fix affect lease management or other operations?
**A:** No. Only deployment creation was affected. Query operations, lease management, and wallet operations worked fine in all versions.

---

## SUMMARY

**The Bug**: Deployment creation failed 100% of the time in v3.10.0-v3.10.5
**The Fix**: v3.10.6 corrects protobuf encoding to match blockchain expectations
**The Verification**: Follow this guide to test that deployment creation now works

**Expected Result**: Deployment creation succeeds, transaction is accepted by blockchain

**If Problems**: Check troubleshooting section, verify SDK version, report issues with full details

---

**Document Version**: 1.0
**Last Updated**: 2025-11-16
**Maintained By**: Akash JSDK Maintainers
**Related Docs**:
- Technical Analysis: `/PROTOBUF_FIX_SOLUTION_v3.10.6.md`
- Root Cause: `/ROOT_CAUSE_SUMMARY.md`
