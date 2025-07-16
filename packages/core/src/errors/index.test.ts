import { describe, it, expect } from 'vitest'
import { AkashSDKError, ValidationError, NetworkError, ProviderError, DeploymentError } from './index'

describe('Error classes', () => {
  describe('AkashSDKError', () => {
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
    it('should create validation error', () => {
      const error = new ValidationError('Invalid input')
      
      expect(error.message).toBe('Invalid input')
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.name).toBe('ValidationError')
      expect(error instanceof AkashSDKError).toBe(true)
    })

    it('should create validation error with details', () => {
      const details = { field: 'email', reason: 'invalid format' }
      const error = new ValidationError('Invalid input', details)
      
      expect(error.details).toEqual(details)
    })
  })

  describe('NetworkError', () => {
    it('should create network error', () => {
      const error = new NetworkError('Connection failed')
      
      expect(error.message).toBe('Connection failed')
      expect(error.code).toBe('NETWORK_ERROR')
      expect(error.name).toBe('NetworkError')
      expect(error instanceof AkashSDKError).toBe(true)
    })

    it('should create network error with details', () => {
      const details = { endpoint: 'http://localhost', statusCode: 500 }
      const error = new NetworkError('Connection failed', details)
      
      expect(error.details).toEqual(details)
    })
  })

  describe('ProviderError', () => {
    it('should create provider error', () => {
      const error = new ProviderError('Provider unavailable')
      
      expect(error.message).toBe('Provider unavailable')
      expect(error.code).toBe('PROVIDER_ERROR')
      expect(error.name).toBe('ProviderError')
      expect(error instanceof AkashSDKError).toBe(true)
    })

    it('should create provider error with details', () => {
      const details = { provider: 'akash1...', reason: 'offline' }
      const error = new ProviderError('Provider unavailable', details)
      
      expect(error.details).toEqual(details)
    })
  })

  describe('DeploymentError', () => {
    it('should create deployment error', () => {
      const error = new DeploymentError('Deployment failed')
      
      expect(error.message).toBe('Deployment failed')
      expect(error.code).toBe('DEPLOYMENT_ERROR')
      expect(error.name).toBe('DeploymentError')
      expect(error instanceof AkashSDKError).toBe(true)
    })

    it('should create deployment error with details', () => {
      const details = { deploymentId: 'dep123', reason: 'insufficient funds' }
      const error = new DeploymentError('Deployment failed', details)
      
      expect(error.details).toEqual(details)
    })
  })
})