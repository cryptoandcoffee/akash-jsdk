import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AkashProvider } from '../providers/AkashProvider'
import { useLeases } from './useLeases'
import React from 'react'

const mockLeases = [
  {
    id: {
      owner: 'test-owner',
      dseq: '123',
      gseq: 1,
      oseq: 1,
      provider: 'akash1provider1'
    },
    state: 'active',
    price: { denom: 'uakt', amount: '100' },
    createdAt: Date.now()
  },
  {
    id: {
      owner: 'test-owner',
      dseq: '456',
      gseq: 1,
      oseq: 1,
      provider: 'akash1provider2'
    },
    state: 'closed',
    price: { denom: 'uakt', amount: '200' },
    createdAt: Date.now() - 86400000
  }
]

let connectedHandlers: (() => void)[] = []
let disconnectedHandlers: (() => void)[] = []
let errorHandlers: ((error: Error) => void)[] = []

const mockSDK = {
  connect: vi.fn().mockImplementation(async () => {
    // Simulate successful connection synchronously
    connectedHandlers.forEach(handler => handler())
  }),
  disconnect: vi.fn().mockResolvedValue(undefined),
  on: vi.fn().mockImplementation((event: string, handler: any) => {
    if (event === 'connected') {
      connectedHandlers.push(handler)
    } else if (event === 'disconnected') {
      disconnectedHandlers.push(handler)
    } else if (event === 'error') {
      errorHandlers.push(handler)
    }
  }),
  off: vi.fn().mockImplementation((event: string, handler: any) => {
    if (event === 'connected') {
      connectedHandlers = connectedHandlers.filter(h => h !== handler)
    } else if (event === 'disconnected') {
      disconnectedHandlers = disconnectedHandlers.filter(h => h !== handler)
    } else if (event === 'error') {
      errorHandlers = errorHandlers.filter(h => h !== handler)
    }
  }),
  leases: {
    list: vi.fn().mockResolvedValue(mockLeases),
    get: vi.fn().mockResolvedValue(mockLeases[0]),
    close: vi.fn().mockResolvedValue(undefined)
  }
}

// Mock the core SDK
vi.mock('@cryptoandcoffee/akash-jsdk-core', () => ({
  AkashSDK: vi.fn().mockImplementation(() => mockSDK)
}))

const mockConfig = {
  rpcEndpoint: 'https://rpc.akashedge.com:443',
  chainId: 'akashnet-test'
}

const createWrapper = (autoConnect = true) => ({ children }: { children: React.ReactNode }) => (
  <AkashProvider config={mockConfig} autoConnect={autoConnect}>
    {children}
  </AkashProvider>
)

const wrapper = createWrapper(true)
const wrapperNoAutoConnect = createWrapper(false)

