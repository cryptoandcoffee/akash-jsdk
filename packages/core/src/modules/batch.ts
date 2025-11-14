import { BaseProvider } from '../providers/base'
import { ValidationError, NetworkError } from '../errors'
import { EncodeObject, Registry } from '@cosmjs/proto-signing'
import { SigningStargateClient, calculateFee, GasPrice, StdFee } from '@cosmjs/stargate'
import {
  validateSDL,
  validateDseq,
  validateProviderAddress
} from '../utils/validation'
import { BatchResult } from '../types/results'
import {
  DEFAULT_GAS_PRICE,
  DEFAULT_GAS_ADJUSTMENT,
  DEFAULT_DEPLOYMENT_DEPOSIT,
  DEFAULT_DENOM,
  DEFAULT_GSEQ,
  DEFAULT_OSEQ,
  MOCK_PUBKEY
} from './batch-constants'

/**
 * Individual operation in a batch
 */
export interface BatchOperation {
  type: string
  msg: EncodeObject
}

/**
 * Builder pattern for constructing batch operations
 */
export class BatchBuilder {
  private operations: EncodeObject[] = []
  private manager: BatchManager

  constructor(manager: BatchManager) {
    this.manager = manager
  }

  /**
   * Add a deployment creation to the batch
   */
  addDeployment(sdl: string): BatchBuilder {
    validateSDL(sdl)

    if (!sdl || typeof sdl !== 'string') {
      throw new ValidationError('SDL must be a non-empty string')
    }

    // In a real implementation, this would parse the SDL and create a MsgCreateDeployment
    const msg: EncodeObject = {
      typeUrl: '/akash.deployment.v1beta3.MsgCreateDeployment',
      value: {
        id: {
          owner: this.manager['wallet']?.address || '',
          dseq: Date.now().toString()
        },
        groups: [],
        version: Buffer.from(sdl).toString('base64'),
        deposit: { denom: DEFAULT_DENOM, amount: DEFAULT_DEPLOYMENT_DEPOSIT },
        depositor: this.manager['wallet']?.address || ''
      }
    }

    this.operations.push(msg)
    return this
  }

  /**
   * Add a lease creation to the batch
   */
  addLease(dseq: string, provider: string): BatchBuilder {
    validateDseq(dseq)
    validateProviderAddress(provider)

    if (!dseq || typeof dseq !== 'string') {
      throw new ValidationError('dseq must be a non-empty string')
    }
    if (!provider || typeof provider !== 'string') {
      throw new ValidationError('provider must be a non-empty string')
    }

    // In a real implementation, this would create a MsgCreateLease
    const msg: EncodeObject = {
      typeUrl: '/akash.market.v1beta3.MsgCreateLease',
      value: {
        bidId: {
          owner: this.manager['wallet']?.address || '',
          dseq,
          gseq: DEFAULT_GSEQ,
          oseq: DEFAULT_OSEQ,
          provider
        }
      }
    }

    this.operations.push(msg)
    return this
  }

  /**
   * Add a certificate creation to the batch
   */
  addCertificate(cert: string): BatchBuilder {
    if (!cert || typeof cert !== 'string') {
      throw new ValidationError('cert must be a non-empty string')
    }

    // In a real implementation, this would create a MsgCreateCertificate
    const msg: EncodeObject = {
      typeUrl: '/akash.cert.v1beta3.MsgCreateCertificate',
      value: {
        owner: this.manager['wallet']?.address || '',
        cert: Buffer.from(cert).toString('base64'),
        pubkey: Buffer.from(MOCK_PUBKEY).toString('base64')
      }
    }

    this.operations.push(msg)
    return this
  }

  /**
   * Add a custom message to the batch
   */
  addCustomMessage(msg: EncodeObject): BatchBuilder {
    if (!msg || !msg.typeUrl) {
      throw new ValidationError('msg must be a valid EncodeObject with typeUrl')
    }

    this.operations.push(msg)
    return this
  }

  /**
   * Get the number of operations in the batch
   */
  getOperationCount(): number {
    return this.operations.length
  }

