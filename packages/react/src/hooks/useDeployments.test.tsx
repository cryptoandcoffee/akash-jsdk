import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AkashProvider } from '../providers/AkashProvider'
import { useDeployments } from './useDeployments'
import React from 'react'

const mockDeployments = [
  {
    id: { owner: 'test-owner', dseq: '123' },
    state: 'active',
    version: '1.0.0',
    createdAt: Date.now()
  },
  {
    id: { owner: 'test-owner', dseq: '456' },
    state: 'closed',
    version: '1.1.0',
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
  deployments: {
    list: vi.fn().mockResolvedValue(mockDeployments),
    create: vi.fn().mockResolvedValue('deployment-789'),
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

describe('useDeployments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset event handlers
    connectedHandlers = []
    disconnectedHandlers = []
    errorHandlers = []
    
    mockSDK.deployments.list.mockResolvedValue(mockDeployments)
    mockSDK.deployments.create.mockResolvedValue('deployment-789')
    mockSDK.deployments.close.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Initial State', () => {
    it('should return initial state with empty deployments', () => {
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper: wrapperNoAutoConnect })
      
      expect(result.current.deployments).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(typeof result.current.refetch).toBe('function')
      expect(typeof result.current.createDeployment).toBe('function')
      expect(typeof result.current.closeDeployment).toBe('function')
    })

    it('should return initial state when owner is undefined', () => {
      const { result } = renderHook(() => useDeployments(), { wrapper: wrapperNoAutoConnect })
      
      expect(result.current.deployments).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should return initial state when owner is empty string', () => {
      const { result } = renderHook(() => useDeployments(''), { wrapper: wrapperNoAutoConnect })
      
      expect(result.current.deployments).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
    })
  })

  describe('Data Fetching', () => {
    it('should not fetch when owner is not provided', async () => {
      renderHook(() => useDeployments(), { wrapper })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      expect(mockSDK.deployments.list).not.toHaveBeenCalled()
    })

    it('should not fetch when not connected', async () => {
      renderHook(() => useDeployments('test-owner'), { wrapper: wrapperNoAutoConnect })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      expect(mockSDK.deployments.list).not.toHaveBeenCalled()
    })

    it('should fetch deployments when connected and owner provided', async () => {
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      // Wait for connection to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      }, { timeout: 3000 })
      
      // Wait for data to be fetched
      await waitFor(() => {
        expect(result.current.deployments.length).toBeGreaterThan(0)
      }, { timeout: 3000 })
      
      expect(mockSDK.deployments.list).toHaveBeenCalledWith('test-owner')
      expect(result.current.deployments).toEqual(mockDeployments)
      expect(result.current.error).toBe(null)
    })

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockSDK.deployments.list.mockReturnValue(slowPromise)

      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      expect(result.current.loading).toBe(true)
      
      await act(async () => {
        resolvePromise!(mockDeployments)
        await slowPromise
      })
      
      expect(result.current.loading).toBe(false)
    })

    it('should refetch when owner changes', async () => {
      const { result, rerender } = renderHook(
        ({ owner }) => useDeployments(owner),
        { 
          wrapper,
          initialProps: { owner: 'owner1' }
        }
      )
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(mockSDK.deployments.list).toHaveBeenCalledWith('owner1')
      
      rerender({ owner: 'owner2' })
      
      await waitFor(() => {
        expect(mockSDK.deployments.list).toHaveBeenCalledWith('owner2')
      })
      
      expect(mockSDK.deployments.list).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const error = new Error('Network error')
      mockSDK.deployments.list.mockRejectedValue(error)
      
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.error).toEqual(error)
      expect(result.current.deployments).toEqual([])
    })

    it('should clear error on successful refetch', async () => {
      const error = new Error('Network error')
      mockSDK.deployments.list.mockRejectedValueOnce(error)
      
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.error).toEqual(error)
      })
      
      mockSDK.deployments.list.mockResolvedValue(mockDeployments)
      
      await act(async () => {
        await result.current.refetch()
      })
      
      expect(result.current.error).toBe(null)
      expect(result.current.deployments).toEqual(mockDeployments)
    })

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'
      mockSDK.deployments.list.mockRejectedValue(timeoutError)
      
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.error).toEqual(timeoutError)
      })
    })

    it('should handle network errors', async () => {
      const networkError = new Error('Network unavailable')
      networkError.name = 'NetworkError'
      mockSDK.deployments.list.mockRejectedValue(networkError)
      
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.error).toEqual(networkError)
      })
    })
  })

  describe('Create Deployment', () => {
    it('should create deployment successfully', async () => {
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const config = { image: 'nginx', resources: { cpu: 1, memory: '1Gi' } }
      
      await act(async () => {
        const deploymentId = await result.current.createDeployment(config)
        expect(deploymentId).toBe('deployment-789')
      })
      
      expect(mockSDK.deployments.create).toHaveBeenCalledWith(config)
      expect(mockSDK.deployments.list).toHaveBeenCalledTimes(2) // Initial + after create
    })

    it('should throw error when creating deployment without connection', async () => {
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper: wrapperNoAutoConnect })
      
      await act(async () => {
        await expect(result.current.createDeployment({ image: 'nginx' }))
          .rejects.toThrow('SDK not connected')
      })
      
      expect(mockSDK.deployments.create).not.toHaveBeenCalled()
    })

    it('should handle create deployment errors', async () => {
      const error = new Error('Insufficient funds')
      mockSDK.deployments.create.mockRejectedValue(error)
      
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      await act(async () => {
        await expect(result.current.createDeployment({ image: 'nginx' }))
          .rejects.toThrow('Insufficient funds')
      })
      
      expect(result.current.error).toEqual(error)
    })

    it('should handle create deployment with complex config', async () => {
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const complexConfig = {
        image: 'nginx:latest',
        resources: {
          cpu: 2,
          memory: '4Gi',
          storage: '10Gi'
        },
        env: {
          NODE_ENV: 'production',
          PORT: '3000'
        },
        expose: [
          { port: 80, as: 80, proto: 'tcp' }
        ]
      }
      
      await act(async () => {
        const deploymentId = await result.current.createDeployment(complexConfig)
        expect(deploymentId).toBe('deployment-789')
      })
      
      expect(mockSDK.deployments.create).toHaveBeenCalledWith(complexConfig)
    })
  })

  describe('Close Deployment', () => {
    it('should close deployment successfully', async () => {
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      await act(async () => {
        await result.current.closeDeployment('deployment-123')
      })
      
      expect(mockSDK.deployments.close).toHaveBeenCalledWith('deployment-123')
      expect(mockSDK.deployments.list).toHaveBeenCalledTimes(2) // Initial + after close
    })

    it('should throw error when closing deployment without connection', async () => {
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper: wrapperNoAutoConnect })
      
      await act(async () => {
        await expect(result.current.closeDeployment('deployment-123'))
          .rejects.toThrow('SDK not connected')
      })
      
      expect(mockSDK.deployments.close).not.toHaveBeenCalled()
    })

    it('should handle close deployment errors', async () => {
      const error = new Error('Deployment not found')
      mockSDK.deployments.close.mockRejectedValue(error)
      
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      await act(async () => {
        await expect(result.current.closeDeployment('deployment-123'))
          .rejects.toThrow('Deployment not found')
      })
      
      expect(result.current.error).toEqual(error)
    })

    it('should handle close deployment with invalid ID', async () => {
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      await act(async () => {
        await result.current.closeDeployment('')
      })
      
      expect(mockSDK.deployments.close).toHaveBeenCalledWith('')
    })
  })

  describe('Refetch Function', () => {
    it('should provide working refetch function', async () => {
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.refetch).toBeInstanceOf(Function)
      
      await act(async () => {
        await result.current.refetch()
      })
      
      expect(mockSDK.deployments.list).toHaveBeenCalledTimes(2)
    })

    it('should handle refetch errors', async () => {
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const error = new Error('Refetch failed')
      mockSDK.deployments.list.mockRejectedValue(error)
      
      await act(async () => {
        await result.current.refetch()
      })
      
      expect(result.current.error).toEqual(error)
    })

    it('should not refetch when owner is missing', async () => {
      const { result } = renderHook(() => useDeployments(), { wrapper })
      
      await act(async () => {
        await result.current.refetch()
      })
      
      expect(mockSDK.deployments.list).not.toHaveBeenCalled()
    })

    it('should not refetch when not connected', async () => {
      // Clear all mocks before starting this test
      vi.clearAllMocks()
      
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper: wrapperNoAutoConnect })
      
      // Wait a bit to ensure no initial fetch happens
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })
      
      // Verify no initial call was made
      expect(mockSDK.deployments.list).not.toHaveBeenCalled()
      
      await act(async () => {
        await result.current.refetch()
      })
      
      expect(mockSDK.deployments.list).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty deployment list', async () => {
      mockSDK.deployments.list.mockResolvedValue([])
      
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.deployments).toEqual([])
      expect(result.current.error).toBe(null)
    })

    it('should handle null response from SDK', async () => {
      mockSDK.deployments.list.mockResolvedValue(null)
      
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.deployments).toEqual([])
    })

    it('should handle undefined response from SDK', async () => {
      mockSDK.deployments.list.mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.deployments).toEqual([])
    })

    it('should handle very long owner address', async () => {
      const longOwner = 'akash'.repeat(100)
      const { result } = renderHook(() => useDeployments(longOwner), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(mockSDK.deployments.list).toHaveBeenCalledWith(longOwner)
    })

    it('should handle special characters in owner address', async () => {
      const specialOwner = 'akash1test-owner_123'
      const { result } = renderHook(() => useDeployments(specialOwner), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(mockSDK.deployments.list).toHaveBeenCalledWith(specialOwner)
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent create and close operations', async () => {
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      await act(async () => {
        const promises = [
          result.current.createDeployment({ image: 'nginx' }),
          result.current.closeDeployment('deployment-123')
        ]
        
        await Promise.all(promises)
      })
      
      expect(mockSDK.deployments.create).toHaveBeenCalled()
      expect(mockSDK.deployments.close).toHaveBeenCalled()
    })

    it('should handle multiple refetch calls', async () => {
      const { result } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
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
      
      expect(mockSDK.deployments.list).toHaveBeenCalledTimes(4) // Initial + 3 refetches
    })
  })

  describe('Memory Leaks and Cleanup', () => {
    it('should not update state after unmount', async () => {
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockSDK.deployments.list.mockReturnValue(slowPromise)

      const { result, unmount } = renderHook(() => useDeployments('test-owner'), { wrapper })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      expect(result.current.loading).toBe(true)
      
      unmount()
      
      await act(async () => {
        resolvePromise!(mockDeployments)
        await slowPromise
      })
      
      // Should not throw any warnings about state updates after unmount
    })
  })
})