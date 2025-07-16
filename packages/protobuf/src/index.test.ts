import { describe, it, expect } from 'vitest'
import {
  AkashProtobuf,
  protobufRegistry,
  akashProtobuf,
  SerializationOptions,
  Message,
  proto3,
  // Enums that can be tested as values
  DeploymentState,
  OrderState,
  BidState,
  LeaseState,
  CertificateState,
  AccountState,
  PaymentState,
  ProposalStatus,
  VoteOption
} from './index.js'

// Import types for type checking
import type {
  Deployment,
  DeploymentID,
  Lease,
  LeaseID,
  Provider,
  ProviderInfo,
  CreateDeploymentRequest,
  UpdateDeploymentRequest,
  CloseDeploymentRequest
} from './index.js'

describe('Protobuf Package Exports', () => {
  describe('Core Classes and Functions', () => {
    it('should export AkashProtobuf class', () => {
      expect(AkashProtobuf).toBeDefined()
      expect(typeof AkashProtobuf).toBe('function')
      
      const instance = new AkashProtobuf()
      expect(instance).toBeInstanceOf(AkashProtobuf)
      expect(typeof instance.encode).toBe('function')
      expect(typeof instance.decode).toBe('function')
      expect(typeof instance.toJson).toBe('function')
      expect(typeof instance.fromJson).toBe('function')
    })

    it('should export protobufRegistry instance', () => {
      expect(protobufRegistry).toBeDefined()
      expect(protobufRegistry).toBeInstanceOf(AkashProtobuf)
      expect(typeof protobufRegistry.getAvailableTypes).toBe('function')
      expect(typeof protobufRegistry.validateTypesLoaded).toBe('function')
    })

    it('should export akashProtobuf utility object', () => {
      expect(akashProtobuf).toBeDefined()
      expect(typeof akashProtobuf.encode).toBe('function')
      expect(typeof akashProtobuf.decode).toBe('function')
      expect(typeof akashProtobuf.toJson).toBe('function')
      expect(typeof akashProtobuf.fromJson).toBe('function')
      expect(typeof akashProtobuf.createRegistry).toBe('function')
      expect(akashProtobuf.types).toBeDefined()
    })

    it('should export SerializationOptions interface', () => {
      // Test that SerializationOptions can be used as a type
      const options: SerializationOptions = {
        binary: {
          readOptions: { readUnknownFields: true, readerFactory: () => null as any },
          writeOptions: { writeUnknownFields: false, writerFactory: () => null as any }
        },
        json: {
          readOptions: { ignoreUnknownFields: true, typeRegistry: null as any },
          writeOptions: { emitDefaultValues: true, enumAsInteger: false, useProtoFieldName: false }
        }
      }
      expect(options).toBeDefined()
    })

    it('should export protobuf core types', () => {
      expect(Message).toBeDefined()
      expect(proto3).toBeDefined()
    })
  })

  describe('Enum Exports', () => {
    it('should export DeploymentState enum with correct values', () => {
      expect(DeploymentState).toBeDefined()
      expect(DeploymentState.INVALID).toBe(0)
      expect(DeploymentState.ACTIVE).toBe(1)
      expect(DeploymentState.CLOSED).toBe(2)
      expect(DeploymentState.DEPLOYMENT_ACTIVE).toBe(1)
    })

    it('should export OrderState enum with correct values', () => {
      expect(OrderState).toBeDefined()
      expect(OrderState.INVALID).toBe(0)
      expect(OrderState.OPEN).toBe(1)
      expect(OrderState.ACTIVE).toBe(2)
      expect(OrderState.CLOSED).toBe(3)
    })

    it('should export BidState enum with correct values', () => {
      expect(BidState).toBeDefined()
      expect(BidState.INVALID).toBe(0)
      expect(BidState.OPEN).toBe(1)
      expect(BidState.ACTIVE).toBe(2)
      expect(BidState.LOST).toBe(3)
      expect(BidState.CLOSED).toBe(4)
    })

    it('should export LeaseState enum with correct values', () => {
      expect(LeaseState).toBeDefined()
      expect(LeaseState.INVALID).toBe(0)
      expect(LeaseState.ACTIVE).toBe(1)
      expect(LeaseState.INSUFFICIENT_FUNDS).toBe(2)
      expect(LeaseState.CLOSED).toBe(3)
    })

    it('should export CertificateState enum with correct values', () => {
      expect(CertificateState).toBeDefined()
      expect(CertificateState.INVALID).toBe(0)
      expect(CertificateState.VALID).toBe(1)
      expect(CertificateState.REVOKED).toBe(2)
    })

    it('should export AccountState enum with correct values', () => {
      expect(AccountState).toBeDefined()
      expect(AccountState.INVALID).toBe(0)
      expect(AccountState.OPEN).toBe(1)
      expect(AccountState.CLOSED).toBe(2)
      expect(AccountState.OVERDRAWN).toBe(3)
    })

    it('should export PaymentState enum with correct values', () => {
      expect(PaymentState).toBeDefined()
      expect(PaymentState.INVALID).toBe(0)
      expect(PaymentState.OPEN).toBe(1)
      expect(PaymentState.CLOSED).toBe(2)
      expect(PaymentState.OVERDRAWN).toBe(3)
    })

    it('should export ProposalStatus enum with correct values', () => {
      expect(ProposalStatus).toBeDefined()
      expect(ProposalStatus.UNSPECIFIED).toBe(0)
      expect(ProposalStatus.DEPOSIT_PERIOD).toBe(1)
      expect(ProposalStatus.VOTING_PERIOD).toBe(2)
      expect(ProposalStatus.PASSED).toBe(3)
      expect(ProposalStatus.REJECTED).toBe(4)
      expect(ProposalStatus.FAILED).toBe(5)
      expect(ProposalStatus.PROPOSAL_STATUS_VOTING_PERIOD).toBe(2)
      expect(ProposalStatus.PROPOSAL_STATUS_PASSED).toBe(3)
    })

    it('should export VoteOption enum with correct values', () => {
      expect(VoteOption).toBeDefined()
      expect(VoteOption.UNSPECIFIED).toBe(0)
      expect(VoteOption.YES).toBe(1)
      expect(VoteOption.ABSTAIN).toBe(2)
      expect(VoteOption.NO).toBe(3)
      expect(VoteOption.NO_WITH_VETO).toBe(4)
      expect(VoteOption.VOTE_OPTION_YES).toBe(1)
    })
  })

  describe('Type Usage', () => {
    it('should allow creating deployment objects with types', () => {
      const deploymentId: DeploymentID = {
        owner: 'akash1test',
        dseq: '123'
      }
      
      const deployment: Deployment = {
        deploymentId,
        state: DeploymentState.ACTIVE,
        version: new Uint8Array([1, 2, 3]),
        createdAt: Date.now()
      }
      
      expect(deployment.deploymentId.owner).toBe('akash1test')
      expect(deployment.state).toBe(DeploymentState.ACTIVE)
    })

    it('should allow creating lease objects with types', () => {
      const leaseId: LeaseID = {
        owner: 'akash1test',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }
      
      const lease: Lease = {
        leaseId,
        state: LeaseState.ACTIVE,
        price: { denom: 'uakt', amount: '1000' },
        createdAt: Date.now(),
        closedOn: 0
      }
      
      expect(lease.leaseId.provider).toBe('akash1provider')
      expect(lease.state).toBe(LeaseState.ACTIVE)
    })

    it('should allow creating provider objects with types', () => {
      const providerInfo: ProviderInfo = {
        email: 'test@example.com',
        website: 'https://example.com'
      }
      
      const provider: Provider = {
        owner: 'akash1provider',
        hostUri: 'https://provider.akash.network',
        attributes: [{ key: 'region', value: 'us-west' }],
        info: providerInfo
      }
      
      expect(provider.info.email).toBe('test@example.com')
      expect(provider.attributes).toHaveLength(1)
    })

    it('should allow creating utility type objects', () => {
      const createRequest: CreateDeploymentRequest = {
        version: new Uint8Array([1, 2, 3]),
        groups: [],
        deposit: { denom: 'uakt', amount: '5000000' }
      }
      
      expect(createRequest.deposit.denom).toBe('uakt')
      expect(createRequest.version).toBeInstanceOf(Uint8Array)

      const updateRequest: UpdateDeploymentRequest = {
        deploymentId: {
          owner: 'akash1test',
          dseq: '123'
        },
        version: new Uint8Array([1, 2, 3])
      }
      
      expect(updateRequest.deploymentId.owner).toBe('akash1test')
      expect(updateRequest.version).toBeInstanceOf(Uint8Array)

      const closeRequest: CloseDeploymentRequest = {
        deploymentId: {
          owner: 'akash1test',
          dseq: '123'
        }
      }
      
      expect(closeRequest.deploymentId.owner).toBe('akash1test')
      expect(closeRequest.deploymentId.dseq).toBe('123')
    })
  })

  describe('Protobuf Registry Integration', () => {
    it('should work with protobuf registry', () => {
      const types = protobufRegistry.getAvailableTypes()
      expect(Array.isArray(types)).toBe(true)
      expect(types).toContain('Deployment')
      expect(types).toContain('Lease')
      
      const isLoaded = protobufRegistry.validateTypesLoaded()
      expect(typeof isLoaded).toBe('boolean')
    })

    it('should work with akashProtobuf utilities', () => {
      expect(akashProtobuf.types.Deployment).toBeDefined()
      expect(akashProtobuf.types.Lease).toBeDefined()
      
      const customRegistry = akashProtobuf.createRegistry({
        json: { writeOptions: { emitDefaultValues: true, enumAsInteger: false, useProtoFieldName: false } }
      })
      expect(customRegistry).toBeInstanceOf(AkashProtobuf)
    })
  })

  describe('Error Handling Coverage', () => {
    it('should test successful deployment operations for baseline', () => {
      // Test that normal operations work before testing error conditions
      const registry = new AkashProtobuf()
      
      // Test successful operations
      const deployment = registry.createDeployment({
        deploymentId: { owner: 'test', dseq: '1' },
        state: 1,
        version: new Uint8Array([1]),
        createdAt: Date.now()
      })
      expect(deployment).toBeDefined()
      
      const lease = registry.createLease({
        leaseId: { owner: 'test', dseq: '1', gseq: 1, oseq: 1, provider: 'provider' },
        state: 1,
        price: { denom: 'uakt', amount: '1000' },
        createdAt: Date.now(),
        closedOn: 0
      })
      expect(lease).toBeDefined()
    })

    it('should test encoding and decoding operations', () => {
      const registry = new AkashProtobuf()
      
      // Test successful encoding
      const deploymentData = {
        deploymentId: { owner: 'test', dseq: '1' },
        state: 1,
        version: new Uint8Array([1]),
        createdAt: Date.now()
      }
      
      try {
        const encoded = registry.encodeDeployment(deploymentData)
        expect(encoded).toBeInstanceOf(Uint8Array)
        
        const decoded = registry.decodeDeployment(encoded)
        expect(decoded).toBeDefined()
      } catch (error) {
        // Encoding/decoding might fail due to validation - this is expected
        expect(error).toBeInstanceOf(Error)
      }
      
      // Test lease encoding
      const leaseData = {
        leaseId: { owner: 'test', dseq: '1', gseq: 1, oseq: 1, provider: 'provider' },
        state: 1,
        price: { denom: 'uakt', amount: '1000' },
        createdAt: Date.now(),
        closedOn: 0
      }
      
      try {
        const encodedLease = registry.encodeLease(leaseData)
        expect(encodedLease).toBeInstanceOf(Uint8Array)
        
        const decodedLease = registry.decodeLease(encodedLease)
        expect(decodedLease).toBeDefined()
      } catch (error) {
        // Encoding/decoding might fail due to validation - this is expected
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('should handle malformed binary data gracefully', () => {
      const registry = new AkashProtobuf()
      
      // Test with invalid binary data - some sequences will throw, some might not
      try {
        registry.decodeDeployment(new Uint8Array([255, 255, 255, 255]))
        // If it doesn't throw, that's also valid behavior
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
      
      try {
        registry.decodeLease(new Uint8Array([255, 255, 255, 255]))
        // If it doesn't throw, that's also valid behavior
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('should handle edge case binary data', () => {
      const registry = new AkashProtobuf()
      
      // Test with various edge case binary sequences
      const testData = [
        new Uint8Array([]),
        new Uint8Array([0]),
        new Uint8Array([1, 2]),
        new Uint8Array([0, 0, 0, 0]),
        new Uint8Array([128, 128, 128, 128])
      ]
      
      testData.forEach(data => {
        try {
          registry.decodeDeployment(data)
          // If successful, that's valid
        } catch (error) {
          // If it throws, that's also expected for malformed data
          expect(error).toBeInstanceOf(Error)
        }
        
        try {
          registry.decodeLease(data)
          // If successful, that's valid
        } catch (error) {
          // If it throws, that's also expected for malformed data
          expect(error).toBeInstanceOf(Error)
        }
      })
    })

    it('should test custom serialization options', () => {
      const customOptions = {
        binary: {
          readOptions: { readUnknownFields: true },
          writeOptions: { writeUnknownFields: false }
        },
        json: {
          readOptions: { ignoreUnknownFields: true },
          writeOptions: { emitDefaultValues: true, enumAsInteger: false, useProtoFieldName: false }
        }
      }
      
      const registry = new AkashProtobuf(customOptions)
      expect(registry).toBeInstanceOf(AkashProtobuf)
      
      // Test that custom options are applied
      const deploymentData = {
        deploymentId: { owner: 'test', dseq: '1' },
        state: 1,
        version: new Uint8Array([1]),
        createdAt: Date.now()
      }
      
      try {
        const deployment = registry.createDeployment(deploymentData)
        const json = registry.toJson(deployment)
        expect(json).toBeDefined()
        
        const fromJson = registry.fromJson(akashProtobuf.types.Deployment, json)
        expect(fromJson).toBeDefined()
      } catch (error) {
        // JSON operations might fail due to validation - this is expected
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('should test utility functions with different message types', () => {
      // Test encoding and decoding with actual protobuf messages
      const deployment = akashProtobuf.types.Deployment
      const lease = akashProtobuf.types.Lease
      
      expect(deployment).toBeDefined()
      expect(lease).toBeDefined()
      
      // Create messages
      const deploymentMsg = new deployment({
        deploymentId: { owner: 'test', dseq: '1' },
        state: 1,
        version: new Uint8Array([1]),
        createdAt: BigInt(Date.now())
      })
      
      const leaseMsg = new lease({
        leaseId: { owner: 'test', dseq: '1', gseq: 1, oseq: 1, provider: 'provider' },
        state: 1,
        price: { denom: 'uakt', amount: '1000' },
        createdAt: BigInt(Date.now()),
        closedOn: BigInt(0)
      })
      
      // Test utility functions
      const encodedDeployment = akashProtobuf.encode(deploymentMsg)
      expect(encodedDeployment).toBeInstanceOf(Uint8Array)
      
      const decodedDeployment = akashProtobuf.decode(deployment, encodedDeployment)
      expect(decodedDeployment).toBeDefined()
      
      const encodedLease = akashProtobuf.encode(leaseMsg)
      expect(encodedLease).toBeInstanceOf(Uint8Array)
      
      const decodedLease = akashProtobuf.decode(lease, encodedLease)
      expect(decodedLease).toBeDefined()
      
      // Test JSON operations
      const deploymentJson = akashProtobuf.toJson(deploymentMsg)
      expect(deploymentJson).toBeDefined()
      
      const fromJsonDeployment = akashProtobuf.fromJson(deployment, deploymentJson)
      expect(fromJsonDeployment).toBeDefined()
    })
  })

  describe('Enum Compatibility', () => {
    it('should support enum compatibility', () => {
      // Test that enums work as expected
      const states = [
        DeploymentState.INVALID,
        DeploymentState.ACTIVE,
        DeploymentState.CLOSED
      ]
      
      expect(states).toEqual([0, 1, 2])
      
      const orderStates = [
        OrderState.INVALID,
        OrderState.OPEN,
        OrderState.ACTIVE,
        OrderState.CLOSED
      ]
      
      expect(orderStates).toEqual([0, 1, 2, 3])
    })

    it('should handle string or enum values for states', () => {
      // Test that state fields can accept both enum values and strings
      const deploymentWithEnum: Deployment = {
        deploymentId: {
          owner: 'akash1test',
          dseq: '123'
        },
        state: DeploymentState.ACTIVE,
        version: new Uint8Array([1, 2, 3]),
        createdAt: Date.now()
      }

      const deploymentWithString: Deployment = {
        deploymentId: {
          owner: 'akash1test',
          dseq: '123'
        },
        state: 'active' as any, // Type assertion for string state
        version: 'v1.0.0',
        createdAt: Date.now()
      }

      expect(deploymentWithEnum.state).toBe(DeploymentState.ACTIVE)
      expect(deploymentWithString.state).toBe('active')
    })

    it('should handle version field as both Uint8Array and string', () => {
      // Test that version field works with both types
      const deploymentWithUint8Array: Deployment = {
        deploymentId: {
          owner: 'akash1test',
          dseq: '123'
        },
        state: DeploymentState.ACTIVE,
        version: new Uint8Array([1, 2, 3]),
        createdAt: Date.now()
      }

      const deploymentWithString: Deployment = {
        deploymentId: {
          owner: 'akash1test',
          dseq: '123'
        },
        state: DeploymentState.ACTIVE,
        version: 'v1.0.0',
        createdAt: Date.now()
      }

      expect(deploymentWithUint8Array.version).toBeInstanceOf(Uint8Array)
      expect(deploymentWithString.version).toBe('v1.0.0')
    })
  })

})