# @cryptoandcoffee/akash-jsdk-react

React hooks and provider for seamless Akash Network integration in React applications.

## Installation

```bash
npm install @cryptoandcoffee/akash-jsdk-core @cryptoandcoffee/akash-jsdk-react
```

## Quick Start

### 1. Wrap Your App with AkashProvider

```tsx
import { AkashProvider } from '@cryptoandcoffee/akash-jsdk-react'

function App() {
  return (
    <AkashProvider
      config={{
        rpcEndpoint: 'https://rpc.akashedge.com:443',
        apiEndpoint: 'https://api.akashedge.com:443',
        chainId: 'akashnet-2',
        gasPrice: '0.025uakt'
      }}
      autoConnect
    >
      <Dashboard />
    </AkashProvider>
  )
}
```

### 2. Use Hooks in Your Components

```tsx
import { useDeployments, useLeases, useProviders } from '@cryptoandcoffee/akash-jsdk-react'

function Dashboard() {
  const { deployments, loading, createDeployment, closeDeployment } = useDeployments('akash1...')
  const { leases } = useLeases('akash1...')
  const { providers } = useProviders()

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h2>My Deployments ({deployments.length})</h2>
      {deployments.map(deployment => (
        <div key={deployment.id.dseq}>
          <span>Deployment {deployment.id.dseq}</span>
          <button onClick={() => closeDeployment(deployment.id.dseq)}>
            Close
          </button>
        </div>
      ))}
    </div>
  )
}
```

---

## Components

### AkashProvider

The root provider component that makes the Akash SDK available to all child components.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `config` | `AkashConfig` | Yes | SDK configuration object |
| `autoConnect` | `boolean` | No | Automatically connect on mount (default: false) |
| `children` | `React.ReactNode` | Yes | Child components |

**AkashConfig Type:**

```typescript
interface AkashConfig {
  rpcEndpoint: string      // Akash RPC endpoint URL
  apiEndpoint?: string     // Akash API endpoint URL
  chainId: string          // Chain ID (e.g., 'akashnet-2')
  gasPrice?: string        // Gas price (e.g., '0.025uakt')
}
```

**Example:**

```tsx
<AkashProvider
  config={{
    rpcEndpoint: 'https://rpc.akashedge.com:443',
    apiEndpoint: 'https://api.akashedge.com:443',
    chainId: 'akashnet-2',
    gasPrice: '0.025uakt'
  }}
  autoConnect={true}
>
  <App />
</AkashProvider>
```

**Context Value:**

The provider exposes the following values through the `useAkashContext` hook:

```typescript
interface AkashContextValue {
  sdk: AkashSDK | null           // SDK instance
  isConnected: boolean           // Connection status
  isConnecting: boolean          // Connection in progress
  error: Error | null            // Connection error
  connect: () => Promise<void>   // Manual connect function
  disconnect: () => Promise<void> // Manual disconnect function
}
```

---

## Hooks

### useDeployments

Hook for managing deployments.

**Signature:**

```typescript
function useDeployments(owner?: string): UseDeploymentsResult
```

**Parameters:**

- `owner` (optional): Owner address to filter deployments

**Returns:**

```typescript
interface UseDeploymentsResult {
  deployments: Deployment[]                              // List of deployments
  loading: boolean                                       // Loading state
  error: Error | null                                    // Error state
  refetch: () => Promise<void>                          // Refetch deployments
  createDeployment: (config: any) => Promise<DeploymentID>  // Create new deployment
  closeDeployment: (deploymentId: string) => Promise<void>  // Close deployment
}
```

**Example:**