describe('useLeases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset event handlers
    connectedHandlers = []
    disconnectedHandlers = []
    errorHandlers = []
    
    mockSDK.leases.list.mockResolvedValue(mockLeases)
    mockSDK.leases.get.mockResolvedValue(mockLeases[0])
    mockSDK.leases.close.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Initial State', () => {
    it('should return initial state with empty leases', () => {
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper: wrapperNoAutoConnect })
      
      expect(result.current.leases).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(typeof result.current.refetch).toBe('function')
    })

    it('should return initial state when owner is undefined', () => {
      const { result } = renderHook(() => useLeases(), { wrapper: wrapperNoAutoConnect })
      
      expect(result.current.leases).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should return initial state when owner is empty string', () => {
      const { result } = renderHook(() => useLeases(''), { wrapper: wrapperNoAutoConnect })
      
      expect(result.current.leases).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should return initial state when owner is null', () => {
      const { result } = renderHook(() => useLeases(null as any), { wrapper: wrapperNoAutoConnect })
      
      expect(result.current.leases).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
    })
  })

  describe('Data Fetching', () => {
    it('should not fetch when owner is not provided', async () => {
      renderHook(() => useLeases(), { wrapper })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      expect(mockSDK.leases.list).not.toHaveBeenCalled()
    })

    it('should not fetch when not connected', async () => {
      renderHook(() => useLeases('test-owner'), { wrapper: wrapperNoAutoConnect })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      expect(mockSDK.leases.list).not.toHaveBeenCalled()
    })

    it('should fetch leases when connected and owner provided', async () => {
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      // Wait for connection to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      }, { timeout: 3000 })
      
      // Wait for data to be fetched
      await waitFor(() => {
        expect(result.current.leases.length).toBeGreaterThan(0)
      }, { timeout: 3000 })
      
      expect(mockSDK.leases.list).toHaveBeenCalledWith('test-owner')
      expect(result.current.leases).toEqual(mockLeases)
      expect(result.current.error).toBe(null)
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockSDK.leases.list.mockReturnValue(slowPromise)

      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      expect(result.current.loading).toBe(true)
      
      await act(async () => {
        resolvePromise!(mockLeases)
        await slowPromise
      })
      
      expect(result.current.loading).toBe(false)
    })

    it('should refetch when owner changes', async () => {
      const { result, rerender } = renderHook(
        ({ owner }) => useLeases(owner),
        { 
          wrapper,
          initialProps: { owner: 'owner1' }
        }
      )
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(mockSDK.leases.list).toHaveBeenCalledWith('owner1')
      
      rerender({ owner: 'owner2' })
      
      await waitFor(() => {
        expect(mockSDK.leases.list).toHaveBeenCalledWith('owner2')
      })
      
      expect(mockSDK.leases.list).toHaveBeenCalledTimes(2)
    })

    it('should handle owner change from undefined to defined', async () => {
      const { rerender } = renderHook(
        ({ owner }: { owner?: string }) => useLeases(owner),
        { 
          wrapper,
          initialProps: { owner: undefined as string | undefined }
        }
      )
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      expect(mockSDK.leases.list).not.toHaveBeenCalled()
      
      rerender({ owner: 'test-owner' as string | undefined })
      
      await waitFor(() => {
        expect(mockSDK.leases.list).toHaveBeenCalledWith('test-owner')
      })
    })

    it('should handle owner change from defined to undefined', async () => {
      const { rerender } = renderHook(
        ({ owner }: { owner?: string }) => useLeases(owner),
        { 
          wrapper,
          initialProps: { owner: 'test-owner' as string | undefined }
        }
      )
      
      await waitFor(() => {
        expect(mockSDK.leases.list).toHaveBeenCalledWith('test-owner')
      })
      
      rerender({ owner: undefined as string | undefined })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      expect(mockSDK.leases.list).toHaveBeenCalledTimes(1) // Should not call again
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const error = new Error('Network error')
      mockSDK.leases.list.mockRejectedValue(error)
      
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.error).toEqual(error)
      expect(result.current.leases).toEqual([])
    })

    it('should clear error on successful refetch', async () => {
      const error = new Error('Network error')
      mockSDK.leases.list.mockRejectedValueOnce(error)
      
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.error).toEqual(error)
      })
      
      mockSDK.leases.list.mockResolvedValue(mockLeases)
      
      await act(async () => {
        await result.current.refetch()
      })
      
      expect(result.current.error).toBe(null)
      expect(result.current.leases).toEqual(mockLeases)
    })

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'
      mockSDK.leases.list.mockRejectedValue(timeoutError)
      
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.error).toEqual(timeoutError)
      })
    })

    it('should handle network errors', async () => {
      const networkError = new Error('Network unavailable')
      networkError.name = 'NetworkError'
      mockSDK.leases.list.mockRejectedValue(networkError)
      
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.error).toEqual(networkError)
      })
    })

    it('should handle API errors with status codes', async () => {
      const apiError = new Error('Unauthorized')
      ;(apiError as any).status = 401
      mockSDK.leases.list.mockRejectedValue(apiError)
      
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.error).toEqual(apiError)
      })
    })

    it('should handle malformed response errors', async () => {
      const parseError = new Error('Invalid JSON response')
      parseError.name = 'SyntaxError'
      mockSDK.leases.list.mockRejectedValue(parseError)
      
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.error).toEqual(parseError)
      })
    })
  })

  describe('Refetch Function', () => {
    it('should provide working refetch function', async () => {
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.refetch).toBeInstanceOf(Function)
      
      await act(async () => {
        await result.current.refetch()
      })
      
      expect(mockSDK.leases.list).toHaveBeenCalledTimes(2)
    })

    it('should handle refetch errors', async () => {
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const error = new Error('Refetch failed')
      mockSDK.leases.list.mockRejectedValue(error)
      
      await act(async () => {
        await result.current.refetch()
      })
      
      expect(result.current.error).toEqual(error)
    })

    it('should not refetch when owner is missing', async () => {
      const { result } = renderHook(() => useLeases(), { wrapper })
      
      await act(async () => {
        await result.current.refetch()
      })
      
      expect(mockSDK.leases.list).not.toHaveBeenCalled()
    })

    it('should not refetch when not connected', async () => {
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper: wrapperNoAutoConnect })
      
      await act(async () => {
        await result.current.refetch()
      })
      
      expect(mockSDK.leases.list).not.toHaveBeenCalled()
    })

    it('should set loading state during refetch', async () => {
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockSDK.leases.list.mockReturnValue(slowPromise)
      
      act(() => {
        result.current.refetch()
      })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      expect(result.current.loading).toBe(true)
      
      await act(async () => {
        resolvePromise!(mockLeases)
        await slowPromise
      })
      
      expect(result.current.loading).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty lease list', async () => {
      mockSDK.leases.list.mockResolvedValue([])
      
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.leases).toEqual([])
      expect(result.current.error).toBe(null)
    })

    it('should handle null response from SDK', async () => {
      mockSDK.leases.list.mockResolvedValue(null)
      
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.leases).toEqual([])
    })

    it('should handle undefined response from SDK', async () => {
      mockSDK.leases.list.mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.leases).toEqual([])
    })

    it('should handle very long owner address', async () => {
      const longOwner = 'akash'.repeat(100)
      const { result } = renderHook(() => useLeases(longOwner), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(mockSDK.leases.list).toHaveBeenCalledWith(longOwner)
    })

    it('should handle special characters in owner address', async () => {
      const specialOwner = 'akash1test-owner_123'
      const { result } = renderHook(() => useLeases(specialOwner), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(mockSDK.leases.list).toHaveBeenCalledWith(specialOwner)
    })

    it('should handle leases with missing properties', async () => {
      const incompleteLeases = [
        {
          id: {
            owner: 'test-owner',
            dseq: '123'
          },
          state: 'active'
        }
      ]
      mockSDK.leases.list.mockResolvedValue(incompleteLeases)
      
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.leases).toEqual(incompleteLeases)
    })

    it('should handle leases with different states', async () => {
      const diverseLeases = [
        { ...mockLeases[0], state: 'active' },
        { ...mockLeases[1], state: 'closed' },
        { ...mockLeases[0], id: { ...mockLeases[0].id, dseq: '789' }, state: 'insufficient_funds' }
      ]
      mockSDK.leases.list.mockResolvedValue(diverseLeases)
      
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.leases).toEqual(diverseLeases)
    })
  })

  describe('Data Filtering and Sorting', () => {
    it('should handle leases from different providers', async () => {
      const leasesWithDifferentProviders = [
        { ...mockLeases[0], id: { ...mockLeases[0].id, provider: 'akash1provider1' } },
        { ...mockLeases[1], id: { ...mockLeases[1].id, provider: 'akash1provider2' } }
      ]
      mockSDK.leases.list.mockResolvedValue(leasesWithDifferentProviders)
      
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const providers = result.current.leases.map(lease => lease.id.provider)
      expect(providers).toContain('akash1provider1')
      expect(providers).toContain('akash1provider2')
    })

    it('should handle leases with different deployment sequences', async () => {
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const dseqs = result.current.leases.map(lease => lease.id.dseq)
      expect(dseqs).toContain('123')
      expect(dseqs).toContain('456')
    })

    it('should handle leases with different prices', async () => {
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const prices = result.current.leases.map(lease => lease.price?.amount)
      expect(prices).toContain('100')
      expect(prices).toContain('200')
    })

    it('should handle leases with different creation times', async () => {
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const creationTimes = result.current.leases.map(lease => (lease as any).createdAt)
      expect(creationTimes.length).toBe(2)
      expect(creationTimes[0]).toBeGreaterThan(creationTimes[1])
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle multiple refetch calls', async () => {
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      await act(async () => {
        const promises = [
          result.current.refetch(),
          result.current.refetch(),
          result.current.refetch()
        ]
        
        await Promise.all(promises)
      })
      
      expect(mockSDK.leases.list).toHaveBeenCalledTimes(4) // Initial + 3 refetches
    })

    it('should handle rapid owner changes', async () => {
      const { result, rerender } = renderHook(
        ({ owner }) => useLeases(owner),
        { 
          wrapper,
          initialProps: { owner: 'owner1' }
        }
      )
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      rerender({ owner: 'owner2' })
      rerender({ owner: 'owner3' })
      rerender({ owner: 'owner4' })
      
      await waitFor(() => {
        expect(mockSDK.leases.list).toHaveBeenCalledWith('owner4')
      })
    })
  })

  describe('Memory Leaks and Cleanup', () => {
    it('should not update state after unmount', async () => {
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockSDK.leases.list.mockReturnValue(slowPromise)

      const { result, unmount } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      expect(result.current.loading).toBe(true)
      
      unmount()
      
      await act(async () => {
        resolvePromise!(mockLeases)
        await slowPromise
      })
      
      // Should not throw any warnings about state updates after unmount
    })

    it('should handle component unmount during error state', async () => {
      const error = new Error('Network error')
      mockSDK.leases.list.mockRejectedValue(error)
      
      const { result, unmount } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.error).toEqual(error)
      })
      
      unmount()
      
      // Should not throw any warnings
    })
  })

  describe('Integration with Context', () => {
    it('should respond to connection state changes', async () => {
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper: wrapperNoAutoConnect })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      expect(mockSDK.leases.list).not.toHaveBeenCalled()
      
      // Simulate connection
      const { result: connectedResult } = renderHook(() => useLeases('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(connectedResult.current.loading).toBe(false)
      })
      
      expect(mockSDK.leases.list).toHaveBeenCalledWith('test-owner')
    })

    it('should handle SDK being null', async () => {
      const nullSDKWrapper = ({ children }: { children: React.ReactNode }) => (
        <AkashProvider config={mockConfig} autoConnect={false}>
          {children}
        </AkashProvider>
      )
      
      const { result } = renderHook(() => useLeases('test-owner'), { wrapper: nullSDKWrapper })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      expect(result.current.leases).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
    })
  })
})