# Staking Module Usage Examples

The Staking Module provides comprehensive functionality for interacting with the Cosmos SDK staking module on Akash Network.

## Basic Usage

```typescript
import { AkashSDK } from '@cryptoandcoffee/akash-jsdk-core'

// Initialize SDK
const sdk = new AkashSDK({
  rpcEndpoint: 'https://rpc.akashedge.com:443',
  chainId: 'akashnet-2'
})

await sdk.connect()

// Access the staking manager
const staking = sdk.staking
```

## Delegation Operations

### Delegate Tokens

```typescript
const validatorAddress = 'akashvaloper1...'
const amount = { denom: 'uakt', amount: '1000000' } // 1 AKT

const result = await staking.delegate(validatorAddress, amount)
console.log('Delegation transaction:', result.transactionHash)
console.log('Block height:', result.height)
```

### Undelegate Tokens

```typescript
const result = await staking.undelegate(validatorAddress, amount)
console.log('Unbonding completion time:', result.unbondingTime)
// Note: Unbonding period is 21 days on Akash Network
```

### Redelegate to Another Validator

```typescript
const srcValidator = 'akashvaloper1...'
const dstValidator = 'akashvaloper2...'
const amount = { denom: 'uakt', amount: '500000' }

const result = await staking.redelegate(srcValidator, dstValidator, amount)
console.log('Redelegation successful:', result.transactionHash)
```

## Validator Queries

### Get All Validators

```typescript
const validators = await staking.getValidators()
console.log(`Total validators: ${validators.length}`)

validators.forEach(v => {
  console.log(`${v.description.moniker}: ${v.tokens} tokens`)
  console.log(`Commission: ${v.commission.commissionRates.rate}`)
  console.log(`Status: ${v.status}`)
})
```

### Filter Validators by Status

```typescript
// Get only bonded (active) validators
const bondedValidators = await staking.getValidators('BOND_STATUS_BONDED')

// Get unbonding validators
const unbondingValidators = await staking.getValidators('BOND_STATUS_UNBONDING')

// Get unbonded validators
const unbondedValidators = await staking.getValidators('BOND_STATUS_UNBONDED')
```

### Get Specific Validator Details

```typescript
const validator = await staking.getValidator(validatorAddress)

console.log('Validator:', validator.description.moniker)
console.log('Website:', validator.description.website)
console.log('Total Tokens:', validator.tokens)
console.log('Delegator Shares:', validator.delegatorShares)
console.log('Jailed:', validator.jailed)
```

## Delegation Queries

### Get Your Delegations

```typescript
const delegatorAddress = 'akash1...'
const delegations = await staking.getDelegations(delegatorAddress)

delegations.forEach(d => {
  console.log(`Validator: ${d.validatorAddress}`)
  console.log(`Delegated: ${d.balance.amount} ${d.balance.denom}`)
  console.log(`Shares: ${d.shares}`)
})
```

### Get Unbonding Delegations

```typescript
const unbonding = await staking.getUnbondingDelegations(delegatorAddress)

unbonding.forEach(u => {
  u.entries.forEach(entry => {
    console.log(`Amount: ${entry.balance} uakt`)
    console.log(`Completion Time: ${entry.completionTime}`)
  })
})
```

### Get Redelegations

```typescript
const redelegations = await staking.getRedelegations(delegatorAddress)

redelegations.forEach(r => {
  console.log(`From: ${r.validatorSrcAddress}`)
  console.log(`To: ${r.validatorDstAddress}`)
  r.entries.forEach(entry => {
    console.log(`Shares: ${entry.sharesDst}`)
    console.log(`Completion: ${entry.completionTime}`)
  })
})
```

## Rewards

### Get Staking Rewards

```typescript
const rewards = await staking.getRewards(delegatorAddress)

console.log('Rewards by validator:')
rewards.rewards.forEach(r => {
  console.log(`${r.validatorAddress}: ${r.reward[0].amount} ${r.reward[0].denom}`)
})

console.log(`Total rewards: ${rewards.total[0].amount} ${rewards.total[0].denom}`)
```

