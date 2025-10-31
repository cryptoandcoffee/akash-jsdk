import { describe, it, expect } from 'vitest'
import {
  createValidationError,
  createNetworkError,
  wrapNetworkError,
  wrapValidationError
} from './error-helpers'
import { ValidationError, NetworkError } from '../errors'

describe('Error Helpers', () => {
  describe('createValidationError', () => {
    it('should create validation error with message', () => {
      const error = createValidationError('Test error')

      expect(error).toBeInstanceOf(ValidationError)
      expect(error.message).toBe('Test error')
    })

    it('should attach context to error', () => {
      const context = { field: 'test', value: 123 }
      const error = createValidationError('Test error', context)

      expect(error).toBeInstanceOf(ValidationError)
      expect((error as any).field).toBe('test')
      expect((error as any).value).toBe(123)
    })

    it('should work without context', () => {
      const error = createValidationError('Test error')

      expect(error).toBeInstanceOf(ValidationError)
      expect(error.message).toBe('Test error')
    })
  })

  describe('createNetworkError', () => {
    it('should create network error with message', () => {
      const error = createNetworkError('Network failed')

      expect(error).toBeInstanceOf(NetworkError)
      expect(error.message).toBe('Network failed')
    })

    it('should attach original error as cause', () => {
      const originalError = new Error('Original error')
      const error = createNetworkError('Network failed', originalError)

      expect(error).toBeInstanceOf(NetworkError)
      expect(error.cause).toBe(originalError)
    })

    it('should attach context to error', () => {
      const context = { endpoint: 'http://test.com', timeout: 5000 }
      const error = createNetworkError('Network failed', undefined, context)

      expect(error).toBeInstanceOf(NetworkError)
      expect((error as any).endpoint).toBe('http://test.com')
      expect((error as any).timeout).toBe(5000)
    })

    it('should work with all parameters', () => {
      const originalError = new Error('Original')
      const context = { code: 500 }
      const error = createNetworkError('Network failed', originalError, context)

      expect(error).toBeInstanceOf(NetworkError)
      expect(error.cause).toBe(originalError)
      expect((error as any).code).toBe(500)
    })
  })

  describe('wrapNetworkError', () => {
    it('should execute successful operation', async () => {
      const result = await wrapNetworkError(
        async () => 'success',
        'Operation failed'
      )

      expect(result).toBe('success')
    })

    it('should wrap thrown error in NetworkError', async () => {
      const operation = async () => {
        throw new Error('Original error')
      }

      await expect(
        wrapNetworkError(operation, 'Operation failed')
      ).rejects.toThrow(NetworkError)

      await expect(
        wrapNetworkError(operation, 'Operation failed')
      ).rejects.toThrow('Operation failed')
    })

    it('should attach context to wrapped error', async () => {
      const operation = async () => {
        throw new Error('Original error')
      }

      try {
        await wrapNetworkError(operation, 'Operation failed', { endpoint: 'test' })
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError)
        expect((error as any).endpoint).toBe('test')
      }
    })
  })

  describe('wrapValidationError', () => {
    it('should execute successful operation', () => {
      const result = wrapValidationError(
        () => 'success',
        'Validation failed'
      )

      expect(result).toBe('success')
    })

    it('should wrap thrown error in ValidationError', () => {
      const operation = () => {
        throw new Error('Original error')
      }

      expect(() =>
        wrapValidationError(operation, 'Validation failed')
      ).toThrow(ValidationError)

      expect(() =>
        wrapValidationError(operation, 'Validation failed')
      ).toThrow('Validation failed')
    })

    it('should attach context including original error', () => {
      const originalError = new Error('Original error')
      const operation = () => {
        throw originalError
      }

      try {
        wrapValidationError(operation, 'Validation failed', { field: 'test' })
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as any).field).toBe('test')
        expect((error as any).originalError).toBe(originalError)
      }
    })
  })
})
