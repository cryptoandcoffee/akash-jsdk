import { 
  ServiceDefinition, 
  Service, 
  ComputeProfile, 
  PlacementProfile, 
  DeploymentConfig 
} from '@cryptoandcoffee/akash-jsdk-protobuf'
import { ValidationError } from '../errors'
import * as yaml from 'js-yaml'

export interface SDLValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ManifestGroup {
  name: string;
  services: any[];
  resources: ComputeProfile;
  requirements: PlacementProfile;
  count: number;
}

export class SDLManager {
  
  /**
   * Validate SDL content and return validation result
   */
  validate(sdlContent: string): SDLValidationResult {
    try {
      const parsed = this.parseSDL(sdlContent)
      return this.validateSDL(parsed)
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        warnings: []
      }
    }
  }
  
  /**
   * Parse SDL YAML/JSON content into a ServiceDefinition object
   */
  parseSDL(sdlContent: string): ServiceDefinition {
    try {
      let sdlData: any;
      
      // Try to parse as JSON first, then YAML
      try {
        sdlData = JSON.parse(sdlContent)
      } catch {
        // Parse as YAML
        try {
          sdlData = yaml.load(sdlContent) as any
        } catch (yamlError) {
          throw new ValidationError('Invalid SDL syntax')
        }
      }

      if (!sdlData || typeof sdlData !== 'object') {
        throw new ValidationError('Invalid SDL syntax')
      }

      // Check for required fields
      if (!sdlData.version || !sdlData.services || !sdlData.deployment) {
        throw new ValidationError('Missing required SDL fields')
      }

      return this.convertToServiceDefinition(sdlData)
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }
      throw new ValidationError(`Failed to parse SDL: ${(error as Error).message}`)
    }
  }

  /**
   * Validate SDL structure and content
   */
  validateSDL(sdl: ServiceDefinition): SDLValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check version
    if (!sdl.version) {
      errors.push('SDL version is required')
    } else if (!['2.0', '2.1'].includes(sdl.version)) {
      warnings.push(`SDL version ${sdl.version} may not be supported`)
    }

    // Validate services
    if (!sdl.services || Object.keys(sdl.services).length === 0) {
      errors.push('At least one service must be defined')
    } else {
      for (const [serviceName, service] of Object.entries(sdl.services)) {
        this.validateService(serviceName, service, errors, warnings)
      }
    }

    // Validate profiles
    if (!sdl.profiles) {
      errors.push('Profiles section is required')
    } else {
      this.validateProfiles(sdl.profiles, errors, warnings)
    }

    // Validate deployment
    if (!sdl.deployment) {
      errors.push('Deployment section is required')
    } else {
      this.validateDeployment(sdl.deployment, sdl.services, sdl.profiles, errors, warnings)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Convert SDL to Akash manifest format
   */
  convertToManifest(sdl: ServiceDefinition): ManifestGroup[] {
    const validation = this.validateSDL(sdl)
    if (!validation.valid) {
      throw new ValidationError(`Invalid SDL: ${validation.errors.join(', ')}`)
    }

    const groups: ManifestGroup[] = []

    // Process each deployment group
    for (const [serviceName, deploymentConfig] of Object.entries(sdl.deployment)) {
      for (const [profileName, profileConfig] of Object.entries(deploymentConfig as any)) {
        const service = sdl.services[serviceName]
        const computeProfile = sdl.profiles?.compute?.[(profileConfig as any).profile]
        const placementProfile = sdl.profiles?.placement?.[profileName]

        if (!service || !computeProfile) {
          throw new ValidationError(`Missing service or compute profile for ${serviceName}`)
        }

        const group: ManifestGroup = {
          name: `${serviceName}-${profileName}`,
          services: [this.convertService(serviceName, service)],
          resources: computeProfile,
          requirements: placementProfile || { attributes: {} },
          count: (profileConfig as any).count
        }

        groups.push(group)
      }
    }

    return groups
  }

  /**
   * Generate SDL template for common use cases
   */
  generateTemplate(type: 'web-app' | 'api-server' | 'database' | 'worker'): ServiceDefinition {
    const templates = {
      'web-app': {
        version: '2.0',
        services: {
          web: {
            image: 'nginx:latest',
            expose: [
              {
                port: 80,
                as: 80,
                proto: 'TCP',
                to: [{ global: true }]
              }
            ]
          }
        },
        profiles: {
          compute: {
            web: {
              resources: {
                cpu: { units: '0.1' },
                memory: { size: '512Mi' },
                storage: [{ size: '1Gi' }]
              }
            }
          },
          placement: {
            datacenter: {
              attributes: {
                host: 'akash'
              },
              signedBy: {
                anyOf: ['akash1365yvmc4s7awdyj3n2sav7xfx76adc6dnmlx63']
              },
              pricing: {
                web: {
                  denom: 'uakt',
                  amount: '1000'
                }
              }
            }
          }
        },
        deployment: {
          web: {
            datacenter: {
              profile: 'web',
              count: 1
            }
          }
        }
      },
      'api-server': {
        version: '2.0',
        services: {
          api: {
            image: 'node:18-alpine',
            expose: [
              {
                port: 3000,
                as: 80,
                proto: 'TCP',
                to: [{ global: true }]
              }
            ],
            env: [
              'NODE_ENV=production',
              'PORT=3000'
            ]
          }
        },
        profiles: {
          compute: {
            api: {
              resources: {
                cpu: { units: '0.25' },
                memory: { size: '1Gi' },
                storage: [{ size: '2Gi' }]
              }
            }
          },
          placement: {
            datacenter: {
              attributes: {
                host: 'akash'
              },
              pricing: {
                api: {
                  denom: 'uakt',
                  amount: '2000'
                }
              }
            }
          }
        },
        deployment: {
          api: {
            datacenter: {
              profile: 'api',
              count: 2
            }
          }
        }
      },
      'database': {
        version: '2.0',
        services: {
          db: {
            image: 'postgres:15',
            env: [
              'POSTGRES_DB=myapp',
              'POSTGRES_USER=user',
              'POSTGRES_PASSWORD=password'
            ],
            expose: [
              {
                port: 5432,
                proto: 'TCP'
              }
            ]
          }
        },
        profiles: {
          compute: {
            db: {
              resources: {
                cpu: { units: '0.5' },
                memory: { size: '2Gi' },
                storage: [
                  { 
                    name: 'data',
                    size: '10Gi',
                    attributes: { class: 'persistent' }
                  }
                ]
              }
            }
          },
          placement: {
            datacenter: {
              attributes: {
                host: 'akash',
                datacenter: 'true'
              },
              pricing: {
                db: {
                  denom: 'uakt',
                  amount: '5000'
                }
              }
            }
          }
        },
        deployment: {
          db: {
            datacenter: {
              profile: 'db',
              count: 1
            }
          }
        }
      },
      'worker': {
        version: '2.0',
        services: {
          worker: {
            image: 'python:3.11-slim',
            command: ['python', 'worker.py'],
            env: [
              'WORKER_CONCURRENCY=4'
            ]
          }
        },
        profiles: {
          compute: {
            worker: {
              resources: {
                cpu: { units: '1.0' },
                memory: { size: '4Gi' },
                storage: [{ size: '5Gi' }]
              }
            }
          },
          placement: {
            datacenter: {
              attributes: {
                host: 'akash'
              },
              pricing: {
                worker: {
                  denom: 'uakt',
                  amount: '8000'
                }
              }
            }
          }
        },
        deployment: {
          worker: {
            datacenter: {
              profile: 'worker',
              count: 3
            }
          }
        }
      }
    }

    return templates[type]
  }

  /**
   * Calculate resource requirements from SDL
   */
  calculateResources(sdl: ServiceDefinition): {
    totalCPU: number;
    totalMemory: number;
    totalStorage: number;
    estimatedCost: number;
  } {
    let totalCPU = 0
    let totalMemory = 0
    let totalStorage = 0
    let estimatedCost = 0

    if (!sdl.profiles?.compute || !sdl.deployment) {
      return { totalCPU, totalMemory, totalStorage, estimatedCost }
    }

    for (const [, deploymentConfig] of Object.entries(sdl.deployment)) {
      for (const [, profileConfig] of Object.entries(deploymentConfig)) {
        const computeProfile = sdl.profiles.compute[profileConfig.profile]
        if (computeProfile) {
          const count = profileConfig.count
          
          // Parse CPU (assuming format like "0.5" for 0.5 cores)
          const cpu = parseFloat(computeProfile.resources.cpu.units) * count
          totalCPU += cpu

          // Parse Memory (convert Mi/Gi to MB)
          const memoryStr = computeProfile.resources.memory.size
          const memoryValue = parseFloat(memoryStr)
          const memoryUnit = memoryStr.replace(/[0-9.]/g, '')
          const memoryMB = memoryUnit === 'Gi' ? memoryValue * 1024 : memoryValue
          totalMemory += memoryMB * count

          // Parse Storage
          if (computeProfile.resources.storage) {
            for (const storage of computeProfile.resources.storage) {
              const storageStr = storage.size
              const storageValue = parseFloat(storageStr)
              const storageUnit = storageStr.replace(/[0-9.]/g, '')
              const storageGB = storageUnit === 'Gi' ? storageValue : storageValue / 1024
              totalStorage += storageGB * count
            }
          }

          // Estimate cost (rough calculation based on resource usage)
          const resourceCost = (cpu * 100) + (memoryMB * 0.1) + (totalStorage * 10)
          estimatedCost += resourceCost
        }
      }
    }

    return {
      totalCPU,
      totalMemory,
      totalStorage,
      estimatedCost: Math.round(estimatedCost)
    }
  }

  // Private helper methods
  private convertToServiceDefinition(data: any): ServiceDefinition {
    return {
      version: data.version || '2.0',
      services: data.services || {},
      profiles: data.profiles || {},
      deployment: data.deployment || {}
    }
  }

  private validateService(name: string, service: Service, errors: string[], _warnings: string[]) {
    if (!service.image) {
      errors.push(`Service '${name}' must specify an image`)
    }

    // Validate expose configuration
    if (service.expose) {
      for (const expose of service.expose) {
        if (!expose.port) {
          errors.push(`Service '${name}' expose configuration must specify a port`)
        }
        if (expose.proto && !['TCP', 'UDP'].includes(expose.proto)) {
          errors.push(`Service '${name}' expose protocol must be TCP or UDP`)
        }
      }
    }
  }

  private validateProfiles(profiles: any, errors: string[], _warnings: string[]) {
    if (!profiles.compute) {
      errors.push('Compute profiles are required')
      return
    }

    if (!profiles.placement) {
      errors.push('Placement profiles are required')
    }

    // Validate compute profiles
    for (const [, profile] of Object.entries(profiles.compute)) {
      const computeProfile = profile as any
      if (computeProfile.resources?.cpu?.units) {
        const cpuUnits = parseFloat(computeProfile.resources.cpu.units)
        if (cpuUnits <= 0 || isNaN(cpuUnits)) {
          errors.push('Invalid CPU units: must be positive')
        }
      }
      if (computeProfile.resources?.memory?.size) {
        const memSize = computeProfile.resources.memory.size
        if (!memSize.match(/^\d+[KMGT]i?$/)) {
          errors.push('Invalid memory size format')
        }
      }
      if (computeProfile.resources?.storage) {
        for (const storage of computeProfile.resources.storage) {
          if (!storage.size?.match(/^\d+[KMGT]i?$/)) {
            errors.push('Invalid storage size format')
          } else {
            const storageValue = parseInt(storage.size.match(/^(\d+)/)?.[1] || '0')
            if (storageValue === 0) {
              errors.push('Invalid storage size: must be greater than 0')
            }
          }
        }
      }
    }
  }

  private validateDeployment(deployment: DeploymentConfig, services: any, profiles: any, errors: string[], _warnings: string[]) {
    for (const [serviceName, deploymentConfig] of Object.entries(deployment)) {
      if (!services[serviceName]) {
        errors.push(`Deployment references undefined service '${serviceName}'`)
      }

      for (const [profileName, config] of Object.entries(deploymentConfig)) {
        if (!profiles?.compute?.[config.profile]) {
          errors.push(`Deployment references undefined compute profile '${config.profile}'`)
        }

        if (config.count <= 0) {
          errors.push(`Deployment count must be positive for '${serviceName}.${profileName}'`)
        }
      }
    }
  }

  private convertService(name: string, service: Service): any {
    return {
      name,
      image: service.image,
      command: service.command,
      args: service.args,
      env: service.env,
      resources: {},
      count: 1,
      expose: service.expose?.map(e => ({
        port: e.port,
        externalPort: e.as || e.port,
        proto: e.proto || 'TCP',
        service: e.to?.[0]?.service,
        global: e.to?.[0]?.global || false
      })) || []
    }
  }

  /**
   * Generate manifest from SDL
   */
  generateManifest(sdl: any): any {
    const manifest: { version: string; groups: any[] } = {
      version: sdl.version || '2.0',
      groups: []
    }

    // Process each deployment group
    for (const [serviceName, deploymentConfig] of Object.entries(sdl.deployment || {})) {
      for (const [groupName, groupConfig] of Object.entries(deploymentConfig as any)) {
        const profileConfig = groupConfig as any
        const computeProfile = sdl.profiles?.compute?.[profileConfig.profile]
        const placementProfile = sdl.profiles?.placement?.[groupName]

        if (!computeProfile) continue

        const group = {
          name: groupName,
          services: [{
            name: serviceName,
            image: sdl.services[serviceName].image,
            resources: {
              cpu: { units: { val: computeProfile.resources.cpu.units * 1000 } }, // Convert to millicores
              memory: { quantity: { val: this.parseMemorySize(computeProfile.resources.memory.size) } },
              storage: { quantity: { val: this.parseStorageSize(computeProfile.resources.storage[0]?.size || '1Gi') } }
            },
            expose: sdl.services[serviceName].expose || []
          }],
          requirements: {
            signedBy: placementProfile?.signedBy || { anyOf: [] },
            attributes: placementProfile?.attributes 
              ? Object.entries(placementProfile.attributes).map(([key, value]) => ({ key, value: String(value) }))
              : []
          }
        }

        manifest.groups.push(group)
      }
    }

    return manifest
  }

  /**
   * Estimate resource costs
   */
  estimateResourceCosts(sdl: any): any {
    let totalCpu = 0
    let totalMemory = 0
    let totalStorage = 0
    let totalCost = 0
    const breakdown: Record<string, any> = {}

    for (const [serviceName, deploymentConfig] of Object.entries(sdl.deployment || {})) {
      breakdown[serviceName] = {}
      
      for (const [groupName, groupConfig] of Object.entries(deploymentConfig as any)) {
        const profileConfig = groupConfig as any
        const computeProfile = sdl.profiles?.compute?.[profileConfig.profile]
        const placementProfile = sdl.profiles?.placement?.[groupName]

        if (!computeProfile) continue

        const count = profileConfig.count || 1
        const pricing = placementProfile?.pricing?.[serviceName]
        const unitCost = pricing ? parseInt(pricing.amount) : 1000

        totalCpu += computeProfile.resources.cpu.units * count
        totalMemory += this.parseMemorySize(computeProfile.resources.memory.size) * count
        totalStorage += this.parseStorageSize(computeProfile.resources.storage[0]?.size || '1Gi') * count
        totalCost += unitCost * count

        breakdown[groupName] = {
          [serviceName]: {
            unitCost: { denom: pricing?.denom || 'uakt', amount: String(unitCost) },
            count,
            totalCost: { denom: pricing?.denom || 'uakt', amount: String(unitCost * count) }
          }
        }
      }
    }

    return {
      totalCost: { denom: 'uakt', amount: String(totalCost) },
      breakdown,
      resources: {
        totalCpu,
        totalMemory: this.formatMemorySize(totalMemory),
        totalStorage: this.formatStorageSize(totalStorage)
      }
    }
  }

  /**
   * Convert SDL v1 to v2
   */
  convertToV2(sdlV1: any): any {
    const sdlV2: {
      version: string;
      services: Record<string, any>;
      profiles: {
        compute: Record<string, any>;
        placement: Record<string, any>;
      };
      deployment: Record<string, any>;
    } = {
      version: '2.0',
      services: {},
      profiles: {
        compute: {},
        placement: {}
      },
      deployment: {}
    }

    // Convert services
    for (const [name, service] of Object.entries(sdlV1.services || {})) {
      const svc = service as any
      sdlV2.services[name] = {
        image: svc.image,
        expose: svc.expose?.map((e: any) => ({
          port: e.port,
          as: e.port,
          to: [{ global: e.global || false }]
        }))
      }
    }

    // Convert profiles
    for (const [name, profile] of Object.entries(sdlV1.profiles || {})) {
      const prof = profile as any
      sdlV2.profiles.compute[name] = {
        resources: {
          cpu: { units: prof.cpu || 1 },
          memory: { size: prof.memory || '512Mi' },
          storage: [{ size: prof.storage || '1Gi' }]
        }
      }
    }

    // Convert deployment
    for (const [name, deployment] of Object.entries(sdlV1.deployment || {})) {
      const dep = deployment as any
      sdlV2.deployment[name] = {
        default: {
          profile: dep.profile || name,
          count: dep.count || 1
        }
      }
    }

    return sdlV2
  }

  /**
   * Optimize SDL for cost and performance
   */
  optimizeSDL(sdl: any): any {
    const optimized = JSON.parse(JSON.stringify(sdl)) // Deep clone

    // Optimize compute profiles
    if (optimized.profiles?.compute) {
      for (const [, profile] of Object.entries(optimized.profiles.compute)) {
        const prof = profile as any
        
        // Optimize CPU (reduce if over-provisioned)
        if (prof.resources?.cpu?.units > 2) {
          prof.resources.cpu.units = Math.ceil(prof.resources.cpu.units / 2)
        }

        // Optimize memory
        if (prof.resources?.memory?.size) {
          const memBytes = this.parseMemorySize(prof.resources.memory.size)
          if (memBytes > 1073741824) { // > 1Gi
            prof.resources.memory.size = this.formatMemorySize(memBytes / 2)
          }
        }

        // Optimize storage
        if (prof.resources?.storage?.[0]?.size) {
          const storageBytes = this.parseStorageSize(prof.resources.storage[0].size)
          if (storageBytes > 5368709120) { // > 5Gi
            prof.resources.storage[0].size = this.formatStorageSize(storageBytes / 2)
          }
        }
      }
    }

    return optimized
  }

  // Helper methods for size conversions
  private parseMemorySize(size: string): number {
    const match = size.match(/^(\d+)([KMGT]i?)$/i)
    if (!match) return 0
    
    const value = parseInt(match[1])
    const unit = match[2].toUpperCase()
    
    const multipliers: Record<string, number> = {
      'K': 1024,
      'KI': 1024,
      'M': 1024 * 1024,
      'MI': 1024 * 1024,
      'G': 1024 * 1024 * 1024,
      'GI': 1024 * 1024 * 1024,
      'T': 1024 * 1024 * 1024 * 1024,
      'TI': 1024 * 1024 * 1024 * 1024
    }
    
    return value * (multipliers[unit] || 1)
  }

  private parseStorageSize(size: string): number {
    return this.parseMemorySize(size)
  }

  private formatMemorySize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${Math.round(bytes / (1024 * 1024 * 1024))}Gi`
    } else if (bytes >= 1024 * 1024) {
      return `${Math.round(bytes / (1024 * 1024))}Mi`
    } else if (bytes >= 1024) {
      return `${Math.round(bytes / 1024)}Ki`
    }
    return `${bytes}`
  }

  private formatStorageSize(bytes: number): string {
    return this.formatMemorySize(bytes)
  }
}