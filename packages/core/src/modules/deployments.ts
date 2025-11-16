import { BaseProvider } from '../providers/base'
import { Deployment, DeploymentID, DeploymentState, GroupSpec, Coin } from '@cryptoandcoffee/akash-jsdk-protobuf'
import type { ResourceValue } from '@cryptoandcoffee/akash-jsdk-protobuf'
import { NetworkError, ValidationError, DeploymentError } from '../errors'
import { SigningStargateClient, GasPrice, calculateFee } from '@cosmjs/stargate'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { SDLManager } from './sdl'
import { createAkashRegistry } from '../utils/registry'

export interface CreateDeploymentRequest {
  sdl: string;
  deposit?: Coin;
  depositor?: string;
  version?: string;
}

export interface DeploymentFilters {
  owner?: string;
  state?: DeploymentState;
  dseq?: string;
}

export class DeploymentManager {
  private sdlManager: SDLManager

  constructor(private provider: BaseProvider) {
    this.sdlManager = new SDLManager()
  }

  async create(request: CreateDeploymentRequest, wallet?: any): Promise<DeploymentID> {
    this.provider.ensureConnected()

    if (!request.sdl || request.sdl.trim().length === 0) {
      throw new ValidationError('SDL is required')
    }

    if (!wallet) {
      throw new ValidationError('Wallet is required for real deployment creation')
    }

    try {
      // Parse SDL to get service definition
      const serviceDefinition = this.sdlManager.parseSDL(request.sdl)

      // Convert SDL to GroupSpec array
      const groups = this.convertSDLToGroupSpecs(serviceDefinition)

      // Get the underlying wallet - if it's a WalletManager, get the connected wallet
      let hdWallet: any = wallet
      if (wallet.connectedWallet) {
        hdWallet = wallet.connectedWallet
      }

      // If it's a MnemonicWallet, get the underlying DirectSecp256k1HdWallet
      let actualSigner: any = hdWallet
      if (hdWallet.wallet) {
        actualSigner = hdWallet.wallet
      } else if (hdWallet.mnemonic) {
        // Create DirectSecp256k1HdWallet for Direct (Protobuf) signing
        actualSigner = await DirectSecp256k1HdWallet.fromMnemonic(hdWallet.mnemonic, {
          prefix: "akash",
        })
      }

      // Get wallet address
      const signerAccounts = await actualSigner.getAccounts()
      const owner = Array.isArray(signerAccounts) && signerAccounts.length > 0
        ? (typeof signerAccounts[0] === 'string' ? signerAccounts[0] : signerAccounts[0]?.address)
        : null

      if (!owner || typeof owner !== 'string' || owner.trim().length === 0) {
        throw new ValidationError(`Failed to get wallet address: ${owner}`)
      }



      // Generate deployment sequence (dseq) - in real Akash this comes from the chain
      // For now, we'll use a timestamp-based approach
      const dseq = Date.now().toString()

      // FIX #6: Parse version from request or use default
      const version = request.version
        ? this.parseVersionString(request.version)
        : new Uint8Array([1, 0, 0])

      // Create MsgCreateDeployment
      const msg: any = {
        id: {
          owner,
          dseq
        },
        groups,
        version,
        deposit: request.deposit || { denom: 'uakt', amount: '500000' }, // Default deposit
        depositor: request.depositor || owner
      }

      // Create registry with Akash-specific message types for Protobuf encoding
      const registry = createAkashRegistry()

      const client = await SigningStargateClient.connectWithSigner(
        (this.provider as any).config.rpcEndpoint,
        actualSigner,
        { registry }
      )

      // Estimate gas and calculate proper fee
      const gasEstimate = await client.simulate(owner, [{
        typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
        value: msg
      }], "")

      const adjustedGas = Math.ceil(gasEstimate * 1.5).toString()
      const gasPrice = GasPrice.fromString("0.025uakt")
      const fee = calculateFee(parseInt(adjustedGas), gasPrice)

      // Use signAndBroadcast with calculated fee
      const result = await client.signAndBroadcast(owner, [{
        typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
        value: msg
      }], fee)

      if (result.code !== 0) {
        throw new DeploymentError(`Transaction failed: ${result.rawLog}`)
      }

      return {
        owner,
        dseq
      }
    } catch (error) {
      throw new DeploymentError('Failed to create deployment', { error })
    }
  }