```tsx
function DeploymentsPage() {
  const {
    deployments,
    loading,
    error,
    createDeployment,
    closeDeployment,
    refetch
  } = useDeployments('akash1...')

  const handleCreate = async () => {
    try {
      const config = {
        image: 'nginx:latest',
        resources: {
          cpu: { units: '100m' },
          memory: { size: '128Mi' },
          storage: { size: '1Gi' }
        }
      }
      const deploymentId = await createDeployment(config)
      console.log('Created deployment:', deploymentId)
    } catch (err) {
      console.error('Failed to create deployment:', err)
    }
  }

  const handleClose = async (dseq: string) => {
    try {
      await closeDeployment(dseq)
      console.log('Closed deployment:', dseq)
    } catch (err) {
      console.error('Failed to close deployment:', err)
    }
  }

  if (loading) return <div>Loading deployments...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <button onClick={handleCreate}>Create Deployment</button>
      <button onClick={refetch}>Refresh</button>

      {deployments.map(deployment => (
        <div key={deployment.id.dseq}>
          <h3>Deployment {deployment.id.dseq}</h3>
          <p>State: {deployment.state}</p>
          <p>Owner: {deployment.id.owner}</p>
          <button onClick={() => handleClose(deployment.id.dseq)}>
            Close
          </button>
        </div>
      ))}
    </div>
  )
}
```

---

### useLeases

Hook for querying leases.

**Signature:**

```typescript
function useLeases(owner?: string): UseLeasesResult
```

**Parameters:**

- `owner` (optional): Owner address to filter leases

**Returns:**

```typescript
interface UseLeasesResult {
  leases: Lease[]               // List of leases
  loading: boolean              // Loading state
  error: Error | null           // Error state
  refetch: () => Promise<void>  // Refetch leases
}
```

**Example:**

```tsx
function LeasesPage() {
  const { leases, loading, error, refetch } = useLeases('akash1...')

  if (loading) return <div>Loading leases...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h2>Active Leases ({leases.length})</h2>
      <button onClick={refetch}>Refresh</button>

      {leases.map(lease => (
        <div key={`${lease.id.dseq}-${lease.id.gseq}-${lease.id.oseq}`}>
          <h3>Lease {lease.id.dseq}-{lease.id.gseq}-{lease.id.oseq}</h3>
          <p>Provider: {lease.id.provider}</p>
          <p>State: {lease.state}</p>
          <p>Price: {lease.price.amount} {lease.price.denom}</p>
        </div>
      ))}
    </div>
  )
}
```

---

### useProviders

Hook for querying available providers.

**Signature:**

```typescript
function useProviders(): UseProvidersResult
```

**Returns:**

```typescript
interface UseProvidersResult {
  providers: ProviderInfo[]     // List of providers
  loading: boolean              // Loading state
  error: Error | null           // Error state
  refetch: () => Promise<void>  // Refetch providers
}
```

**Example:**

```tsx
function ProvidersPage() {
  const { providers, loading, error, refetch } = useProviders()

  if (loading) return <div>Loading providers...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h2>Available Providers ({providers.length})</h2>
      <button onClick={refetch}>Refresh</button>

      {providers.map(provider => (
        <div key={provider.owner}>
          <h3>{provider.hostUri}</h3>
          <p>Owner: {provider.owner}</p>
          <div>
            <h4>Attributes:</h4>
            {provider.attributes.map(attr => (
              <span key={attr.key}>
                {attr.key}: {attr.value}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

### useAkashContext

Low-level hook to access the Akash context directly.

**Signature:**

```typescript
function useAkashContext(): AkashContextValue
```

**Returns:**

```typescript
interface AkashContextValue {
  sdk: AkashSDK | null
  isConnected: boolean
  isConnecting: boolean
  error: Error | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}
