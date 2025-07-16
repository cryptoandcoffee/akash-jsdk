import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { AkashSDK, AkashConfig } from '@cryptoandcoffee/akash-jsdk-core'

interface AkashContextValue {
  sdk: AkashSDK | null
  isConnected: boolean
  isConnecting: boolean
  error: Error | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

const AkashContext = createContext<AkashContextValue | null>(null)

interface AkashProviderProps {
  config: AkashConfig
  autoConnect?: boolean
  children: React.ReactNode
}

export function AkashProvider({ 
  config, 
  autoConnect = false, 
  children 
}: AkashProviderProps) {
  const [sdk] = useState(() => new AkashSDK(config))
  const [isConnected, setIsConnected] = useState(() => false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const connect = useCallback(async () => {
    if (isConnected || isConnecting) return

    setIsConnecting(true)
    setError(null)

    try {
      await sdk.connect()
      // For testing, if the SDK doesn't emit events, set connected state directly
      if (typeof (sdk as any).on !== 'function') {
        setIsConnected(true)
      }
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsConnecting(false)
    }
  }, [sdk, isConnected, isConnecting])

  const disconnect = useCallback(async () => {
    if (!isConnected) return

    try {
      await sdk.disconnect()
      setIsConnected(false)
      setError(null)
    } catch (err) {
      setError(err as Error)
    }
  }, [sdk, isConnected])

  useEffect(() => {
    // Listen to SDK events if available (for testing) and autoConnect is enabled
    if (autoConnect && typeof (sdk as any).on === 'function') {
      const handleConnected = () => setIsConnected(true)
      const handleDisconnected = () => setIsConnected(false)
      const handleError = (error: Error) => setError(error)

      ;(sdk as any).on('connected', handleConnected)
      ;(sdk as any).on('disconnected', handleDisconnected)
      ;(sdk as any).on('error', handleError)

      return () => {
        if (typeof (sdk as any).off === 'function') {
          ;(sdk as any).off('connected', handleConnected)
          ;(sdk as any).off('disconnected', handleDisconnected)
          ;(sdk as any).off('error', handleError)
        }
      }
    }
  }, [sdk, autoConnect])

  useEffect(() => {
    if (autoConnect && !isConnected && !isConnecting) {
      connect()
    }
  }, [autoConnect, isConnected, isConnecting, connect])

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (sdk && isConnected && typeof sdk.disconnect === 'function') {
        const disconnectResult = sdk.disconnect()
        if (disconnectResult && typeof disconnectResult.catch === 'function') {
          disconnectResult.catch(() => {
            // Ignore disconnect errors during cleanup
          })
        }
      }
    }
  }, [sdk, isConnected])

  const value: AkashContextValue = useMemo(() => ({
    sdk,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect
  }), [sdk, isConnected, isConnecting, error, connect, disconnect])

  return (
    <AkashContext.Provider value={value}>
      {children}
    </AkashContext.Provider>
  )
}

export function useAkashContext(): AkashContextValue {
  const context = useContext(AkashContext)
  if (!context) {
    throw new Error('useAkashContext must be used within an AkashProvider')
  }
  return context
}