  /**
   * Get all operations in the batch
   */
  getOperations(): EncodeObject[] {
    return [...this.operations]
  }

  /**
   * Clear all operations from the batch
   */
  clear(): BatchBuilder {
    this.operations = []
    return this
  }

  /**
   * Execute all operations in the batch as a single transaction
   *
   * @returns Batch execution result with transaction hash
   */
  async execute(): Promise<BatchResult> {
    return await this.manager.executeBatch(this.operations)
  }
}

/**
 * Configuration options for BatchManager
 */
export interface BatchManagerConfig {
  gasPrice?: string
  gasAdjustment?: number
}

/**
 * Manager for batch operations on the Akash Network
 * Allows bundling multiple blockchain operations into a single transaction
 */
export class BatchManager {
  private provider: BaseProvider
  private wallet: any = null
  private gasPrice: string
  private gasAdjustment: number

  constructor(provider: BaseProvider, wallet?: any, config?: BatchManagerConfig) {
    this.provider = provider
    this.wallet = wallet || null
    this.gasPrice = config?.gasPrice || DEFAULT_GAS_PRICE
    this.gasAdjustment = config?.gasAdjustment || DEFAULT_GAS_ADJUSTMENT
  }

  /**
   * Set the wallet to use for batch operations
   */
  setWallet(wallet: any): void {
    this.wallet = wallet
  }

  /**
   * Set gas price for transactions
   */
  setGasPrice(gasPrice: string): void {
    if (!gasPrice || typeof gasPrice !== 'string') {
      throw new ValidationError('gasPrice must be a non-empty string')
    }
    this.gasPrice = gasPrice
  }

  /**
   * Set gas adjustment multiplier
   */
  setGasAdjustment(adjustment: number): void {
    if (typeof adjustment !== 'number' || adjustment <= 0) {
      throw new ValidationError('gasAdjustment must be a positive number')
    }
    this.gasAdjustment = adjustment
  }

  /**
   * Create a new batch builder
   */
  async createBatch(): Promise<BatchBuilder> {
    this.provider.ensureConnected()
    return new BatchBuilder(this)
  }

  /**
   * Execute a batch of operations on the blockchain
   * Uses SigningStargateClient to broadcast transactions in a single batch
   */
  async executeBatch(operations: EncodeObject[]): Promise<BatchResult> {
    this.provider.ensureConnected()

    if (!this.wallet) {
      throw new ValidationError('Wallet must be set before executing batch operations')
    }

    if (!operations || operations.length === 0) {
      throw new ValidationError('Batch must contain at least one operation')
    }

    // Validate all operations have required fields
    for (const op of operations) {
      if (!op.typeUrl) {
        throw new ValidationError('All operations must have a typeUrl')
      }
    }

    try {
      // Create registry for Akash message types
      const registry = new Registry()

      // Connect to the chain with signing capability
      const client = await SigningStargateClient.connectWithSigner(
        (this.provider as any).config.rpcEndpoint,
        this.wallet,
        { registry }
      )

      // Get the wallet address
      const accounts = await this.wallet.getAccounts()
      const walletAddress = accounts[0].address

      // Broadcast all operations in a single transaction
      const result = await client.signAndBroadcast(
        walletAddress,
        operations,
        {
          amount: [{
            denom: DEFAULT_DENOM,
            amount: Math.ceil(operations.length * 5000).toString()
          }],
          gas: 'auto',
          gasAdjustment: this.gasAdjustment
        } as StdFee
      )

      if (result.code !== 0) {
        throw new NetworkError(`Transaction failed: ${result.rawLog}`)
      }

      return {
        transactionHash: result.transactionHash,
        code: result.code,
        height: result.height,
        gasUsed: BigInt(result.gasUsed),
        gasWanted: BigInt(result.gasWanted),
        success: result.code === 0,
        events: result.events ? [...result.events] : []
      }
    } catch (error) {
      throw new NetworkError('Failed to execute batch operation', { error })
    }
  }

