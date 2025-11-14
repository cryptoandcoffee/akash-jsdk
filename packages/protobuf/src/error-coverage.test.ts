import { describe, it, expect } from 'vitest'
import { AkashProtobuf } from './index.js'

/**
 * Error coverage tests for v2 API
 * In v2, serialization is not supported - all encode/decode methods throw errors
 */
describe('Error Coverage Tests - v2 API', () => {

  describe('v2 serialization error handling', () => {
    it('should throw errors for all encode/decode operations in v2', () => {
      const registry = new AkashProtobuf()

      // v2 doesn't support serialization - all these should throw
      expect(() => {
        registry.encodeDeployment({})
      }).toThrow('Serialization not supported in v2 type-only mode')

      expect(() => {
        registry.decodeDeployment(new Uint8Array([1, 2, 3]))
      }).toThrow('Deserialization not supported in v2 type-only mode')

      expect(() => {
        registry.encodeLease({})
      }).toThrow('Serialization not supported in v2 type-only mode')

      expect(() => {
        registry.decodeLease(new Uint8Array([1, 2, 3]))
      }).toThrow('Deserialization not supported in v2 type-only mode')
    })

    it('should handle createDeployment and createLease by returning data', () => {
      const registry = new AkashProtobuf()

      // In v2, these just return the data as-is
      const deploymentData = {
        deploymentId: { owner: 'test', dseq: '1' },
        state: 1,
        version: new Uint8Array([1]),
        createdAt: Date.now()
      }

      const deployment = registry.createDeployment(deploymentData)
      expect(deployment).toEqual(deploymentData)
      expect(deployment.deploymentId.owner).toBe('test')

      const leaseData = {
        leaseId: { owner: 'test', dseq: '1', gseq: 1, oseq: 1, provider: 'provider' },
        state: 1,
        price: { denom: 'uakt', amount: '1000' },
        createdAt: Date.now(),
        closedOn: 0
      }

      const lease = registry.createLease(leaseData)
      expect(lease).toEqual(leaseData)
      expect(lease.leaseId.provider).toBe('provider')
    })

    it('should test error messages with various data', () => {
      const registry = new AkashProtobuf()

      // Test with different data types - all should throw the same v2 error
      const testData = [
        new Uint8Array([]),
        new Uint8Array([255, 255, 255, 255]),
        new Uint8Array([1, 2, 3]),
        new Uint8Array([0, 0, 0, 0])
      ]

      testData.forEach(data => {
        expect(() => registry.decodeDeployment(data)).toThrow(
          'Deserialization not supported in v2 type-only mode'
        )
        expect(() => registry.decodeLease(data)).toThrow(
          'Deserialization not supported in v2 type-only mode'
        )
      })
    })

    it('should test encoding with various objects', () => {
      const registry = new AkashProtobuf()

      const testObjects = [
        {},
        { test: 'data' },
        { deploymentId: { owner: 'test' } },
        null as any
      ]

      testObjects.forEach(obj => {
        expect(() => registry.encodeDeployment(obj)).toThrow(
          'Serialization not supported in v2 type-only mode'
        )
        expect(() => registry.encodeLease(obj)).toThrow(
          'Serialization not supported in v2 type-only mode'
        )
      })
    })
  })
})