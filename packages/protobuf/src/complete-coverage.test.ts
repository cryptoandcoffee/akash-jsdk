import { describe, it, expect } from 'vitest'
import { AkashProtobuf } from './index.js'

describe('Complete Coverage Tests', () => {

  describe('Successful Operations Verification', () => {
    it('should verify normal protobuf operations work correctly', () => {
      const registry = new AkashProtobuf()

      // Test that normal operations work (v2 just returns the data)
      expect(() => {
        const deployment = registry.createDeployment({
          deploymentId: { owner: 'test', dseq: '1' },
          state: 1,
          version: new Uint8Array([1]),
          createdAt: Date.now()
        })
        expect(deployment).toBeDefined()
        expect(deployment.deploymentId.owner).toBe('test')
      }).not.toThrow()

      expect(() => {
        const lease = registry.createLease({
          leaseId: { owner: 'test', dseq: '1', gseq: 1, oseq: 1, provider: 'provider' },
          state: 1,
          price: { denom: 'uakt', amount: '1000' },
          createdAt: Date.now(),
          closedOn: 0
        })
        expect(lease).toBeDefined()
        expect(lease.leaseId.provider).toBe('provider')
      }).not.toThrow()

      // Test that getAvailableTypes returns empty array in v2
      const types = registry.getAvailableTypes()
      expect(types).toEqual([])

      // Test that validateTypesLoaded returns true
      expect(registry.validateTypesLoaded()).toBe(true)
    })

    it('should handle various serialization scenarios', () => {
      const registry = new AkashProtobuf()

      // Test encoding and decoding operations - v2 throws errors for serialization
      const deploymentData = {
        deploymentId: { owner: 'test', dseq: '1' },
        state: 1,
        version: new Uint8Array([1]),
        createdAt: Date.now()
      }

      // v2 doesn't support serialization
      expect(() => registry.encodeDeployment(deploymentData)).toThrow(
        'Serialization not supported in v2 type-only mode'
      )

      expect(() => registry.decodeDeployment(new Uint8Array([1, 2, 3]))).toThrow(
        'Deserialization not supported in v2 type-only mode'
      )
    })

    it('should test comprehensive error handling scenarios', () => {
      const registry = new AkashProtobuf()

      // Test with various malformed data to ensure robust error handling
      // v2 always throws the same error for deserialization
      const malformedData = [
        new Uint8Array([]),
        new Uint8Array([255, 255, 255, 255]),
        new Uint8Array([1, 2, 3]),
        new Uint8Array([0, 0, 0, 0])
      ]

      malformedData.forEach(data => {
        expect(() => registry.decodeDeployment(data)).toThrow(
          'Deserialization not supported in v2 type-only mode'
        )
        expect(() => registry.decodeLease(data)).toThrow(
          'Deserialization not supported in v2 type-only mode'
        )
      })
    })
  })
})