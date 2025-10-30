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

// Mock the AkashProvider
vi.mock('./providers/akash', () => ({
  AkashProvider: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
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
    })

    it('should have deployments methods', () => {
      expect(sdk.deployments).toBeDefined()
      expect(typeof sdk.deployments.list).toBe('function')
      expect(typeof sdk.deployments.get).toBe('function')
      expect(typeof sdk.deployments.create).toBe('function')
      expect(typeof sdk.deployments.close).toBe('function')
    })

    it('should call legacy deployment list method', async () => {
      const result = await sdk.deployments.list('akash1owner')
      expect(sdk.provider.getDeployments).toHaveBeenCalledWith('akash1owner')
      expect(result).toEqual([])
    })

    it('should call legacy deployment get method', async () => {
      const params = { owner: 'akash1owner', dseq: '123' }
      const result = await sdk.deployments.get(params)
      expect(sdk.provider.getDeployment).toHaveBeenCalledWith(params)
      expect(result).toEqual(undefined)
    })

    it('should call legacy deployment create method', async () => {
      const config = { yaml: 'test yaml' }
      const result = await sdk.deployments.create(config)
      expect(sdk.provider.createDeployment).toHaveBeenCalledWith(config)
      expect(result).toBe('deployment-123')
    })

    it('should call legacy deployment close method', async () => {
      const params = { owner: 'akash1owner', dseq: '123' }
      const result = await sdk.deployments.close(params)
      expect(sdk.provider.closeDeployment).toHaveBeenCalledWith(params)
      expect(result).toEqual(undefined)
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