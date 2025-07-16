# 🚀 Akash SDK User Guide

**Deploy apps to decentralized cloud in minutes, not hours.**

## Quick Start (2 minutes)

### 1. Install
```bash
npm install cryptoandcoffee/akash-jsdk-core
```

### 2. Connect & Deploy
```javascript
import { AkashSDK } from 'cryptoandcoffee/akash-jsdk-core'

const sdk = new AkashSDK({
  rpcEndpoint: 'https://rpc.akashedge.com:443',
  chainId: 'akashnet-2'
})

await sdk.connect()

// Deploy your app
const deploymentId = await sdk.deployments.create({
  image: 'nginx:latest',
  resources: {
    cpu: { units: '100m' },
    memory: { size: '128Mi' },
    storage: { size: '1Gi' }
  }
})

console.log('Deployed!', deploymentId)
```

## Common Use Cases

### Web App Deployment
```javascript
// Use SDL (Service Definition Language) for complex apps
const sdl = sdk.sdl.generateTemplate('web-app')
const manifest = sdk.sdl.convertToManifest(sdl)
const deploymentId = await sdk.deployments.create(manifest)
```

### Check Your Deployments
```javascript
const deployments = await sdk.deployments.list('your-akash-address')
deployments.forEach(d => console.log(`${d.id.dseq}: ${d.state}`))
```

### Connect Your Wallet
```javascript
import { KeplrWallet } from 'cryptoandcoffee/akash-jsdk-core'

await sdk.wallet.connectWallet(new KeplrWallet())
const accounts = await sdk.wallet.getAccounts()
```

## React Apps

### 1. Install React Package
```bash
npm install cryptoandcoffee/akash-jsdk-react
```

### 2. Wrap Your App
```jsx
import { AkashProvider } from 'cryptoandcoffee/akash-jsdk-react'

function App() {
  return (
    <AkashProvider config={{ rpcEndpoint: 'https://rpc.akashedge.com:443' }}>
      <MyDeploymentApp />
    </AkashProvider>
  )
}
```

### 3. Use Hooks
```jsx
import { useDeployments } from 'cryptoandcoffee/akash-jsdk-react'

function MyDeploymentApp() {
  const { deployments, createDeployment, loading } = useDeployments('akash1...')
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      <button onClick={() => createDeployment({ image: 'nginx' })}>
        Deploy App
      </button>
      {deployments.map(d => <div key={d.id.dseq}>{d.state}</div>)}
    </div>
  )
}
```

## CLI Usage

### 1. Install CLI
```bash
npm install -g cryptoandcoffee/akash-jsdk-cli
```

### 2. Initialize Project
```bash
akash-cli init my-app
cd my-app
npm install
```

### 3. Deploy
```bash
akash-cli deploy --owner akash1your-address
akash-cli status --owner akash1your-address
```

## Common Patterns

### Environment-Specific Config
```javascript
const config = {
  rpcEndpoint: process.env.NODE_ENV === 'production' 
    ? 'https://rpc.akashedge.com:443'
    : 'https://rpc.sandbox-01.aksh.pw:443',
  chainId: process.env.NODE_ENV === 'production' 
    ? 'akashnet-2' 
    : 'sandbox-01'
}
```

### Error Handling
```javascript
try {
  await sdk.deployments.create(config)
} catch (error) {
  if (error.code === 'INSUFFICIENT_FUNDS') {
    console.log('Add more AKT tokens to your wallet')
  } else {
    console.error('Deployment failed:', error.message)
  }
}
```

### Cost Estimation
```javascript
const resources = sdk.sdl.calculateResources(sdl)
console.log(`Estimated cost: ${resources.estimatedCost} uAKT/day`)
```

## Troubleshooting

**Connection Issues:**
```javascript
// Check network connectivity
const providers = await sdk.providers.list()
console.log(`Found ${providers.length} providers`)
```

**Wallet Issues:**
```javascript
// Verify wallet connection
const isConnected = sdk.wallet.isWalletConnected()
if (!isConnected) {
  await sdk.wallet.connectWallet(new KeplrWallet())
}
```

**Deployment Issues:**
```javascript
// Validate SDL before deploying
const validation = sdk.sdl.validateSDL(sdl)
if (!validation.valid) {
  console.error('SDL errors:', validation.errors)
}
```

## Tips

- **Start Simple**: Use templates (`sdk.sdl.generateTemplate()`)
- **Test First**: Use sandbox network for testing
- **Monitor**: Check deployment status regularly
- **Optimize**: Use cost estimation before deploying

## Next Steps

1. Check [examples/](examples/) for complete apps
2. Read [ADMIN-GUIDE.md](ADMIN-GUIDE.md) for provider setup
3. Join [Akash Community](https://discord.akash.network) for support

**Happy Deploying! 🚀**