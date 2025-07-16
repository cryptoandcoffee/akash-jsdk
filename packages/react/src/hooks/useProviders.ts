import { useState, useEffect, useCallback, useMemo } from 'react'
import { ProviderInfo } from '@cryptoandcoffee/akash-jsdk-core'
import { useAkashContext } from '../providers/AkashProvider'

interface UseProvidersResult {
  providers: ProviderInfo[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useProviders(): UseProvidersResult {
  const { sdk, isConnected } = useAkashContext()
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchProviders = useCallback(async () => {
    if (!sdk || !isConnected) {
      setProviders([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await sdk.providers.list()
      setProviders(result || [])
    } catch (err) {
      setError(err as Error)
      setProviders([])
    } finally {
      setLoading(false)
    }
  }, [sdk, isConnected])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  return useMemo(() => ({
    providers,
    loading,
    error,
    refetch: fetchProviders
  }), [providers, loading, error, fetchProviders])
}