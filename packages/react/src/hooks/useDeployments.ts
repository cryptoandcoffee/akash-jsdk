import { useState, useEffect, useCallback } from 'react'
import { Deployment, DeploymentID } from '@cryptoandcoffee/akash-jsdk-core'
import { useAkashContext } from '../providers/AkashProvider'

interface UseDeploymentsResult {
  deployments: Deployment[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  createDeployment: (config: any) => Promise<DeploymentID>
  closeDeployment: (deploymentId: string) => Promise<void>
}

export function useDeployments(owner?: string): UseDeploymentsResult {
  const { sdk, isConnected } = useAkashContext()
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchDeployments = useCallback(async () => {
    if (!sdk || !isConnected || !owner) {
      setDeployments([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await sdk.deployments.list(owner)
      setDeployments(result || [])
    } catch (err) {
      setError(err as Error)
      setDeployments([])
    } finally {
      setLoading(false)
    }
  }, [sdk, isConnected, owner])

  const createDeployment = useCallback(async (config: any): Promise<DeploymentID> => {
    if (!sdk || !isConnected) {
      throw new Error('SDK not connected')
    }

    try {
      const deploymentId = await sdk.deployments.create(config)
      await fetchDeployments() // Refresh list
      return deploymentId
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [sdk, isConnected, fetchDeployments])

  const closeDeployment = useCallback(async (deploymentId: string): Promise<void> => {
    if (!sdk || !isConnected) {
      throw new Error('SDK not connected')
    }

    try {
      await sdk.deployments.close(deploymentId)
      await fetchDeployments() // Refresh list
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [sdk, isConnected, fetchDeployments])

  useEffect(() => {
    fetchDeployments()
  }, [fetchDeployments])

  return {
    deployments,
    loading,
    error,
    refetch: fetchDeployments,
    createDeployment,
    closeDeployment
  }
}