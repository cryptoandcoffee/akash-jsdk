import { describe, it, expect } from 'vitest'
import type { 
  AkashConfig, 
  DeploymentConfig, 
  ProviderInfo, 
  Lease, 
  Deployment 
} from './index'

describe('Types', () => {
  describe('AkashConfig', () => {
    it('should define required properties', () => {
      const config: AkashConfig = {
        rpcEndpoint: 'https://rpc.akashedge.com:443',
        chainId: 'akashnet-2'
      }
      
      expect(config.rpcEndpoint).toBe('https://rpc.akashedge.com:443')
      expect(config.chainId).toBe('akashnet-2')
    })

    it('should support optional properties', () => {
      const config: AkashConfig = {
        rpcEndpoint: 'https://rpc.akashedge.com:443',
        chainId: 'akashnet-2',
        apiEndpoint: 'https://api.akashedge.com',
        gasPrice: '0.025uakt',
        gasAdjustment: 1.5,
        prefix: 'akash'
      }
      
      expect(config.apiEndpoint).toBe('https://api.akashedge.com')
      expect(config.gasPrice).toBe('0.025uakt')
      expect(config.gasAdjustment).toBe(1.5)
      expect(config.prefix).toBe('akash')
    })
  })

  describe('DeploymentConfig', () => {
    it('should define deployment configuration structure', () => {
      const deploymentConfig: DeploymentConfig = {
        image: 'nginx:latest',
        expose: [{
          port: 80,
          as: 80,
          proto: 'TCP',
          to: [{
            global: true
          }]
        }],
        resources: {
          cpu: {
            units: '0.1'
          },
          memory: {
            size: '512Mi'
          },
          storage: {
            size: '1Gi'
          }
        },
        count: 1
      }
      
      expect(deploymentConfig.image).toBe('nginx:latest')
      expect(deploymentConfig.expose).toHaveLength(1)
      expect(deploymentConfig.expose[0].port).toBe(80)
      expect(deploymentConfig.expose[0].proto).toBe('TCP')
      expect(deploymentConfig.resources.cpu.units).toBe('0.1')
      expect(deploymentConfig.resources.memory.size).toBe('512Mi')
      expect(deploymentConfig.resources.storage.size).toBe('1Gi')
      expect(deploymentConfig.count).toBe(1)
    })

    it('should support UDP protocol', () => {
      const deploymentConfig: DeploymentConfig = {
        image: 'app:latest',
        expose: [{
          port: 53,
          as: 53,
          proto: 'UDP',
          to: [{
            global: false
          }]
        }],
        resources: {
          cpu: { units: '0.5' },
          memory: { size: '1Gi' },
          storage: { size: '2Gi' }
        },
        count: 2
      }
      
      expect(deploymentConfig.expose[0].proto).toBe('UDP')
      expect(deploymentConfig.expose[0].to[0].global).toBe(false)
      expect(deploymentConfig.count).toBe(2)
    })
  })

  describe('ProviderInfo', () => {
    it('should define provider information structure', () => {
      const provider: ProviderInfo = {
        owner: 'akash1provider123',
        hostUri: 'https://provider.akash.network',
        attributes: [
          { key: 'region', value: 'us-west' },
          { key: 'tier', value: 'premium' }
        ]
      }
      
      expect(provider.owner).toBe('akash1provider123')
      expect(provider.hostUri).toBe('https://provider.akash.network')
      expect(provider.attributes).toHaveLength(2)
      expect(provider.attributes[0].key).toBe('region')
      expect(provider.attributes[0].value).toBe('us-west')
      expect(provider.attributes[1].key).toBe('tier')
      expect(provider.attributes[1].value).toBe('premium')
    })

    it('should support empty attributes array', () => {
      const provider: ProviderInfo = {
        owner: 'akash1provider456',
        hostUri: 'https://provider2.akash.network',
        attributes: []
      }
      
      expect(provider.attributes).toHaveLength(0)
    })
  })

  describe('Lease', () => {
    it('should define lease structure with active state', () => {
      const lease: Lease = {
        id: {
          owner: 'akash1owner123',
          dseq: '12345',
          gseq: 1,
          oseq: 1,
          provider: 'akash1provider123'
        },
        state: 'active',
        price: {
          denom: 'uakt',
          amount: '1000'
        }
      }
      
      expect(lease.id.owner).toBe('akash1owner123')
      expect(lease.id.dseq).toBe('12345')
      expect(lease.id.gseq).toBe(1)
      expect(lease.id.oseq).toBe(1)
      expect(lease.id.provider).toBe('akash1provider123')
      expect(lease.state).toBe('active')
      expect(lease.price.denom).toBe('uakt')
      expect(lease.price.amount).toBe('1000')
    })

    it('should support closed state', () => {
      const lease: Lease = {
        id: {
          owner: 'akash1owner456',
          dseq: '67890',
          gseq: 2,
          oseq: 1,
          provider: 'akash1provider456'
        },
        state: 'closed',
        price: {
          denom: 'uakt',
          amount: '2000'
        }
      }
      
      expect(lease.state).toBe('closed')
    })

    it('should support insufficient_funds state', () => {
      const lease: Lease = {
        id: {
          owner: 'akash1owner789',
          dseq: '11111',
          gseq: 1,
          oseq: 1,
          provider: 'akash1provider789'
        },
        state: 'insufficient_funds',
        price: {
          denom: 'uakt',
          amount: '500'
        }
      }
      
      expect(lease.state).toBe('insufficient_funds')
    })
  })

  describe('Deployment', () => {
    it('should define deployment structure with active state', () => {
      const deployment: Deployment = {
        id: {
          owner: 'akash1owner123',
          dseq: '12345'
        },
        state: 'active',
        version: 'v1.0.0',
        createdAt: 1640995200000
      }
      
      expect(deployment.id.owner).toBe('akash1owner123')
      expect(deployment.id.dseq).toBe('12345')
      expect(deployment.state).toBe('active')
      expect(deployment.version).toBe('v1.0.0')
      expect(deployment.createdAt).toBe(1640995200000)
    })

    it('should support closed state', () => {
      const deployment: Deployment = {
        id: {
          owner: 'akash1owner456',
          dseq: '67890'
        },
        state: 'closed',
        version: 'v2.1.0',
        createdAt: 1641081600000
      }
      
      expect(deployment.state).toBe('closed')
      expect(deployment.version).toBe('v2.1.0')
    })
  })

  describe('Type compatibility', () => {
    it('should allow type assignments', () => {
      const config: AkashConfig = {
        rpcEndpoint: 'https://rpc.akashedge.com:443',
        chainId: 'akashnet-2'
      }
      
      const deployment: Deployment = {
        id: { owner: 'test', dseq: '123' },
        state: 'active',
        version: 'v1',
        createdAt: Date.now()
      }
      
      const lease: Lease = {
        id: {
          owner: 'test',
          dseq: '123',
          gseq: 1,
          oseq: 1,
          provider: 'provider'
        },
        state: 'active',
        price: { denom: 'uakt', amount: '100' }
      }
      
      const provider: ProviderInfo = {
        owner: 'provider',
        hostUri: 'https://provider.com',
        attributes: []
      }
      
      expect(config).toBeDefined()
      expect(deployment).toBeDefined()
      expect(lease).toBeDefined()
      expect(provider).toBeDefined()
    })
  })
})