  /**
   * Simulate a batch to estimate gas using real chain simulation
   * Uses SigningStargateClient.simulate() to get accurate gas estimates
   */
  async simulateBatch(operations: EncodeObject[]): Promise<{
    gasEstimate: number
    fee: { denom: string; amount: string }
  }> {
    this.provider.ensureConnected()

    if (!this.wallet) {
      throw new ValidationError('Wallet must be set for gas simulation')
    }

    if (!operations || operations.length === 0) {
      throw new ValidationError('Batch must contain at least one operation')
    }

    try {
      // Create registry
      const registry = new Registry()

      // Connect to the chain with signing capability
      const client = await SigningStargateClient.connectWithSigner(
        (this.provider as any).config.rpcEndpoint,
        this.wallet,
        { registry }
      )

      // Get the wallet address
      const accounts = await this.wallet.getAccounts()
      const walletAddress = accounts[0].address

      // Simulate the transaction on-chain
      const gasEstimate = await client.simulate(walletAddress, operations, '')

      // Apply gas adjustment
      const adjustedGas = Math.ceil(gasEstimate * this.gasAdjustment)

      // Calculate fee
      const gasPrice = GasPrice.fromString(this.gasPrice)
      const fee = calculateFee(adjustedGas, gasPrice)

      return {
        gasEstimate: adjustedGas,
        fee: { denom: fee.amount[0].denom, amount: fee.amount[0].amount }
      }
    } catch (error) {
      throw new NetworkError('Failed to simulate batch operation', { error })
    }
  }

  /**
   * Validate a batch of operations without executing
   */
  validateBatch(operations: EncodeObject[]): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!operations || operations.length === 0) {
      errors.push('Batch must contain at least one operation')
      return { valid: false, errors }
    }

    // Check for duplicate operations
    const seenOperations = new Set<string>()
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i]

      if (!op.typeUrl) {
        errors.push(`Operation at index ${i} is missing typeUrl`)
      }

      // Create a simple hash of the operation
      const opHash = JSON.stringify({ typeUrl: op.typeUrl, value: op.value })
      if (seenOperations.has(opHash)) {
        errors.push(`Duplicate operation detected at index ${i}`)
      }
      seenOperations.add(opHash)
    }

    // Check wallet is set
    if (!this.wallet) {
      errors.push('Wallet must be set before validating batch')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Get transaction details from the blockchain
   * Queries the actual transaction data using StargateClient
   */
  async getTransactionDetails(txHash: string): Promise<{
    hash: string
    height: number
    success: boolean
    timestamp: string
  } | null> {
    this.provider.ensureConnected()

    if (!txHash || typeof txHash !== 'string') {
      throw new ValidationError('Transaction hash must be a non-empty string')
    }

    try {
      // Connect to query the blockchain
      const client = await SigningStargateClient.connect(
        (this.provider as any).config.rpcEndpoint
      )

      // Get the transaction from the chain
      const tx = await client.getTx(txHash)

      if (!tx) {
        return null
      }

      // Get block data for timestamp
      const block = await client.getBlock(tx.height)

      return {
        hash: tx.hash,
        height: tx.height,
        success: tx.code === 0,
        timestamp: block.header.time
      }
    } catch (error) {
      throw new NetworkError('Failed to get transaction details', { error })
    }
  }

  /**
   * Wait for transaction confirmation with polling
   * Polls the blockchain until the transaction is confirmed or timeout is reached
   */
  async waitForConfirmation(
    txHash: string,
    timeoutMs: number = 60000,
    pollIntervalMs: number = 1000
  ): Promise<{
    hash: string
    height: number
    success: boolean
    confirmed: boolean
  }> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      try {
        const details = await this.getTransactionDetails(txHash)

        if (details) {
          return {
            hash: details.hash,
            height: details.height,
            success: details.success,
            confirmed: true
          }
        }

        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
      } catch (error) {
        // Continue polling on errors
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
      }
    }

    // Timeout reached
    return {
      hash: txHash,
      height: 0,
      success: false,
      confirmed: false
    }
  }
}

export type { BatchResult }
