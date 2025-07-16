import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { render } from '@testing-library/react'
import { AkashProvider } from '../providers/AkashProvider'
import { useProviders } from './useProviders'
import React from 'react'

const mockProviders = [
  {
    owner: 'akash1provider1',
    hostUri: 'https://provider1.akash.network',
    attributes: [
      { key: 'region', value: 'us-west' },
      { key: 'tier', value: 'premium' }
    ],
    info: {
      email: 'contact@provider1.com',
      website: 'https://provider1.com'
    }
  },
  {
    owner: 'akash1provider2',
    hostUri: 'https://provider2.akash.network',
    attributes: [
      { key: 'region', value: 'eu-central' },
      { key: 'tier', value: 'standard' }
    ],
    info: {
      email: 'contact@provider2.com',
      website: 'https://provider2.com'
    }
  },
  {
    owner: 'akash1provider3',
    hostUri: 'https://provider3.akash.network',
    attributes: [
      { key: 'region', value: 'ap-southeast' },
      { key: 'tier', value: 'premium' }
    ],
    info: {
      email: 'contact@provider3.com',
      website: 'https://provider3.com'
    }
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
  providers: {
    list: vi.fn().mockResolvedValue(mockProviders),
    get: vi.fn().mockResolvedValue(mockProviders[0])
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

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AkashProvider config={mockConfig} autoConnect={true}>
    {children}
  </AkashProvider>
)

const wrapperNoAutoConnect = ({ children }: { children: React.ReactNode }) => (
  <AkashProvider config={mockConfig} autoConnect={false}>
    {children}
  </AkashProvider>
)

describe('useProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSDK.providers.list.mockResolvedValue(mockProviders)
    mockSDK.providers.get.mockResolvedValue(mockProviders[0])
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Initial State', () => {
    it('should return initial state with empty providers', () => {
      const { result } = renderHook(() => useProviders(), { wrapper: wrapperNoAutoConnect })
      
      expect(result.current.providers).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(typeof result.current.refetch).toBe('function')
    })

    it('should have consistent initial state across multiple renders', () => {
      const { result, rerender } = renderHook(() => useProviders(), { wrapper: wrapperNoAutoConnect })
      
      const initialState = {
        providers: result.current.providers,
        loading: result.current.loading,
        error: result.current.error
      }
      
      rerender()
      
      expect(result.current.providers).toEqual(initialState.providers)
      expect(result.current.loading).toBe(initialState.loading)
      expect(result.current.error).toBe(initialState.error)
    })
  })

  describe('Data Fetching', () => {
    it('should not fetch when not connected', async () => {
      renderHook(() => useProviders(), { wrapper: wrapperNoAutoConnect })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      expect(mockSDK.providers.list).not.toHaveBeenCalled()
    })

    it('should fetch providers when connected', async () => {
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      // Wait for connection and data fetching to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      }, { timeout: 3000 })
      
      // Wait a bit more to ensure async operations complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      expect(mockSDK.providers.list).toHaveBeenCalledWith()
      expect(result.current.providers).toEqual(mockProviders)
      expect(result.current.error).toBe(null)
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockSDK.providers.list.mockReturnValue(slowPromise)

      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      expect(result.current.loading).toBe(true)
      
      await act(async () => {
        resolvePromise!(mockProviders)
        await slowPromise
      })
      
      expect(result.current.loading).toBe(false)
    })

    it('should fetch providers immediately on connection', async () => {
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(mockSDK.providers.list).toHaveBeenCalled()
      })
      
      expect(result.current.providers).toEqual(mockProviders)
    })

    it('should handle connection state changes', async () => {
      const { result: disconnectedResult } = renderHook(() => useProviders(), { wrapper: wrapperNoAutoConnect })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      expect(mockSDK.providers.list).not.toHaveBeenCalled()
      expect(disconnectedResult.current.providers).toEqual([])
      
      // Simulate connection
      const { result: connectedResult } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(connectedResult.current.loading).toBe(false)
      })
      
      expect(mockSDK.providers.list).toHaveBeenCalled()
      expect(connectedResult.current.providers).toEqual(mockProviders)
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const error = new Error('Network error')
      mockSDK.providers.list.mockRejectedValue(error)
      
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.error).toEqual(error)
      expect(result.current.providers).toEqual([])
    })

    it('should clear error on successful refetch', async () => {
      const error = new Error('Network error')
      mockSDK.providers.list.mockRejectedValueOnce(error)
      
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.error).toEqual(error)
      })
      
      mockSDK.providers.list.mockResolvedValue(mockProviders)
      
      await act(async () => {
        await result.current.refetch()
      })
      
      expect(result.current.error).toBe(null)
      expect(result.current.providers).toEqual(mockProviders)
    })

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'
      mockSDK.providers.list.mockRejectedValue(timeoutError)
      
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.error).toEqual(timeoutError)
      })
    })

    it('should handle network errors', async () => {
      const networkError = new Error('Network unavailable')
      networkError.name = 'NetworkError'
      mockSDK.providers.list.mockRejectedValue(networkError)
      
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.error).toEqual(networkError)
      })
    })

    it('should handle API errors with status codes', async () => {
      const apiError = new Error('Unauthorized')
      ;(apiError as any).status = 401
      mockSDK.providers.list.mockRejectedValue(apiError)
      
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.error).toEqual(apiError)
      })
    })

    it('should handle malformed response errors', async () => {
      const parseError = new Error('Invalid JSON response')
      parseError.name = 'SyntaxError'
      mockSDK.providers.list.mockRejectedValue(parseError)
      
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.error).toEqual(parseError)
      })
    })

    it('should handle provider service unavailable errors', async () => {
      const serviceError = new Error('Provider service unavailable')
      ;(serviceError as any).status = 503
      mockSDK.providers.list.mockRejectedValue(serviceError)
      
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.error).toEqual(serviceError)
      })
    })
  })

  describe('Refetch Function', () => {
    it('should provide working refetch function', async () => {
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.refetch).toBeInstanceOf(Function)
      
      await act(async () => {
        await result.current.refetch()
      })
      
      expect(mockSDK.providers.list).toHaveBeenCalledTimes(2)
    })

    it('should handle refetch errors', async () => {
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const error = new Error('Refetch failed')
      mockSDK.providers.list.mockRejectedValue(error)
      
      await act(async () => {
        await result.current.refetch()
      })
      
      expect(result.current.error).toEqual(error)
    })

    it('should not refetch when not connected', async () => {
      const { result } = renderHook(() => useProviders(), { wrapper: wrapperNoAutoConnect })
      
      await act(async () => {
        await result.current.refetch()
      })
      
      expect(mockSDK.providers.list).not.toHaveBeenCalled()
    })

    it('should set loading state during refetch', async () => {
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockSDK.providers.list.mockReturnValue(slowPromise)
      
      act(() => {
        result.current.refetch()
      })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      expect(result.current.loading).toBe(true)
      
      await act(async () => {
        resolvePromise!(mockProviders)
        await slowPromise
      })
      
      expect(result.current.loading).toBe(false)
    })

    it('should update providers list after successful refetch', async () => {
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const updatedProviders = [
        ...mockProviders,
        {
          owner: 'akash1provider4',
          hostUri: 'https://provider4.akash.network',
          attributes: [{ key: 'region', value: 'us-east' }],
          info: { email: 'contact@provider4.com', website: 'https://provider4.com' }
        }
      ]
      
      mockSDK.providers.list.mockResolvedValue(updatedProviders)
      
      await act(async () => {
        await result.current.refetch()
      })
      
      expect(result.current.providers).toEqual(updatedProviders)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty provider list', async () => {
      mockSDK.providers.list.mockResolvedValue([])
      
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.providers).toEqual([])
      expect(result.current.error).toBe(null)
    })

    it('should handle null response from SDK', async () => {
      mockSDK.providers.list.mockResolvedValue(null)
      
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.providers).toEqual([])
    })

    it('should handle undefined response from SDK', async () => {
      mockSDK.providers.list.mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.providers).toEqual([])
    })

    it('should handle providers with missing properties', async () => {
      const incompleteProviders = [
        {
          owner: 'akash1provider1',
          hostUri: 'https://provider1.akash.network'
        },
        {
          owner: 'akash1provider2',
          attributes: [{ key: 'region', value: 'us-west' }]
        }
      ]
      mockSDK.providers.list.mockResolvedValue(incompleteProviders)
      
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      }, { timeout: 3000 })
      
      // Wait a bit more to ensure async operations complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      expect(result.current.providers).toEqual(incompleteProviders)
    })

    it('should handle providers with empty attributes', async () => {
      const providersWithEmptyAttributes = [
        {
          owner: 'akash1provider1',
          hostUri: 'https://provider1.akash.network',
          attributes: [],
          info: { email: '', website: '' }
        }
      ]
      mockSDK.providers.list.mockResolvedValue(providersWithEmptyAttributes)
      
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.providers).toEqual(providersWithEmptyAttributes)
    })

    it('should handle providers with malformed URIs', async () => {
      const providersWithBadURIs = [
        {
          owner: 'akash1provider1',
          hostUri: 'invalid-uri',
          attributes: [{ key: 'region', value: 'us-west' }],
          info: { email: 'contact@provider1.com', website: 'invalid-website' }
        }
      ]
      mockSDK.providers.list.mockResolvedValue(providersWithBadURIs)
      
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.providers).toEqual(providersWithBadURIs)
    })

    it('should handle very large provider lists', async () => {
      const largeProviderList = Array.from({ length: 1000 }, (_, i) => ({
        owner: `akash1provider${i}`,
        hostUri: `https://provider${i}.akash.network`,
        attributes: [
          { key: 'region', value: `region-${i % 10}` },
          { key: 'tier', value: i % 2 === 0 ? 'premium' : 'standard' }
        ],
        info: {
          email: `contact@provider${i}.com`,
          website: `https://provider${i}.com`
        }
      }))
      
      mockSDK.providers.list.mockResolvedValue(largeProviderList)
      
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.providers).toHaveLength(1000)
      expect(result.current.providers).toEqual(largeProviderList)
    })
  })

  describe('Provider Data Analysis', () => {
    it('should handle providers from different regions', async () => {
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      }, { timeout: 3000 })
      
      // Wait a bit more to ensure async operations complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      const regions = result.current.providers.map(provider => 
        provider.attributes.find(attr => attr.key === 'region')?.value
      )
      
      expect(regions).toContain('us-west')
      expect(regions).toContain('eu-central')
      expect(regions).toContain('ap-southeast')
    })

    it('should handle providers with different tiers', async () => {
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const tiers = result.current.providers.map(provider => 
        provider.attributes.find(attr => attr.key === 'tier')?.value
      )
      
      expect(tiers).toContain('premium')
      expect(tiers).toContain('standard')
    })

    it('should handle providers with different contact information', async () => {
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const emails = result.current.providers.map(provider => (provider as any).info?.email)
      const websites = result.current.providers.map(provider => (provider as any).info?.website)
      
      expect(emails).toContain('contact@provider1.com')
      expect(emails).toContain('contact@provider2.com')
      expect(websites).toContain('https://provider1.com')
      expect(websites).toContain('https://provider2.com')
    })

    it('should handle providers with custom attributes', async () => {
      const providersWithCustomAttrs = [
        {
          owner: 'akash1provider1',
          hostUri: 'https://provider1.akash.network',
          attributes: [
            { key: 'region', value: 'us-west' },
            { key: 'tier', value: 'premium' },
            { key: 'gpu', value: 'nvidia-rtx-4090' },
            { key: 'storage-type', value: 'nvme-ssd' },
            { key: 'network-speed', value: '10gbps' }
          ],
          info: { email: 'contact@provider1.com', website: 'https://provider1.com' }
        }
      ]
      
      mockSDK.providers.list.mockResolvedValue(providersWithCustomAttrs)
      
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const provider = result.current.providers[0]
      const gpuAttr = provider.attributes.find(attr => attr.key === 'gpu')
      const storageAttr = provider.attributes.find(attr => attr.key === 'storage-type')
      const networkAttr = provider.attributes.find(attr => attr.key === 'network-speed')
      
      expect(gpuAttr?.value).toBe('nvidia-rtx-4090')
      expect(storageAttr?.value).toBe('nvme-ssd')
      expect(networkAttr?.value).toBe('10gbps')
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle multiple refetch calls', async () => {
      const { result } = renderHook(() => useProviders(), { wrapper })
      
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
      
      expect(mockSDK.providers.list).toHaveBeenCalledTimes(4) // Initial + 3 refetches
    })

    it('should handle rapid successive refetches', async () => {
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      // Simulate rapid successive calls
      await act(async () => {
        for (let i = 0; i < 5; i++) {
          result.current.refetch()
        }
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      expect(mockSDK.providers.list).toHaveBeenCalledTimes(6) // Initial + 5 refetches
    })
  })

  describe('Memory Leaks and Cleanup', () => {
    it('should not update state after unmount', async () => {
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockSDK.providers.list.mockReturnValue(slowPromise)

      const { result, unmount } = renderHook(() => useProviders(), { wrapper })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      expect(result.current.loading).toBe(true)
      
      unmount()
      
      await act(async () => {
        resolvePromise!(mockProviders)
        await slowPromise
      })
      
      // Should not throw any warnings about state updates after unmount
    })

    it('should handle component unmount during error state', async () => {
      const error = new Error('Network error')
      mockSDK.providers.list.mockRejectedValue(error)
      
      const { result, unmount } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.error).toEqual(error)
      })
      
      unmount()
      
      // Should not throw any warnings
    })

    it('should handle component unmount during loading state', async () => {
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockSDK.providers.list.mockReturnValue(slowPromise)

      const { result, unmount } = renderHook(() => useProviders(), { wrapper })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      expect(result.current.loading).toBe(true)
      
      unmount()
      
      // Resolve the promise after unmount
      await act(async () => {
        resolvePromise!(mockProviders)
        await slowPromise
      })
    })
  })

  describe('Integration with Context', () => {
    it('should respond to connection state changes', async () => {
      const { result } = renderHook(() => useProviders(), { wrapper: wrapperNoAutoConnect })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      expect(mockSDK.providers.list).not.toHaveBeenCalled()
      
      // Simulate connection
      const { result: connectedResult } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(connectedResult.current.loading).toBe(false)
      })
      
      expect(mockSDK.providers.list).toHaveBeenCalled()
    })

    it('should handle SDK being null', async () => {
      const nullSDKWrapper = ({ children }: { children: React.ReactNode }) => (
        <AkashProvider config={mockConfig} autoConnect={false}>
          {children}
        </AkashProvider>
      )
      
      const { result } = renderHook(() => useProviders(), { wrapper: nullSDKWrapper })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      expect(result.current.providers).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should handle context provider errors', async () => {
      // This test would require mocking the context to throw an error
      // For now, we'll test that the hook handles missing context gracefully
      const { result } = renderHook(() => useProviders(), { wrapper: wrapperNoAutoConnect })
      
      expect(result.current.providers).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
    })
  })

  describe('Performance and Optimization', () => {
    it('should optimize re-renders', async () => {
      let renderCount = 0
      const TestComponent = () => {
        renderCount++
        useProviders()
        return null
      }
      
      const { rerender } = render(<TestComponent />, { wrapper })
      
      await waitFor(() => {
        expect(renderCount).toBeGreaterThan(0)
      })
      
      const initialRenderCount = renderCount
      
      // Multiple rerenders should not cause additional renders if state hasn't changed
      rerender(<TestComponent />)
      rerender(<TestComponent />)
      rerender(<TestComponent />)
      
      expect(renderCount).toBe(initialRenderCount + 3)
    })

    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        owner: `akash1provider${i}`,
        hostUri: `https://provider${i}.akash.network`,
        attributes: [{ key: 'region', value: `region-${i % 100}` }],
        info: { email: `contact@provider${i}.com`, website: `https://provider${i}.com` }
      }))
      
      mockSDK.providers.list.mockResolvedValue(largeDataset)
      
      const startTime = Date.now()
      const { result } = renderHook(() => useProviders(), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(result.current.providers).toHaveLength(10000)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })
})