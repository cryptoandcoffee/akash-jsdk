import { describe, it, expect } from 'vitest'
import {
  SDKError,
  AkashSDKError,
  ValidationError,
  NetworkError,
  ProviderError,
  DeploymentError,
  ConfigurationError,
  CacheError,
  EventStreamError
} from './index'

describe('Error classes', () => {
  describe('SDKError (new base class)', () => {
    it('should create error with message', () => {
      const error = new SDKError('Test error')
      expect(error.message).toBe('Test error')
      expect(error.name).toBe('SDKError')
      expect(error instanceof Error).toBe(true)
    })

    it('should create error with context', () => {
      const context = { operation: 'test', key: 'value' }
      const error = new SDKError('Test error', context)
      expect(error.message).toBe('Test error')
      expect(error.context).toEqual(context)
    })

    it('should create error with cause', () => {
      const cause = new Error('Original error')
      const error = new SDKError('Wrapper error', undefined, cause)
      expect(error.message).toBe('Wrapper error')
      expect(error.cause).toBe(cause)
    })

    it('should include context in toString', () => {
      const context = { operation: 'test', key: 'value' }
      const error = new SDKError('Test error', context)
      const str = error.toString()
      expect(str).toContain('SDKError: Test error')
      expect(str).toContain('Context:')
      expect(str).toContain('"operation": "test"')
    })

    it('should include cause in toString', () => {
      const cause = new Error('Original error')
      const error = new SDKError('Wrapper error', undefined, cause)
      const str = error.toString()
      expect(str).toContain('Caused by: Original error')
    })
  })

  describe('AkashSDKError (legacy)', () => {
    it('should create error with message and code', () => {
      const error = new AkashSDKError('Test error', 'TEST_CODE')

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.name).toBe('AkashSDKError')
      expect(error instanceof Error).toBe(true)
    })

    it('should create error with details', () => {
      const details = { key: 'value', number: 123 }
      const error = new AkashSDKError('Test error', 'TEST_CODE', details)

      expect(error.details).toEqual(details)
    })
  })

  describe('ValidationError', () => {
    it('should create validation error with new API', () => {
      const error = new ValidationError('Invalid input', { field: 'email' })

      expect(error.message).toBe('Invalid input')
      expect(error.name).toBe('ValidationError')
      expect(error.context).toEqual({ field: 'email' })
      expect(error instanceof SDKError).toBe(true)
    })

    it('should create validation error with cause', () => {
      const cause = new Error('Underlying issue')
      const error = new ValidationError('Invalid input', { field: 'email' }, cause)

      expect(error.cause).toBe(cause)
    })
  })

  describe('NetworkError', () => {
    it('should create network error with new API', () => {
      const error = new NetworkError('Connection failed', { endpoint: 'http://localhost' })

      expect(error.message).toBe('Connection failed')
      expect(error.name).toBe('NetworkError')
      expect(error.context).toEqual({ endpoint: 'http://localhost' })
      expect(error instanceof SDKError).toBe(true)
    })
  })

  describe('ConfigurationError', () => {
    it('should create configuration error', () => {
      const error = new ConfigurationError('Invalid config', { setting: 'timeout' })

      expect(error.message).toBe('Invalid config')
      expect(error.name).toBe('ConfigurationError')
      expect(error.context).toEqual({ setting: 'timeout' })
    })
  })

  describe('CacheError', () => {
    it('should create cache error with context', () => {
      const error = new CacheError('Cache failed', { key: 'user:123', operation: 'get' })

      expect(error.message).toBe('Cache failed')
      expect(error.name).toBe('CacheError')
      expect(error.context).toEqual({ key: 'user:123', operation: 'get' })
    })
  })

  describe('EventStreamError', () => {
    it('should create event stream error', () => {
      const error = new EventStreamError('Stream failed', { subscription: 'sub-123' })

      expect(error.message).toBe('Stream failed')
      expect(error.name).toBe('EventStreamError')
      expect(error.context).toEqual({ subscription: 'sub-123' })
    })
  })

  describe('Error chaining', () => {
    it('should chain errors with cause', () => {
      const dbError = new Error('Database error')
      const cacheError = new CacheError('Cache backend failed', { backend: 'redis' }, dbError)
      const appError = new SDKError('Operation failed', { operation: 'getUserData' }, cacheError)

      expect(appError.cause).toBe(cacheError)
      expect(cacheError.cause).toBe(dbError)

      const str = appError.toString()
      expect(str).toContain('Operation failed')
      expect(str).toContain('Cache backend failed')
    })
  })
})