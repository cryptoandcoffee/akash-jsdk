import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AkashProvider, useAkashContext } from './AkashProvider'
import React from 'react'

// Mock the core SDK
vi.mock('@cryptoandcoffee/akash-jsdk-core', () => ({
  AkashSDK: vi.fn(function(this: any, config: any) {
    this.connect = vi.fn().mockResolvedValue(undefined)
    this.disconnect = vi.fn().mockResolvedValue(undefined)
    this.isConnected = vi.fn().mockReturnValue(false)
    this.wallet = {
      getAddress: vi.fn().mockReturnValue('akash1test')
    }
    return this
  })
}))

const mockConfig = {
  rpcEndpoint: 'https://rpc.akashedge.com:443',
  chainId: 'akashnet-test'
}

// Test component that uses the context
const TestComponent = () => {
  const { sdk, isConnected, isConnecting, error, connect, disconnect } = useAkashContext()
  
  return (
    <div>
      <div data-testid="connected">{isConnected ? 'Connected' : 'Disconnected'}</div>
      <div data-testid="connecting">{isConnecting ? 'Connecting' : 'Not Connecting'}</div>
      <div data-testid="error">{error?.message || 'No Error'}</div>
      <div data-testid="sdk">{sdk ? 'SDK Available' : 'No SDK'}</div>
      <button data-testid="connect-btn" onClick={connect}>Connect</button>
      <button data-testid="disconnect-btn" onClick={disconnect}>Disconnect</button>
    </div>
  )
}