  private convertSDLToGroupSpecs(serviceDefinition: any): GroupSpec[] {
    const groups: GroupSpec[] = []

    // Process each deployment group
    for (const [serviceName, deploymentConfig] of Object.entries(serviceDefinition.deployment)) {
      for (const [profileName, profileConfig] of Object.entries(deploymentConfig as any)) {
        const service = serviceDefinition.services[serviceName]
        const computeProfile = serviceDefinition.profiles?.compute?.[(profileConfig as any).profile]

        if (!service || !computeProfile) {
          throw new ValidationError(`Missing service or compute profile for ${serviceName}`)
        }

        // FIX #5: Validate and convert CPU units (e.g., "0.5" cores -> millicores)
        const cpuUnits = parseFloat(computeProfile.resources.cpu.units)
        if (isNaN(cpuUnits) || cpuUnits <= 0) {
          throw new ValidationError(`Invalid CPU units: "${computeProfile.resources.cpu.units}". Must be positive number.`)
        }
        // CPU in millicores (1 core = 1000 millicores), stored as unsigned 64-bit integer
        const cpuMillicores = Math.round(cpuUnits * 1000)
        const cpuVal = new Uint8Array(8)
        const cpuView = new DataView(cpuVal.buffer)
        cpuView.setBigUint64(0, BigInt(cpuMillicores), true)

        // Convert memory size (e.g., "512Mi" -> Uint8Array bytes)
        const memorySize = this.parseMemorySize(computeProfile.resources.memory.size)
        const memoryVal = new Uint8Array(8)
        const memoryView = new DataView(memoryVal.buffer)
        memoryView.setBigUint64(0, BigInt(memorySize), true)

        // Convert storage size
        const storageSize = computeProfile.resources.storage?.[0]?.size
          ? this.parseMemorySize(computeProfile.resources.storage[0].size)
          : this.parseMemorySize('1Gi')
        const storageVal = new Uint8Array(8)
        const storageView = new DataView(storageVal.buffer)
        storageView.setBigUint64(0, BigInt(storageSize), true)

        // FIX #3: Read price from SDL configuration instead of hardcoding
        const placementPricing = serviceDefinition.profiles?.placement?.[profileName]?.pricing?.[serviceName]
        const priceAmount = placementPricing?.amount || '10000'
        const priceDenom = placementPricing?.denom || 'uakt'

        // FIX #2: Wrap Uint8Array values in ResourceValue structure with val property
        const cpuResourceValue: ResourceValue = { val: cpuVal }
        const memoryResourceValue: ResourceValue = { val: memoryVal }
        const storageResourceValue: ResourceValue = { val: storageVal }

        const groupSpec: GroupSpec = {
          name: `${serviceName}-${profileName}`,
          requirements: {
            signedBy: {
              allOf: [],
              anyOf: []
            },
            attributes: []
          },
          resources: [{
            resources: {
              cpu: { units: cpuResourceValue },
              memory: { quantity: memoryResourceValue },
              storage: [{
                name: 'default',
                quantity: storageResourceValue
              }],
              endpoints: [{
                kind: 1,
                sequenceNumber: 0
              }]
            },
            count: (profileConfig as any).count || 1,
            price: { denom: priceDenom, amount: priceAmount }
          }]
        }

        groups.push(groupSpec)
      }
    }

    return groups
  }

  // FIX #4: parseMemorySize with proper error handling
  private parseMemorySize(size: string): number {
    if (!size || typeof size !== 'string') {
      throw new ValidationError('Memory size must be a non-empty string')
    }

    const trimmedSize = size.trim()
    // Match both integer and decimal values with optional unit
    const match = trimmedSize.match(/^(\d+(?:\.\d+)?)([KMGT]i?)$/i)

    if (!match) {
      throw new ValidationError(
        `Invalid memory size format: "${size}". Expected format: 512Mi, 1Gi, 2.5G, etc.`
      )
    }

    const value = parseFloat(match[1])
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

    const multiplier = multipliers[unit]
    if (!multiplier) {
      throw new ValidationError(`Unknown memory unit: "${unit}"`)
    }

    const bytes = Math.round(value * multiplier)

    if (bytes <= 0) {
      throw new ValidationError(`Memory size must be positive, got: ${trimmedSize}`)
    }

    return bytes
  }

  // FIX #6: Parse version string from request
  private parseVersionString(versionStr: string): Uint8Array {
    const parts = versionStr.split('.').slice(0, 3).map(p => {
      const num = parseInt(p)
      if (isNaN(num) || num < 0 || num > 255) {
        throw new ValidationError(`Invalid version component: ${p}`)
      }
      return num
    })

    while (parts.length < 3) parts.push(0)
    return new Uint8Array(parts)
  }

