import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AkashSDK } from './index'
import { ValidationError } from './errors'

// Mock isomorphic-ws
vi.mock('isomorphic-ws', () => ({
  default: class MockWebSocket {
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3
    readyState = 0
    onopen: ((event: any) => void) | null = null
    onclose: ((event: any) => void) | null = null
    onerror: ((event: any) => void) | null = null
    onmessage: ((event: any) => void) | null = null
    constructor(public url: string) {}
    send(data: string): void {}
    close(): void {}
  }
}))

// Mock global fetch
global.fetch = vi.fn()

// Mock the AkashProvider
vi.mock('./providers/akash', () => ({
  AkashProvider: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
    ensureConnected: vi.fn(),
    getClient: vi.fn().mockReturnValue({ searchTx: vi.fn().mockResolvedValue([]) }),
    config: {
      rpcEndpoint: 'https://rpc.akashedge.com:443',
      apiEndpoint: 'https://api.akashedge.com:443',
      chainId: 'akashnet-2'
    },
    getDeployments: vi.fn().mockResolvedValue([]),
    getDeployment: vi.fn().mockResolvedValue(undefined),
    getLeases: vi.fn().mockResolvedValue([]),
    getLeasesByDeployment: vi.fn().mockResolvedValue([]),
    getProviders: vi.fn().mockResolvedValue([]),
    createDeployment: vi.fn().mockResolvedValue('deployment-123'),
    closeDeployment: vi.fn().mockResolvedValue(undefined)
  }))
}))

describe('AkashSDK', () => {
  const validConfig = {
    rpcEndpoint: 'https://rpc.akashedge.com:443',
    chainId: 'akashnet-2'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create SDK with valid config', () => {
      expect(() => new AkashSDK(validConfig)).not.toThrow()
    })

    it('should throw ValidationError with invalid config', () => {
      const invalidConfig = {
        rpcEndpoint: '',
        chainId: 'akashnet-2'
      }
      
      expect(() => new AkashSDK(invalidConfig)).toThrow(ValidationError)
    })
  })

  describe('methods', () => {
    let sdk: AkashSDK

    beforeEach(() => {
      sdk = new AkashSDK(validConfig)
      vi.clearAllMocks()

      // Setup default fetch mock responses
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ deployments: [], leases: [], providers: [] })
      })
    })

    it('should have deployments methods', () => {
      expect(sdk.deployments).toBeDefined()
      expect(typeof sdk.deployments.list).toBe('function')
      expect(typeof sdk.deployments.get).toBe('function')
      expect(typeof sdk.deployments.create).toBe('function')
      expect(typeof sdk.deployments.close).toBe('function')
    })

    it('should call legacy deployment list method', async () => {
      // Mock fetch response for deployment list
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          deployments: [
            {
              deployment: {
                deploymentId: { owner: 'akash1owner', dseq: '123' },
                state: 'active',
                version: '1.0.0',
                createdAt: '2024-01-01T00:00:00Z'
              }
            }
          ]
        })
      })

      const result = await sdk.deployments.list('akash1owner')

      // Verify fetch was called with correct URL
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('akash/deployment/v1beta3/deployments/list?filters.owner=akash1owner')
      )

      // Verify result structure
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        deploymentId: { owner: 'akash1owner', dseq: '123' },
        state: 'active',
        version: '1.0.0',
        createdAt: '2024-01-01T00:00:00Z'
      })
    })

    it('should call legacy deployment get method', async () => {
      const params = { owner: 'akash1owner', dseq: '123' }

      // Mock fetch response for deployment get
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          deployment: {
            deploymentId: { owner: 'akash1owner', dseq: '123' },
            state: 'active',
            version: '1.0.0',
            createdAt: '2024-01-01T00:00:00Z'
          }
        })
      })

      const result = await sdk.deployments.get(params)

      // Verify fetch was called with correct URL
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('akash/deployment/v1beta3/deployments/info?id.owner=akash1owner&id.dseq=123')
      )

      // Verify result structure
      expect(result).toEqual({
        deploymentId: { owner: 'akash1owner', dseq: '123' },
        state: 'active',
        version: '1.0.0',
        createdAt: '2024-01-01T00:00:00Z'
      })
    })

    it('should call legacy deployment create method', async () => {
      const config = {
        sdl: `version: "2.0"
services:
  web:
    image: nginx
    expose:
      - port: 80
        as: 80
        to:
          - global: true
profiles:
  compute:
    web:
      resources:
        cpu:
          units: 0.5
        memory:
          size: 512Mi
        storage:
          - size: 1Gi
  placement:
    akash:
      pricing:
        web:
          denom: uakt
          amount: 1000
deployment:
  web:
    akash:
      profile: web
      count: 1`
      }

      // Create a mock wallet
      const mockWallet = {
        getAccounts: vi.fn().mockResolvedValue([
          { address: 'akash1mockaddress', pubkey: new Uint8Array(), algo: 'secp256k1' }
        ])
      }

      // Mock the SigningStargateClient
      const mockClient = {
        signAndBroadcast: vi.fn().mockResolvedValue({
          code: 0,
          transactionHash: 'ABC123',
          rawLog: 'success'
        })
      }

      // We need to mock the actual implementation since it requires a real wallet
      // For this test, we'll expect it to throw validation error if no wallet provided
      await expect(sdk.deployments.create(config)).rejects.toThrow('Wallet is required')

      // When wallet is provided, it should work (but we can't fully test without mocking cosmjs)
    })

    it('should call legacy deployment close method', async () => {
      const params = { owner: 'akash1owner', dseq: '123' }

      // The close method calls provider.getClient().searchTx()
      // We need to ensure the mock returns an empty array
      const mockSearchTx = vi.fn().mockResolvedValue([])
      const mockClient = { searchTx: mockSearchTx }
      sdk.provider.getClient = vi.fn().mockReturnValue(mockClient)

      const result = await sdk.deployments.close(params)

      // Verify getClient and searchTx were called
      expect(sdk.provider.getClient).toHaveBeenCalled()
      expect(mockSearchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'deployment' },
        { key: 'message.action', value: 'close-deployment' },
        { key: 'deployment.owner', value: 'akash1owner' },
        { key: 'deployment.dseq', value: '123' }
      ])

      expect(result).toBeUndefined()
    })

    it('should have leases methods', () => {
      expect(sdk.leases).toBeDefined()
      expect(typeof sdk.leases.list).toBe('function')
    })

    it('should call legacy lease methods with string parameter', async () => {
      const result = await sdk.leases.list('akash1owner')
      expect(sdk.provider.getLeases).toHaveBeenCalledWith('akash1owner')
      expect(result).toEqual([])
    })

    it('should call legacy lease methods with object parameter', async () => {
      const params = { owner: 'akash1owner', dseq: '123' }
      const result = await sdk.leases.list(params)
      expect(sdk.provider.getLeasesByDeployment).toHaveBeenCalledWith(params)
      expect(result).toEqual([])
    })

    it('should have providers methods', () => {
      expect(sdk.providers).toBeDefined()
      expect(typeof sdk.providers.list).toBe('function')
    })

    it('should call legacy providers list method', async () => {
      const result = await sdk.providers.list()
      expect(sdk.provider.getProviders).toHaveBeenCalledWith()
      expect(result).toEqual([])
    })

    it('should connect and disconnect', async () => {
      await expect(sdk.connect()).resolves.not.toThrow()
      await expect(sdk.disconnect()).resolves.not.toThrow()
    })

    it('should check connection status', () => {
      expect(typeof sdk.isConnected()).toBe('boolean')
      expect(sdk.isConnected()).toBe(true)
    })
  })
})