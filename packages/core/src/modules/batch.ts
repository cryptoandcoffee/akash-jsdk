import { BaseProvider } from '../providers/base'
import { ValidationError, NetworkError } from '../errors'
import { EncodeObject } from '@cosmjs/proto-signing'

/**
 * Result of a batch operation execution
 */
export interface BatchResult {
  transactionHash: string
  height: number
  gasUsed: number
  gasWanted: number
  success: boolean
  events: any[]
}

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
        deposit: { denom: 'uakt', amount: '5000000' },
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
          gseq: 1,
          oseq: 1,
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
        pubkey: Buffer.from('mock-pubkey').toString('base64')
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
   */
  async execute(): Promise<BatchResult> {
    return await this.manager.executeBatch(this.operations)
  }
}

/**
 * Manager for batch operations on the Akash Network
 * Allows bundling multiple blockchain operations into a single transaction
 */
export class BatchManager {
  private provider: BaseProvider
  private wallet: { address: string } | null = null
  private gasPrice: string = '0.025uakt'
  private gasAdjustment: number = 1.5

  constructor(provider: BaseProvider, wallet?: { address: string }) {
    this.provider = provider
    this.wallet = wallet || null
  }

  /**
   * Set the wallet to use for batch operations
   */
  setWallet(wallet: { address: string }): void {
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
    this.provider['ensureConnected']()
    return new BatchBuilder(this)
  }

  /**
   * Execute a batch of operations
   * @internal
   */
  async executeBatch(operations: EncodeObject[]): Promise<BatchResult> {
    this.provider['ensureConnected']()

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
      // In a real implementation, this would use SigningStargateClient.signAndBroadcast
      // to execute all operations in a single transaction
      // For now, we simulate the transaction

      const mockResult: BatchResult = {
        transactionHash: `batch-tx-${Date.now()}`,
        height: Math.floor(Date.now() / 1000),
        gasUsed: operations.length * 50000,
        gasWanted: Math.floor(operations.length * 50000 * this.gasAdjustment),
        success: true,
        events: operations.map((op, idx) => ({
          type: op.typeUrl,
          attributes: [
            { key: 'action', value: 'batch_operation' },
            { key: 'index', value: idx.toString() }
          ]
        }))
      }

      return mockResult
    } catch (error) {
      throw new NetworkError('Failed to execute batch operation', { error })
    }
  }

  /**
   * Simulate a batch to estimate gas without executing
   */
  async simulateBatch(operations: EncodeObject[]): Promise<{
    gasEstimate: number
    fee: { denom: string; amount: string }
  }> {
    this.provider['ensureConnected']()

    if (!operations || operations.length === 0) {
      throw new ValidationError('Batch must contain at least one operation')
    }

    try {
      // Simulate gas estimation
      const baseGasPerOp = 50000
      const gasEstimate = Math.floor(operations.length * baseGasPerOp * this.gasAdjustment)
      const gasPrice = parseFloat(this.gasPrice.replace('uakt', ''))
      const feeAmount = Math.ceil(gasEstimate * gasPrice)

      return {
        gasEstimate,
        fee: { denom: 'uakt', amount: feeAmount.toString() }
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
   * Get transaction details for a batch result
   */
  async getTransactionDetails(txHash: string): Promise<{
    hash: string
    height: number
    success: boolean
    timestamp: string
  } | null> {
    this.provider['ensureConnected']()

    if (!txHash || typeof txHash !== 'string') {
      throw new ValidationError('Transaction hash must be a non-empty string')
    }

    try {
      // In a real implementation, this would query the blockchain for the transaction
      // For now, return mock data
      return {
        hash: txHash,
        height: Math.floor(Date.now() / 1000),
        success: true,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      throw new NetworkError('Failed to get transaction details', { error })
    }
  }
}
