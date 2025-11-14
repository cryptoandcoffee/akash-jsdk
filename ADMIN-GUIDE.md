# 🏢 Akash SDK Admin Guide

**Complete provider operations and network management.**

## Provider Setup & Management

### Register as Provider
```javascript
import { AkashSDK } from '@cryptoandcoffee/akash-jsdk-core'

const sdk = new AkashSDK({
  rpcEndpoint: 'https://rpc.akashedge.com:443',
  chainId: 'akashnet-2'
})

await sdk.connect()

// Register your provider
await sdk.providerManager.createProvider({
  owner: 'akash1your-provider-address',
  hostUri: 'https://your-provider.com',
  attributes: [
    { key: 'region', value: 'us-west' },
    { key: 'tier', value: 'datacenter' },
    { key: 'uptime', value: '99.9' }
  ],
  info: {
    email: 'admin@your-provider.com',
    website: 'https://your-provider.com'
  }
})
```

### Bid Management
```javascript
// Monitor orders and place bids
const orders = await sdk.market.listOrders({ state: 'OPEN' })

for (const order of orders) {
  const bid = await sdk.market.createBid({
    orderId: order.orderId,
    provider: 'akash1your-provider',
    price: { denom: 'uakt', amount: '100' },
    deposit: { denom: 'uakt', amount: '5000' }
  })
  console.log(`Bid placed: ${bid}`)
}
```

### Capacity Management
```javascript
// Monitor and update capacity
const capacity = await sdk.providerManager.getProviderCapacity('akash1your-provider')
console.log('Available resources:', capacity.available)

// Update pricing
await sdk.providerManager.updateResourcePricing('akash1your-provider', {
  cpu: { denom: 'uakt', amount: '50' },      // per CPU unit
  memory: { denom: 'uakt', amount: '10' },   // per MB
  storage: { denom: 'uakt', amount: '5' }    // per GB
})
```

### Manifest Deployment
```javascript
// Handle won leases
const leases = await sdk.market.listLeases({
  provider: 'akash1your-provider',
  state: 'ACTIVE'
})

for (const lease of leases) {
  const manifest = {
    // Kubernetes deployment spec
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    spec: { /* ... */ }
  }
  
  await sdk.providerManager.deployManifest(lease.leaseId.dseq, manifest)
}
```

## Network Administration

### Certificate Management
```javascript
// Generate provider certificates
const keyPair = await sdk.certificates.generateKeyPair()

const certId = await sdk.certificates.create({
  owner: 'akash1your-provider',
  cert: keyPair.cert,
  pubkey: keyPair.pubkey
})

console.log('Certificate created:', certId)
```

### Audit Operations
```javascript
// Submit provider audit
await sdk.audit.submitAudit({
  owner: 'akash1provider-to-audit',
  auditor: 'akash1your-auditor-address',
  attributes: [
    { key: 'security_scan', value: 'passed' },
    { key: 'uptime_verified', value: 'true' },
    { key: 'compliance', value: 'SOC2' }
  ]
})

// Get audit history
const audits = await sdk.audit.getProviderAudits('akash1provider')
```

### Governance Participation
```javascript
// Submit governance proposal
const proposalId = await sdk.governance.submitProposal({
  title: 'Network Upgrade Proposal',
  description: 'Upgrade network parameters for better performance',
  proposer: 'akash1your-address',
  initialDeposit: [{ denom: 'uakt', amount: '10000000' }] // 10 AKT
})

// Vote on proposals
await sdk.governance.vote({
  proposalId: '5',
  voter: 'akash1your-address',
  option: 'VOTE_OPTION_YES'
})
```

## Advanced Provider Operations

### Automated Bidding Strategy
```javascript
class AutoBidder {
  constructor(sdk, providerAddress) {
    this.sdk = sdk
    this.provider = providerAddress
    this.running = false
  }

  async start() {
    this.running = true
    
    while (this.running) {
      try {
        // Get available capacity
        const capacity = await this.sdk.providerManager.getProviderCapacity(this.provider)
        
        // Find profitable orders
        const orders = await this.sdk.market.listOrders({ state: 'OPEN' })
        
        for (const order of orders) {
          if (this.shouldBid(order, capacity)) {
            const price = this.calculatePrice(order)
            await this.sdk.market.createBid({
              orderId: order.orderId,
              provider: this.provider,
              price,
              deposit: { denom: 'uakt', amount: '5000' }
            })
          }
        }
        
        await this.sleep(30000) // Check every 30 seconds
      } catch (error) {
        console.error('Bidding error:', error)
      }
    }
  }

  shouldBid(order, capacity) {
    // Implement your bidding logic
    return capacity.available.cpu.units > order.spec.resources[0].resources.cpu.units
  }

  calculatePrice(order) {
    // Implement your pricing strategy
    return { denom: 'uakt', amount: '100' }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  stop() {
    this.running = false
  }
}

// Usage
const autoBidder = new AutoBidder(sdk, 'akash1your-provider')
autoBidder.start()
```

