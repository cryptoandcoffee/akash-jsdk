import { useState, useEffect, useCallback } from 'react'
import { Lease } from '@cryptoandcoffee/akash-jsdk-core'
import { useAkashContext } from '../providers/AkashProvider'

interface UseLeasesResult {
  leases: Lease[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useLeases(owner?: string): UseLeasesResult {
  const { sdk, isConnected } = useAkashContext()
  const [leases, setLeases] = useState<Lease[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchLeases = useCallback(async () => {
    if (!sdk || !isConnected || !owner) {
      setLeases([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await sdk.leases.list(owner)
      setLeases(result || [])
    } catch (err) {
      setError(err as Error)
      setLeases([])
    } finally {
      setLoading(false)
    }
  }, [sdk, isConnected, owner])

  useEffect(() => {
    fetchLeases()
  }, [fetchLeases])

  return {
    leases,
    loading,
    error,
    refetch: fetchLeases
  }
}