### Withdraw Rewards from a Validator

```typescript
const result = await staking.withdrawRewards(validatorAddress)
console.log('Rewards withdrawn:', result.transactionHash)
```

### Withdraw All Rewards

```typescript
const result = await staking.withdrawAllRewards(delegatorAddress)
console.log('Withdrew from all validators:', result.rawLog)
console.log('Gas used:', result.gasUsed)
```

## Staking Information

### Get Staking Pool

```typescript
const pool = await staking.getPool()
console.log('Bonded tokens:', pool.bondedTokens)
console.log('Not bonded tokens:', pool.notBondedTokens)
```

### Get Staking Parameters

```typescript
const params = await staking.getParams()
console.log('Unbonding time:', params.unbondingTime)
console.log('Max validators:', params.maxValidators)
console.log('Bond denom:', params.bondDenom)
console.log('Min commission rate:', params.minCommissionRate)
```

## Complete Example: Stake and Manage Delegations

```typescript
import { AkashSDK } from '@cryptoandcoffee/akash-jsdk-core'

async function manageStaking() {
  const sdk = new AkashSDK({
    rpcEndpoint: 'https://rpc.akashedge.com:443',
    chainId: 'akashnet-2'
  })

  await sdk.connect()

  const delegatorAddress = 'akash1...'
  
  // 1. Get list of active validators
  const validators = await sdk.staking.getValidators('BOND_STATUS_BONDED')
  console.log(`Found ${validators.length} active validators`)
  
  // 2. Choose validator with lowest commission
  const bestValidator = validators.reduce((best, current) => {
    const bestRate = parseFloat(best.commission.commissionRates.rate)
    const currentRate = parseFloat(current.commission.commissionRates.rate)
    return currentRate < bestRate ? current : best
  })
  
  console.log(`Best validator: ${bestValidator.description.moniker}`)
  console.log(`Commission: ${bestValidator.commission.commissionRates.rate}`)
  
  // 3. Delegate tokens
  const amount = { denom: 'uakt', amount: '1000000' }
  const delegateResult = await sdk.staking.delegate(
    bestValidator.operatorAddress,
    amount
  )
  console.log('Delegated successfully:', delegateResult.transactionHash)
  
  // 4. Check your delegations
  const delegations = await sdk.staking.getDelegations(delegatorAddress)
  console.log(`You have ${delegations.length} delegations`)
  
  // 5. Check your rewards
  const rewards = await sdk.staking.getRewards(delegatorAddress)
  if (parseInt(rewards.total[0].amount) > 0) {
    console.log(`Total rewards: ${rewards.total[0].amount} ${rewards.total[0].denom}`)
    
    // 6. Withdraw all rewards
    const withdrawResult = await sdk.staking.withdrawAllRewards(delegatorAddress)
    console.log('Rewards withdrawn:', withdrawResult.transactionHash)
  }
  
  await sdk.disconnect()
}

manageStaking().catch(console.error)
```

## TypeScript Types

All methods return properly typed responses:

```typescript
import type {
  Validator,
  Delegation,
  Rewards,
  StakingResult,
  UnbondingDelegation,
  Redelegation
} from '@cryptoandcoffee/akash-jsdk-core'
```

## Error Handling

```typescript
import { NetworkError, ValidationError } from '@cryptoandcoffee/akash-jsdk-core'

try {
  await staking.delegate(validatorAddress, amount)
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid parameters:', error.message)
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message)
  }
}
```

## Notes

- **Unbonding Period**: The unbonding period on Akash Network is 21 days
- **Gas Fees**: All transactions require gas fees paid in uakt
- **Minimum Amounts**: Check validator minimum self-delegation requirements
- **Commission**: Validators charge commission on staking rewards
- **Slashing**: Validators can be slashed for downtime or double-signing

## Related Resources

- [Akash Network Documentation](https://docs.akash.network/)
- [Cosmos SDK Staking Module](https://docs.cosmos.network/main/modules/staking)
- [Akash Network Validators](https://stats.akash.network/validators)