```

**Example:**

```tsx
function ConnectionStatus() {
  const { isConnected, isConnecting, error, connect, disconnect } = useAkashContext()

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      {isConnecting && <p>Connecting...</p>}
      {error && <p>Error: {error.message}</p>}

      {!isConnected && (
        <button onClick={connect} disabled={isConnecting}>
          Connect
        </button>
      )}

      {isConnected && (
        <button onClick={disconnect}>
          Disconnect
        </button>
      )}
    </div>
  )
}
```

---

## TypeScript Support

All hooks and components are fully typed with TypeScript. Import types from the core package:

```typescript
import type {
  Deployment,
  DeploymentID,
  Lease,
  ProviderInfo,
  AkashConfig
} from '@cryptoandcoffee/akash-jsdk-core'
```

---

## Advanced Patterns

### Error Handling

```tsx
function DeploymentsWithErrorHandling() {
  const { deployments, loading, error, createDeployment } = useDeployments('akash1...')
  const [createError, setCreateError] = useState<Error | null>(null)

  const handleCreate = async (config: any) => {
    setCreateError(null)
    try {
      await createDeployment(config)
    } catch (err) {
      setCreateError(err as Error)
    }
  }

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <ErrorBoundary error={error}>
        <RetryButton onClick={() => window.location.reload()} />
      </ErrorBoundary>
    )
  }

  return (
    <div>
      {createError && <ErrorMessage error={createError} />}
      <CreateButton onCreate={handleCreate} />
      <DeploymentList deployments={deployments} />
    </div>
  )
}
```

### Custom Refresh Intervals

```tsx
function DeploymentsWithAutoRefresh() {
  const { deployments, loading, refetch } = useDeployments('akash1...')

  useEffect(() => {
    const interval = setInterval(() => {
      refetch()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [refetch])

  return <DeploymentList deployments={deployments} loading={loading} />
}
```

### Conditional Rendering

```tsx
function ConditionalDeployments() {
  const [ownerAddress, setOwnerAddress] = useState<string>('')
  const { deployments, loading } = useDeployments(ownerAddress || undefined)

  return (
    <div>
      <input
        value={ownerAddress}
        onChange={(e) => setOwnerAddress(e.target.value)}
        placeholder="Enter owner address"
      />

      {ownerAddress && (
        loading ? (
          <div>Loading...</div>
        ) : (
          <div>Found {deployments.length} deployments</div>
        )
      )}
    </div>
  )
}
```

### Multiple Providers Configuration

```tsx
function MultiNetworkApp() {
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>('mainnet')

  const config = network === 'mainnet'
    ? {
        rpcEndpoint: 'https://rpc.akashedge.com:443',
        chainId: 'akashnet-2'
      }
    : {
        rpcEndpoint: 'https://rpc.sandbox-01.aksh.pw:443',
        chainId: 'sandbox-01'
      }

  return (
    <AkashProvider config={config} autoConnect>
      <NetworkSelector value={network} onChange={setNetwork} />
      <Dashboard />
    </AkashProvider>
  )
}
```

---

## Requirements

- **React**: 18+ (hooks support)
- **Node.js**: 18+ (ESM modules)
- **TypeScript**: 5.3+ (recommended)

---

## Best Practices

1. **Single Provider**: Use only one `AkashProvider` at the root of your app
2. **Owner Address**: Provide owner address to hooks to enable data fetching
3. **Error Handling**: Always handle errors from hook mutations
4. **Loading States**: Show loading indicators while data is fetching
5. **Manual Refetch**: Use `refetch` function to manually update data when needed

---

## Troubleshooting

### Hook returns empty data

Make sure:
1. `AkashProvider` is wrapping your component
2. `autoConnect` is true or you've called `connect()` manually
3. Owner address is provided to hooks that require it

### Connection issues

Check that:
1. RPC endpoint is accessible
2. Chain ID matches the network
3. Network is not rate-limiting requests

### TypeScript errors

Ensure you have:
1. Installed both `@cryptoandcoffee/akash-jsdk-core` and `@cryptoandcoffee/akash-jsdk-react`
2. TypeScript 5.3+ configured
3. Imported types from the correct package

---

## Support

- **Documentation**: [Main README](../../README.md)
- **Core SDK**: [Core Package](../core/README.md)
- **Issues**: [GitHub Issues](https://github.com/cryptoandcoffee/akash-jsdk/issues)

## License

Apache License 2.0

---

**Part of the Akash JSDK v3.5.0 - Production Ready React Integration**