  async list(filters: DeploymentFilters = {}): Promise<Deployment[]> {
    this.provider.ensureConnected()

    try {
      const apiEndpoint = (this.provider as any).config.apiEndpoint
      let url = `${apiEndpoint}/akash/deployment/v1beta3/deployments/list`

      const params = new URLSearchParams()
      if (filters.owner) params.append('filters.owner', filters.owner)
      if (filters.dseq) params.append('filters.dseq', filters.dseq)
      if (filters.state) params.append('filters.state', filters.state.toString())

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return data.deployments.map((deployment: any) => ({
        deploymentId: {
          owner: deployment.deployment.deploymentId.owner,
          dseq: deployment.deployment.deploymentId.dseq
        },
        state: deployment.deployment.state,
        version: deployment.deployment.version,
        createdAt: deployment.deployment.createdAt
      }))
    } catch (error) {
      throw new NetworkError('Failed to list deployments', { error })
    }
  }

  async get(deploymentId: DeploymentID): Promise<Deployment | null> {
    this.provider.ensureConnected()

    if (!deploymentId.owner || !deploymentId.dseq) {
      throw new ValidationError('Invalid deployment ID')
    }

    try {
      const apiEndpoint = (this.provider as any).config.apiEndpoint
      const response = await fetch(`${apiEndpoint}/akash/deployment/v1beta3/deployments/info?id.owner=${deploymentId.owner}&id.dseq=${deploymentId.dseq}`)

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return {
        deploymentId,
        state: data.deployment.state,
        version: data.deployment.version,
        createdAt: data.deployment.createdAt
      }
    } catch (error) {
      throw new NetworkError('Failed to get deployment', { error })
    }
  }

  async close(deploymentId: DeploymentID): Promise<void> {
    this.provider.ensureConnected()
    
    if (!deploymentId.owner || !deploymentId.dseq) {
      throw new ValidationError('Invalid deployment ID')
    }

    try {
      // In a real implementation, this would submit a MsgCloseDeployment transaction
      const response = await this.provider.getClient().searchTx([
        { key: 'message.module', value: 'deployment' },
        { key: 'message.action', value: 'close-deployment' },
        { key: 'deployment.owner', value: deploymentId.owner },
        { key: 'deployment.dseq', value: deploymentId.dseq }
      ])

      if (response.length === 0) {
        // Deployment not found or already closed
      }
    } catch (error) {
      throw new DeploymentError('Failed to close deployment', { error })
    }
  }

  async update(deploymentId: DeploymentID, sdl: string): Promise<void> {
    this.provider.ensureConnected()
    
    if (!deploymentId.owner || !deploymentId.dseq) {
      throw new ValidationError('Invalid deployment ID')
    }

    if (!sdl || sdl.trim().length === 0) {
      throw new ValidationError('SDL is required')
    }

    try {
      // In a real implementation, this would submit a MsgUpdateDeployment transaction
      await this.provider.getClient().searchTx([
        { key: 'message.module', value: 'deployment' },
        { key: 'message.action', value: 'update-deployment' },
        { key: 'deployment.owner', value: deploymentId.owner },
        { key: 'deployment.dseq', value: deploymentId.dseq }
      ])
    } catch (error) {
      throw new DeploymentError('Failed to update deployment', { error })
    }
  }

  async getGroups(deploymentId: DeploymentID): Promise<GroupSpec[]> {
    this.provider.ensureConnected()

    if (!deploymentId.owner || !deploymentId.dseq) {
      throw new ValidationError('Invalid deployment ID')
    }

    try {
      const apiEndpoint = (this.provider as any).config.apiEndpoint
      const response = await fetch(`${apiEndpoint}/akash/deployment/v1beta3/deployments/info?id.owner=${deploymentId.owner}&id.dseq=${deploymentId.dseq}`)

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return data.deployment.groups
    } catch (error) {
      throw new NetworkError('Failed to get deployment groups', { error })
    }
  }

  async validateDeployment(deploymentId: DeploymentID): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const deployment = await this.get(deploymentId)
      
      if (!deployment) {
        return {
          valid: false,
          errors: ['Deployment not found']
        }
      }

      const errors: string[] = []

      if (deployment.state !== DeploymentState.DEPLOYMENT_ACTIVE) {
        errors.push('Deployment is not active')
      }

      return {
        valid: errors.length === 0,
        errors
      }
    } catch (error) {
      return {
        valid: false,
        errors: [(error as Error).message]
      }
    }
  }
}