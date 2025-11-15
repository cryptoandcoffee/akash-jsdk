 import { BaseProvider } from '../providers/base'
import { Deployment, DeploymentID, DeploymentState, GroupSpec, Coin, MsgCreateDeployment } from '@cryptoandcoffee/akash-jsdk-protobuf'
import { NetworkError, ValidationError, DeploymentError } from '../errors'
import { SigningStargateClient } from '@cosmjs/stargate'
import { Registry, DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { SDLManager } from './sdl'

export interface CreateDeploymentRequest {
  sdl: string;
  deposit?: Coin;
  depositor?: string;
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

      // Create MsgCreateDeployment
      const msg: MsgCreateDeployment = {
        id: {
          owner,
          dseq
        },
        groups,
        version: new Uint8Array([1, 0, 0]), // Version 1.0.0
        deposit: request.deposit || { denom: 'uakt', amount: '500000' }, // Default deposit
        depositor: request.depositor || owner
      }

      // Create registry with Akash message types for Protobuf encoding
      const registry = new Registry()
      // The MsgCreateDeployment should be available from the protobuf package
      // For now, we'll try without explicit registration

      const client = await SigningStargateClient.connectWithSigner(
        (this.provider as any).config.rpcEndpoint,
        actualSigner,
        { registry }
      )

      // Use signAndBroadcast with typeUrl/value format (should use AminoTypes)
      const result = await client.signAndBroadcast(owner, [{
        typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
        value: msg
      }], {
        amount: [{ denom: 'uakt', amount: '5000' }],
        gas: 'auto'
      })

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

        // Convert CPU units (e.g., "0.5" -> Uint8Array)
        const cpuUnits = parseFloat(computeProfile.resources.cpu.units)
        const cpuVal = new Uint8Array(8)
        const cpuView = new DataView(cpuVal.buffer)
        cpuView.setFloat64(0, cpuUnits * 1000, true) // Convert to millicores

        // Convert memory size (e.g., "512Mi" -> Uint8Array)
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
              cpu: { units: { val: cpuVal } },
              memory: { quantity: { val: memoryVal } },
              storage: [{
                name: 'default',
                quantity: { val: storageVal }
              }]
            },
            count: (profileConfig as any).count || 1,
            price: { denom: 'uakt', amount: '1000' } // Default price
          }]
        }

        groups.push(groupSpec)
      }
    }

    return groups
  }

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