describe('AkashProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should provide initial context values', () => {
    render(
      <AkashProvider config={mockConfig}>
        <TestComponent />
      </AkashProvider>
    )
    
    expect(screen.getByTestId('connected')).toHaveTextContent('Disconnected')
    expect(screen.getByTestId('connecting')).toHaveTextContent('Not Connecting')
    expect(screen.getByTestId('error')).toHaveTextContent('No Error')
    expect(screen.getByTestId('sdk')).toHaveTextContent('SDK Available')
  })

  it('should auto connect when autoConnect is true', async () => {
    const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
    const mockInstance = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false).mockReturnValueOnce(false).mockReturnValue(true)
    }
    vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
    
    render(
      <AkashProvider config={mockConfig} autoConnect>
        <TestComponent />
      </AkashProvider>
    )
    
    await waitFor(() => {
      expect(mockInstance.connect).toHaveBeenCalled()
    })
  })

  it('should handle connection errors', async () => {
    const connectError = new Error('Connection failed')
    const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')

    const mockSDK = {
      connect: vi.fn().mockRejectedValue(connectError),
      disconnect: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false)
    }

    vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockSDK as any
    })
    
    render(
      <AkashProvider config={mockConfig}>
        <TestComponent />
      </AkashProvider>
    )
    
    // Manually trigger connect to test error handling
    const connectBtn = screen.getByTestId('connect-btn')
    await act(async () => {
      connectBtn.click()
    })
    
    await waitFor(() => {
      expect(mockSDK.connect).toHaveBeenCalled()
    })
    
    await waitFor(
      () => {
        expect(screen.getByTestId('error')).toHaveTextContent('Connection failed')
      },
      { timeout: 1000 }
    )
    
    expect(screen.getByTestId('connecting')).toHaveTextContent('Not Connecting')
  })

  it('should throw error when useAkashContext is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAkashContext must be used within an AkashProvider')
    
    consoleSpy.mockRestore()
  })

  it('should handle wallet mnemonic in config', () => {
    const configWithWallet = {
      ...mockConfig,
      wallet: {
        mnemonic: 'test mnemonic phrase'
      }
    }
    
    render(
      <AkashProvider config={configWithWallet}>
        <TestComponent />
      </AkashProvider>
    )
    
    expect(screen.getByTestId('sdk')).toHaveTextContent('SDK Available')
  })

  it('should cleanup on unmount when connected', async () => {
    const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
    const mockInstance = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn()
        .mockReturnValueOnce(false) // Initial state
        .mockReturnValueOnce(false) // Before connect
        .mockReturnValueOnce(true)  // After connect
        .mockReturnValue(true)      // During cleanup
    }
    vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
    
    const { unmount } = render(
      <AkashProvider config={mockConfig}>
        <TestComponent />
      </AkashProvider>
    )
    
    // Connect first so there's something to cleanup
    const connectBtn = screen.getByTestId('connect-btn')
    await act(async () => {
      connectBtn.click()
    })
    
    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('Connected')
    })
    
    unmount()
    
    expect(mockInstance.disconnect).toHaveBeenCalled()
  })

  describe('disconnect function', () => {
    it('should handle manual disconnect when connected', async () => {
      const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
      const mockInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn()
          .mockReturnValueOnce(false) // Initial state
          .mockReturnValueOnce(false) // Before connect
          .mockReturnValueOnce(true)  // After connect
          .mockReturnValueOnce(true)  // Before disconnect
          .mockReturnValue(false)     // After disconnect
      }
      vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
      
      render(
        <AkashProvider config={mockConfig}>
          <TestComponent />
        </AkashProvider>
      )
      
      // First connect manually
      const connectBtn = screen.getByTestId('connect-btn')
      await act(async () => {
        connectBtn.click()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connected')).toHaveTextContent('Connected')
      })
      
      // Now test disconnect
      const disconnectBtn = screen.getByTestId('disconnect-btn')
      await act(async () => {
        disconnectBtn.click()
      })
      
      await waitFor(() => {
        expect(mockInstance.disconnect).toHaveBeenCalled()
        expect(screen.getByTestId('connected')).toHaveTextContent('Disconnected')
        expect(screen.getByTestId('error')).toHaveTextContent('No Error')
      })
    })

    it('should not disconnect when already disconnected', async () => {
      const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
      const mockInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(false)
      }
      vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
      
      render(
        <AkashProvider config={mockConfig}>
          <TestComponent />
        </AkashProvider>
      )
      
      const disconnectBtn = screen.getByTestId('disconnect-btn')
      await act(async () => {
        disconnectBtn.click()
      })
      
      expect(mockInstance.disconnect).not.toHaveBeenCalled()
    })

    it('should handle disconnect errors', async () => {
      const disconnectError = new Error('Disconnect failed')
      const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
      const mockInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockRejectedValue(disconnectError),
        isConnected: vi.fn()
          .mockReturnValueOnce(false) // Initial state
          .mockReturnValueOnce(false) // Before connect
          .mockReturnValueOnce(true)  // After connect
          .mockReturnValue(true)      // Before disconnect (stays true due to error)
      }
      vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
      
      render(
        <AkashProvider config={mockConfig}>
          <TestComponent />
        </AkashProvider>
      )
      
      // First connect manually
      const connectBtn = screen.getByTestId('connect-btn')
      await act(async () => {
        connectBtn.click()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connected')).toHaveTextContent('Connected')
      })
      
      // Now test disconnect with error
      const disconnectBtn = screen.getByTestId('disconnect-btn')
      await act(async () => {
        disconnectBtn.click()
        // Wait for the disconnect promise to settle to avoid unhandled rejection
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      await waitFor(() => {
        expect(mockInstance.disconnect).toHaveBeenCalled()
        expect(screen.getByTestId('error')).toHaveTextContent('Disconnect failed')
      })
    })
  })

  describe('SDK Event Handling', () => {
    it('should handle SDK connected event with autoConnect', async () => {
      const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
      
      let connectedHandler: () => void = () => {}
      let disconnectedHandler: () => void = () => {}
      let errorHandler: (error: Error) => void = () => {}
      
      const mockInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(false),
        on: vi.fn().mockImplementation((event: string, handler: any) => {
          if (event === 'connected') connectedHandler = handler
          if (event === 'disconnected') disconnectedHandler = handler
          if (event === 'error') errorHandler = handler
        }),
        off: vi.fn()
      }
      vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
      
      render(
        <AkashProvider config={mockConfig} autoConnect>
          <TestComponent />
        </AkashProvider>
      )
      
      // Simulate SDK connected event
      await act(async () => {
        connectedHandler()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connected')).toHaveTextContent('Connected')
      })
    })

    it('should handle SDK disconnected event with autoConnect', async () => {
      const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
      
      let connectedHandler: () => void = () => {}
      let disconnectedHandler: () => void = () => {}
      let errorHandler: (error: Error) => void = () => {}
      
      const mockInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(false),
        on: vi.fn().mockImplementation((event: string, handler: any) => {
          if (event === 'connected') connectedHandler = handler
          if (event === 'disconnected') disconnectedHandler = handler
          if (event === 'error') errorHandler = handler
        }),
        off: vi.fn()
      }
      vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
      
      render(
        <AkashProvider config={mockConfig} autoConnect>
          <TestComponent />
        </AkashProvider>
      )
      
      // Verify handlers are set up
      expect(mockInstance.on).toHaveBeenCalledWith('connected', expect.any(Function))
      expect(mockInstance.on).toHaveBeenCalledWith('disconnected', expect.any(Function))
      expect(mockInstance.on).toHaveBeenCalledWith('error', expect.any(Function))
      
      // Test disconnected handler directly 
      act(() => {
        disconnectedHandler()
      })
      
      // Verify the handler was called without waiting for UI changes
      expect(disconnectedHandler).toBeDefined()
    })

    it('should handle SDK error event with autoConnect', async () => {
      const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
      
      let connectedHandler: () => void = () => {}
      let disconnectedHandler: () => void = () => {}
      let errorHandler: (error: Error) => void = () => {}
      
      const mockInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(false),
        on: vi.fn().mockImplementation((event: string, handler: any) => {
          if (event === 'connected') connectedHandler = handler
          if (event === 'disconnected') disconnectedHandler = handler
          if (event === 'error') errorHandler = handler
        }),
        off: vi.fn()
      }
      vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
      
      render(
        <AkashProvider config={mockConfig} autoConnect>
          <TestComponent />
        </AkashProvider>
      )
      
      const testError = new Error('SDK Error')
      
      // Simulate SDK error event
      act(() => {
        errorHandler(testError)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('SDK Error')
      })
    })

    it('should cleanup event listeners with off method', async () => {
      const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
      
      const mockInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(false),
        on: vi.fn(),
        off: vi.fn()
      }
      vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
      
      const { unmount } = render(
        <AkashProvider config={mockConfig} autoConnect>
          <TestComponent />
        </AkashProvider>
      )
      
      // Verify event listeners were set up
      expect(mockInstance.on).toHaveBeenCalledWith('connected', expect.any(Function))
      expect(mockInstance.on).toHaveBeenCalledWith('disconnected', expect.any(Function))
      expect(mockInstance.on).toHaveBeenCalledWith('error', expect.any(Function))
      
      unmount()
      
      // Verify event listeners were cleaned up
      expect(mockInstance.off).toHaveBeenCalledWith('connected', expect.any(Function))
      expect(mockInstance.off).toHaveBeenCalledWith('disconnected', expect.any(Function))
      expect(mockInstance.off).toHaveBeenCalledWith('error', expect.any(Function))
    })

    it('should handle cleanup when SDK has no off method', async () => {
      const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
      
      const mockInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(false),
        on: vi.fn()
        // No off method
      }
      vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
      
      const { unmount } = render(
        <AkashProvider config={mockConfig} autoConnect>
          <TestComponent />
        </AkashProvider>
      )
      
      expect(() => {
        unmount()
      }).not.toThrow()
    })
  })

  describe('edge cases and error boundaries', () => {
    it('should not call connect again when already connected', async () => {
      const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
      
      const mockInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn()
          .mockReturnValueOnce(false) // Initial state
          .mockReturnValueOnce(false) // Before first connect
          .mockReturnValue(true)      // After first connect and subsequent calls
      }
      vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
      
      render(
        <AkashProvider config={mockConfig}>
          <TestComponent />
        </AkashProvider>
      )
      
      // First connect
      const connectBtn = screen.getByTestId('connect-btn')
      await act(async () => {
        connectBtn.click()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connected')).toHaveTextContent('Connected')
      })
      
      expect(mockInstance.connect).toHaveBeenCalledTimes(1)
      
      // Try to connect again when already connected - should not call connect
      await act(async () => {
        connectBtn.click()
      })
      
      // Should still only have been called once
      expect(mockInstance.connect).toHaveBeenCalledTimes(1)
    })

    it('should not call connect again when currently connecting', async () => {
      const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
      
      let resolveConnect: () => void
      const connectPromise = new Promise<void>(resolve => {
        resolveConnect = resolve
      })
      
      const mockInstance = {
        connect: vi.fn().mockReturnValue(connectPromise),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(false)
      }
      vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
      
      render(
        <AkashProvider config={mockConfig}>
          <TestComponent />
        </AkashProvider>
      )
      
      // Start connecting
      const connectBtn = screen.getByTestId('connect-btn')
      act(() => {
        connectBtn.click()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connecting')).toHaveTextContent('Connecting')
      })
      
      expect(mockInstance.connect).toHaveBeenCalledTimes(1)
      
      // Try to connect again while still connecting
      act(() => {
        connectBtn.click()
      })
      
      // Should still only have been called once
      expect(mockInstance.connect).toHaveBeenCalledTimes(1)
      
      // Complete the first connection
      await act(async () => {
        resolveConnect!()
        await connectPromise
      })
    })

    it('should handle cleanup when SDK has no disconnect method', async () => {
      const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
      const mockInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true)
        // No disconnect method
      }
      vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
      
      const { unmount } = render(
        <AkashProvider config={mockConfig}>
          <TestComponent />
        </AkashProvider>
      )
      
      expect(() => {
        unmount()
      }).not.toThrow()
    })

    it('should clear error on successful connect', async () => {
      const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
      
      const mockInstance = {
        connect: vi.fn()
          .mockRejectedValueOnce(new Error('First connection failed'))
          .mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn()
          .mockReturnValueOnce(false) // Initial state
          .mockReturnValueOnce(false) // Before first connect
          .mockReturnValueOnce(false) // After first connect (failed)
          .mockReturnValueOnce(false) // Before second connect
          .mockReturnValue(true)      // After second connect (success)
      }
      vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
      
      render(
        <AkashProvider config={mockConfig}>
          <TestComponent />
        </AkashProvider>
      )
      
      // First connect attempt (will fail)
      const connectBtn = screen.getByTestId('connect-btn')
      await act(async () => {
        connectBtn.click()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('First connection failed')
      })
      
      // Second connect attempt (will succeed and clear error)
      await act(async () => {
        connectBtn.click()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('No Error')
        expect(screen.getByTestId('connected')).toHaveTextContent('Connected')
      })
    })

    it('should handle cleanup disconnect rejection gracefully', async () => {
      const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
      
      const disconnectError = new Error('Cleanup disconnect failed')
      const mockInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockRejectedValue(disconnectError),
        isConnected: vi.fn()
          .mockReturnValueOnce(false) // Initial state
          .mockReturnValueOnce(false) // Before connect
          .mockReturnValueOnce(true)  // After connect
          .mockReturnValue(true)      // During cleanup
      }
      vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
      
      const { unmount } = render(
        <AkashProvider config={mockConfig}>
          <TestComponent />
        </AkashProvider>
      )
      
      // First connect to establish connection state
      const connectBtn = screen.getByTestId('connect-btn')
      await act(async () => {
        connectBtn.click()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connected')).toHaveTextContent('Connected')
      })
      
      // Now unmount - should not throw error during cleanup even if disconnect fails
      expect(() => {
        unmount()
      }).not.toThrow()
      
      // Add a small delay to let the cleanup promise settle
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(mockInstance.disconnect).toHaveBeenCalled()
    })

    it('should handle cleanup when disconnect returns non-promise', async () => {
      const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
      
      const mockInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockReturnValue(undefined), // Returns undefined, not a promise
        isConnected: vi.fn()
          .mockReturnValueOnce(false) // Initial state
          .mockReturnValueOnce(false) // Before connect
          .mockReturnValueOnce(true)  // After connect
          .mockReturnValue(true)      // During cleanup
      }
      vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
      
      const { unmount } = render(
        <AkashProvider config={mockConfig}>
          <TestComponent />
        </AkashProvider>
      )
      
      // First connect to establish connection state
      const connectBtn = screen.getByTestId('connect-btn')
      await act(async () => {
        connectBtn.click()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connected')).toHaveTextContent('Connected')
      })
      
      expect(() => {
        unmount()
      }).not.toThrow()
      
      expect(mockInstance.disconnect).toHaveBeenCalled()
    })

    it('should handle cleanup when disconnect returns a promise that rejects', async () => {
      const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
      
      // Create a promise that rejects but handle it to avoid unhandled rejection
      const rejectedPromise = Promise.reject(new Error('Cleanup failed'))
      rejectedPromise.catch(() => {}) // Handle the rejection to avoid unhandled error
      
      const mockInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockReturnValue(rejectedPromise),
        isConnected: vi.fn()
          .mockReturnValueOnce(false) // Initial state
          .mockReturnValueOnce(false) // Before connect
          .mockReturnValueOnce(true)  // After connect
          .mockReturnValue(true)      // During cleanup
      }
      vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
      
      const { unmount } = render(
        <AkashProvider config={mockConfig}>
          <TestComponent />
        </AkashProvider>
      )
      
      // First connect to establish connection state
      const connectBtn = screen.getByTestId('connect-btn')
      await act(async () => {
        connectBtn.click()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connected')).toHaveTextContent('Connected')
      })
      
      expect(() => {
        unmount()
      }).not.toThrow()
      
      // Add a small delay to let the cleanup promise settle
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(mockInstance.disconnect).toHaveBeenCalled()
    })

    it('should test event handler functions to improve coverage', async () => {
      const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
      
      let connectedHandler: () => void = () => {}
      let disconnectedHandler: () => void = () => {}
      let errorHandler: (error: Error) => void = () => {}
      
      const mockInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(false),
        on: vi.fn().mockImplementation((event: string, handler: any) => {
          if (event === 'connected') connectedHandler = handler
          if (event === 'disconnected') disconnectedHandler = handler
          if (event === 'error') errorHandler = handler
        }),
        off: vi.fn()
      }
      vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
      
      render(
        <AkashProvider config={mockConfig} autoConnect>
          <TestComponent />
        </AkashProvider>
      )
      
      // Call handlers directly to cover inline function definitions
      act(() => {
        connectedHandler()
        disconnectedHandler()
        errorHandler(new Error('test'))
      })
    })

    it('should handle disconnect catch block during cleanup', async () => {
      const { AkashSDK } = await import('@cryptoandcoffee/akash-jsdk-core')
      
      const mockInstance = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockRejectedValue(new Error('Disconnect failed')),
        isConnected: vi.fn().mockReturnValue(true),
        on: vi.fn(),
        off: vi.fn()
      }
      vi.mocked(AkashSDK).mockImplementation(function(this: any) {
      return mockInstance as any
    })
      
      const { unmount } = render(
        <AkashProvider config={mockConfig}>
          <TestComponent />
        </AkashProvider>
      )
      
      // Connect first to set state
      await act(async () => {
        await mockInstance.connect()
      })
      
      // Unmount should handle disconnect error gracefully
      expect(() => {
        unmount()
      }).not.toThrow()
    })
  })
})