# Batch Operations Example

The BatchManager allows you to bundle multiple blockchain operations into a single transaction, reducing transaction costs and improving efficiency.

## Basic Usage

```typescript
import { AkashSDK } from '@cryptoandcoffee/akash-jsdk-core'

// Initialize SDK
const sdk = new AkashSDK({
  rpcEndpoint: 'https://rpc.akashedge.com:443',
  chainId: 'akashnet-2',
  gasPrice: '0.025uakt'
})

await sdk.connect()

// Set wallet (required for batch operations)
sdk.batch.setWallet({ address: 'akash1...' })

// Create a new batch
const batch = await sdk.batch.createBatch()

// Add multiple operations to the batch
batch
  .addDeployment('version: "2.0"\nservices:\n  web:\n    image: nginx')
  .addLease('123', 'akash1provider...')
  .addCertificate('-----BEGIN CERTIFICATE-----\n...')

// Validate the batch before executing
const validation = sdk.batch.validateBatch(batch.getOperations())
if (!validation.valid) {
  console.error('Batch validation failed:', validation.errors)
  return
}

// Simulate to estimate gas
const simulation = await sdk.batch.simulateBatch(batch.getOperations())
console.log('Estimated gas:', simulation.gasEstimate)
console.log('Estimated fee:', simulation.fee)

// Execute the batch
const result = await batch.execute()
console.log('Transaction hash:', result.transactionHash)
console.log('Success:', result.success)

// Get transaction details
const details = await sdk.batch.getTransactionDetails(result.transactionHash)
console.log('Block height:', details?.height)
```

## Advanced Configuration

```typescript
// Configure gas settings
sdk.batch.setGasPrice('0.05uakt')
sdk.batch.setGasAdjustment(2.0)

// Add custom messages
import { EncodeObject } from '@cosmjs/proto-signing'

const customMsg: EncodeObject = {
  typeUrl: '/custom.module.v1.MsgCustom',
  value: { data: 'custom-data' }
}

batch.addCustomMessage(customMsg)
```

## Error Handling

```typescript
try {
  const batch = await sdk.batch.createBatch()

  batch
    .addDeployment(sdlContent)
    .addLease(dseq, provider)

  const result = await batch.execute()

  if (!result.success) {
    console.error('Batch execution failed')
  }
} catch (error) {
  if (error.name === 'ValidationError') {
    console.error('Validation error:', error.message)
  } else if (error.name === 'NetworkError') {
    console.error('Network error:', error.message)
  }
}
```

## Builder Pattern

The BatchBuilder uses a fluent interface for easy batch construction:

```typescript
const result = await (await sdk.batch.createBatch())
  .addDeployment(sdl1)
  .addDeployment(sdl2)
  .addLease('123', 'provider1')
  .addLease('124', 'provider2')
  .addCertificate(cert1)
  .execute()
```

## Coverage and Testing

The BatchManager module has:
- 98.3% statement coverage
- 90% branch coverage
- 100% function coverage
- 55 comprehensive unit tests

All tests can be run with: `npm test -- batch.test.ts`