### Monitoring & Alerts
```javascript
// Provider health monitoring
class ProviderMonitor {
  constructor(sdk, providerAddress) {
    this.sdk = sdk
    this.provider = providerAddress
  }

  async checkHealth() {
    const status = await this.sdk.providerManager.getProviderStatus(this.provider)
    
    if (!status.online) {
      this.alertOffline()
    }
    
    if (status.activeDe > 50) {
      this.alertHighLoad()
    }
    
    const capacity = await this.sdk.providerManager.getProviderCapacity(this.provider)
    const utilizationCPU = (capacity.allocated.cpu.units / capacity.total.cpu.units) * 100
    
    if (utilizationCPU > 90) {
      this.alertCapacity('CPU', utilizationCPU)
    }
  }

  alertOffline() {
    console.error('🚨 Provider is OFFLINE!')
    // Send notification (email, Slack, etc.)
  }

  alertHighLoad() {
    console.warn('⚠️ High deployment load detected')
  }

  alertCapacity(resource, utilization) {
    console.warn(`⚠️ ${resource} utilization high: ${utilization}%`)
  }
}
```

### Escrow Management
```javascript
// Monitor escrow accounts for your deployments
const accounts = await sdk.escrow.listAccounts({
  owner: 'akash1your-provider'
})

for (const account of accounts) {
  const balance = await sdk.escrow.getBalance(account.id)
  
  if (parseFloat(balance.amount) < 1000000) { // Less than 1 AKT
    console.warn(`Low balance in account ${account.id.xid}: ${balance.amount} uAKT`)
  }
}
```

## Network Utilities

### Performance Analytics
```javascript
// Get network statistics
const marketStats = await sdk.market.getMarketStats()
console.log('Network Overview:', {
  totalOrders: marketStats.totalOrders,
  activeLeases: marketStats.activeLeases,
  averagePrice: marketStats.averagePrice
})

// Provider performance
const providers = await sdk.providers.list()
const topProviders = providers
  .sort((a, b) => b.attributes.find(attr => attr.key === 'uptime')?.value || 0)
  .slice(0, 10)

console.log('Top 10 Providers by Uptime:', topProviders)
```

### Bulk Operations
```javascript
// Bulk certificate management
const providerAddresses = ['akash1provider1', 'akash1provider2', /* ... */]

for (const provider of providerAddresses) {
  try {
    const keyPair = await sdk.certificates.generateKeyPair()
    await sdk.certificates.create({
      owner: provider,
      cert: keyPair.cert,
      pubkey: keyPair.pubkey
    })
    console.log(`✅ Certificate created for ${provider}`)
  } catch (error) {
    console.error(`❌ Failed to create certificate for ${provider}:`, error.message)
  }
}
```

## Best Practices

### 1. **Resource Planning**
```javascript
// Monitor resource trends
const deployments = await sdk.deployments.list('akash1your-provider')
const resourceUsage = deployments.reduce((total, deployment) => {
  // Calculate total resource usage
  return total
}, { cpu: 0, memory: 0, storage: 0 })
```

### 2. **Security**
```javascript
// Regular certificate rotation
setInterval(async () => {
  const certs = await sdk.certificates.list({ owner: 'akash1your-provider' })
  const oldCerts = certs.filter(cert => 
    Date.now() - cert.createdAt > 90 * 24 * 60 * 60 * 1000 // 90 days
  )
  
  for (const cert of oldCerts) {
    await sdk.certificates.revoke(cert.certificateId)
    // Generate new certificate
  }
}, 24 * 60 * 60 * 1000) // Daily check
```

### 3. **Cost Optimization**
```javascript
// Dynamic pricing based on demand
const orders = await sdk.market.listOrders()
const demandLevel = orders.length > 100 ? 'high' : orders.length > 50 ? 'medium' : 'low'

const pricing = {
  high: { cpu: '75', memory: '15', storage: '8' },
  medium: { cpu: '50', memory: '10', storage: '5' },
  low: { cpu: '25', memory: '5', storage: '3' }
}

await sdk.providerManager.updateResourcePricing('akash1your-provider', {
  cpu: { denom: 'uakt', amount: pricing[demandLevel].cpu },
  memory: { denom: 'uakt', amount: pricing[demandLevel].memory },
  storage: { denom: 'uakt', amount: pricing[demandLevel].storage }
})
```

## Troubleshooting

### Common Issues
- **Bid Rejections**: Check pricing competitiveness
- **Deployment Failures**: Verify manifest format and resources
- **Certificate Errors**: Ensure certificates are valid and not expired
- **Capacity Issues**: Monitor resource utilization

### Debug Mode
```javascript
// Enable detailed logging
const sdk = new AkashSDK({
  rpcEndpoint: 'https://rpc.akashedge.com:443',
  chainId: 'akashnet-2',
  debug: true // Enable debug logging
})
```

**Need Help?** Check [AI-GUIDE.md](AI-GUIDE.md) for AI-specific patterns or join the [Akash Discord](https://discord.akash.network).