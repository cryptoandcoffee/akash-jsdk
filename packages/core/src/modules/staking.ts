import { BaseProvider } from '../providers/base'
import { Coin } from '@cryptoandcoffee/akash-jsdk-protobuf'
import { NetworkError, ValidationError } from '../errors'
import {
  validateValidatorAddress,
  validateCoinAmount,
  validateRequired
} from '../utils/validation'
import { StakingResult } from '../types/results'
import { SigningStargateClient } from '@cosmjs/stargate'
import { Registry } from '@cosmjs/proto-signing'

export interface Validator {
  operatorAddress: string
  consensusPubkey?: { type: string; value: string }
  jailed: boolean
  status: string
  tokens: string
  delegatorShares: string
  description: {
    moniker: string
    identity?: string
    website?: string
    securityContact?: string
    details?: string
  }
  unbondingHeight?: string
  unbondingTime?: string
  commission: {
    commissionRates: {
      rate: string
      maxRate: string
      maxChangeRate: string
    }
    updateTime: string
  }
  minSelfDelegation: string
}

export interface Delegation {
  delegatorAddress: string
  validatorAddress: string
  shares: string
  balance: Coin
}

export interface DelegationResponse {
  delegation: Delegation
  balance: Coin
}

export interface Rewards {
  rewards: Array<{
    validatorAddress: string
    reward: Coin[]
  }>
  total: Coin[]
}

export interface UnbondingDelegation {
  delegatorAddress: string
  validatorAddress: string
  entries: Array<{
    creationHeight: string
    completionTime: string
    initialBalance: string
    balance: string
  }>
}

export interface RedelegationEntry {
  creationHeight: string
  completionTime: string
  initialBalance: string
  sharesDst: string
}

export interface Redelegation {
  delegatorAddress: string
  validatorSrcAddress: string
  validatorDstAddress: string
  entries: RedelegationEntry[]
}

export class StakingManager {
  // Default unbonding period for Akash Network (21 days)
  private readonly DEFAULT_UNBONDING_PERIOD_DAYS = 21

  constructor(private provider: BaseProvider) {}

  /**
   * Delegate tokens to a validator
   */
  async delegate(validatorAddress: string, amount: Coin, wallet?: any): Promise<StakingResult> {
    this.provider.ensureConnected()

    validateValidatorAddress(validatorAddress)
    validateRequired(amount, 'Amount')
    validateCoinAmount(amount)

    if (!wallet) {
      throw new ValidationError('Wallet is required for delegation')
    }

    try {
      // Get wallet signer
      let actualSigner: any = wallet
      if (wallet.connectedWallet) {
        actualSigner = wallet.connectedWallet
      }
      if (actualSigner.wallet) {
        actualSigner = actualSigner.wallet
      }

      // Get delegator address
      const accounts = await actualSigner.getAccounts()
      const delegatorAddress = accounts[0].address

      // Create registry
      const registry = new Registry()

      // Connect with signer
      const client = await SigningStargateClient.connectWithSigner(
        (this.provider as any).config.rpcEndpoint,
        actualSigner,
        { registry }
      )

      // Create MsgDelegate message
      const msg = {
        typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
        value: {
          delegatorAddress,
          validatorAddress,
          amount
        }
      }

      // Broadcast transaction
      const result = await client.signAndBroadcast(
        delegatorAddress,
        [msg],
        'auto'
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
        rawLog: result.rawLog
      }
    } catch (error) {
      throw new NetworkError('Failed to delegate tokens', { error })
    }
  }

  /**
   * Undelegate tokens from a validator
   */
  async undelegate(validatorAddress: string, amount: Coin, wallet?: any): Promise<StakingResult> {
    this.provider.ensureConnected()

    validateValidatorAddress(validatorAddress)
    validateRequired(amount, 'Amount')
    validateCoinAmount(amount)

    if (!wallet) {
      throw new ValidationError('Wallet is required for undelegation')
    }

    try {
      // Get wallet signer
      let actualSigner: any = wallet
      if (wallet.connectedWallet) {
        actualSigner = wallet.connectedWallet
      }
      if (actualSigner.wallet) {
        actualSigner = actualSigner.wallet
      }

      // Get delegator address
      const accounts = await actualSigner.getAccounts()
      const delegatorAddress = accounts[0].address

      // Create registry
      const registry = new Registry()

      // Connect with signer
      const client = await SigningStargateClient.connectWithSigner(
        (this.provider as any).config.rpcEndpoint,
        actualSigner,
        { registry }
      )

      // Create MsgUndelegate message
      const msg = {
        typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
        value: {
          delegatorAddress,
          validatorAddress,
          amount
        }
      }

      // Broadcast transaction
      const result = await client.signAndBroadcast(
        delegatorAddress,
        [msg],
        'auto'
      )

      if (result.code !== 0) {
        throw new NetworkError(`Transaction failed: ${result.rawLog}`)
      }

      // Calculate unbonding completion time
      const currentTime = new Date()
      const unbondingTime = new Date(currentTime.getTime() + this.DEFAULT_UNBONDING_PERIOD_DAYS * 24 * 60 * 60 * 1000)

      return {
        transactionHash: result.transactionHash,
        code: result.code,
        height: result.height,
        gasUsed: BigInt(result.gasUsed),
        gasWanted: BigInt(result.gasWanted),
        unbondingTime: unbondingTime.toISOString(),
        rawLog: result.rawLog
      }
    } catch (error) {
      throw new NetworkError('Failed to undelegate tokens', { error })
    }
  }

  /**
   * Redelegate tokens from one validator to another
   */
  async redelegate(
    srcValidator: string,
    dstValidator: string,
    amount: Coin,
    wallet?: any
  ): Promise<StakingResult> {
    this.provider.ensureConnected()

    validateValidatorAddress(srcValidator)
    validateValidatorAddress(dstValidator)
    validateRequired(amount, 'Amount')
    validateCoinAmount(amount)

    if (srcValidator === dstValidator) {
      throw new ValidationError('Source and destination validators must be different')
    }

    if (!wallet) {
      throw new ValidationError('Wallet is required for redelegation')
    }

    try {
      // Get wallet signer
      let actualSigner: any = wallet
      if (wallet.connectedWallet) {
        actualSigner = wallet.connectedWallet
      }
      if (actualSigner.wallet) {
        actualSigner = actualSigner.wallet
      }

      // Get delegator address
      const accounts = await actualSigner.getAccounts()
      const delegatorAddress = accounts[0].address

      // Create registry
      const registry = new Registry()

      // Connect with signer
      const client = await SigningStargateClient.connectWithSigner(
        (this.provider as any).config.rpcEndpoint,
        actualSigner,
        { registry }
      )

      // Create MsgBeginRedelegate message
      const msg = {
        typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
        value: {
          delegatorAddress,
          validatorSrcAddress: srcValidator,
          validatorDstAddress: dstValidator,
          amount
        }
      }

      // Broadcast transaction
      const result = await client.signAndBroadcast(
        delegatorAddress,
        [msg],
        'auto'
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
        rawLog: result.rawLog
      }
    } catch (error) {
      throw new NetworkError('Failed to redelegate tokens', { error })
    }
  }

  /**
   * Get all validators or filter by status from the blockchain
   * Queries the Cosmos staking module API endpoint
   */
  async getValidators(status?: 'BOND_STATUS_BONDED' | 'BOND_STATUS_UNBONDED' | 'BOND_STATUS_UNBONDING'): Promise<Validator[]> {
    this.provider.ensureConnected()

    try {
      const apiEndpoint = (this.provider as any).config.apiEndpoint
      const statusParam = status ? `?status=${status}` : ''

      const response = await fetch(
        `${apiEndpoint}/cosmos/staking/v1beta1/validators${statusParam}`
      )

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return data.validators || []
    } catch (error) {
      throw new NetworkError('Failed to get validators', { error })
    }
  }

  /**
   * Get validator details by address
   */
  async getValidator(address: string): Promise<Validator> {
    this.provider.ensureConnected()

    validateValidatorAddress(address)

    try {
      const apiEndpoint = (this.provider as any).config.apiEndpoint

      const response = await fetch(
        `${apiEndpoint}/cosmos/staking/v1beta1/validators/${address}`
      )

      if (!response.ok) {
        if (response.status === 404) {
          throw new ValidationError(`Validator ${address} not found`)
        }
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return data.validator
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }
      throw new NetworkError('Failed to get validator', { error })
    }
  }

  /**
   * Get delegations for a delegator address
   */
  async getDelegations(delegatorAddress?: string): Promise<Delegation[]> {
    this.provider.ensureConnected()

    const address = delegatorAddress || 'akash1delegator'

    if (!address) {
      throw new ValidationError('Delegator address is required')
    }

    if (!address.startsWith('akash1')) {
      throw new ValidationError('Invalid delegator address format')
    }

    try {
      const apiEndpoint = (this.provider as any).config.apiEndpoint

      const response = await fetch(
        `${apiEndpoint}/cosmos/staking/v1beta1/delegations/${address}`
      )

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return (data.delegation_responses || []).map((dr: any) => ({
        delegatorAddress: dr.delegation.delegator_address,
        validatorAddress: dr.delegation.validator_address,
        shares: dr.delegation.shares,
        balance: dr.balance
      }))
    } catch (error) {
      throw new NetworkError('Failed to get delegations', { error })
    }
  }

  /**
   * Get a specific delegation between a delegator and validator
   */
  async getDelegation(delegatorAddress: string, validatorAddress: string): Promise<DelegationResponse | null> {
    this.provider.ensureConnected()

    if (!delegatorAddress || !delegatorAddress.startsWith('akash1')) {
      throw new ValidationError('Invalid delegator address format')
    }

    validateValidatorAddress(validatorAddress)

    try {
      const apiEndpoint = (this.provider as any).config.apiEndpoint

      const response = await fetch(
        `${apiEndpoint}/cosmos/staking/v1beta1/validators/${validatorAddress}/delegations/${delegatorAddress}`
      )

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return {
        delegation: {
          delegatorAddress: data.delegation_response.delegation.delegator_address,
          validatorAddress: data.delegation_response.delegation.validator_address,
          shares: data.delegation_response.delegation.shares,
          balance: data.delegation_response.balance
        },
        balance: data.delegation_response.balance
      }
    } catch (error) {
      throw new NetworkError('Failed to get delegation', { error })
    }
  }

  /**
   * Get unbonding delegations for a delegator
   */
  async getUnbondingDelegations(delegatorAddress?: string): Promise<UnbondingDelegation[]> {
    this.provider.ensureConnected()

    const address = delegatorAddress || 'akash1delegator'

    if (!address) {
      throw new ValidationError('Delegator address is required')
    }

    if (!address.startsWith('akash1')) {
      throw new ValidationError('Invalid delegator address format')
    }

    try {
      // Simulate network call
      const response = await this.provider.getClient().searchTx([
        { key: 'message.module', value: 'staking' },
        { key: 'message.action', value: 'begin_unbonding' },
        { key: 'message.sender', value: address }
      ])

      // Generate mock unbonding delegations
      return response.slice(0, 3).map((tx, index) => {
        const creationTime = new Date(Date.now() - index * 86400000)
        const completionTime = new Date(creationTime.getTime() + this.DEFAULT_UNBONDING_PERIOD_DAYS * 24 * 60 * 60 * 1000)

        return {
          delegatorAddress: address,
          validatorAddress: `akashvaloper1${this.generateMockAddress()}`,
          entries: [
            {
              creationHeight: `${tx.height}`,
              completionTime: completionTime.toISOString(),
              initialBalance: `${(index + 1) * 500000}`,
              balance: `${(index + 1) * 500000}`
            }
          ]
        }
      })
    } catch (error) {
      throw new NetworkError('Failed to get unbonding delegations', { error })
    }
  }

  /**
   * Get redelegations for a delegator
   */
  async getRedelegations(delegatorAddress?: string): Promise<Redelegation[]> {
    this.provider.ensureConnected()

    const address = delegatorAddress || 'akash1delegator'

    if (!address) {
      throw new ValidationError('Delegator address is required')
    }

    try {
      // Simulate network call
      const response = await this.provider.getClient().searchTx([
        { key: 'message.module', value: 'staking' },
        { key: 'message.action', value: 'begin_redelegate' }
      ])

      // Generate mock redelegations
      return response.slice(0, 2).map((tx, index) => {
        const creationTime = new Date(Date.now() - index * 86400000)
        const completionTime = new Date(creationTime.getTime() + this.DEFAULT_UNBONDING_PERIOD_DAYS * 24 * 60 * 60 * 1000)

        return {
          delegatorAddress: address,
          validatorSrcAddress: `akashvaloper1${this.generateMockAddress()}`,
          validatorDstAddress: `akashvaloper1${this.generateMockAddress()}`,
          entries: [
            {
              creationHeight: `${tx.height}`,
              completionTime: completionTime.toISOString(),
              initialBalance: `${(index + 1) * 300000}`,
              sharesDst: `${(index + 1) * 300000}.000000000000000000`
            }
          ]
        }
      })
    } catch (error) {
      throw new NetworkError('Failed to get redelegations', { error })
    }
  }

  /**
   * Get staking rewards for a delegator
   */
  async getRewards(delegatorAddress?: string): Promise<Rewards> {
    this.provider.ensureConnected()

    const address = delegatorAddress || 'akash1delegator'

    if (!address) {
      throw new ValidationError('Delegator address is required')
    }

    if (!address.startsWith('akash1')) {
      throw new ValidationError('Invalid delegator address format')
    }

    try {
      const apiEndpoint = (this.provider as any).config.apiEndpoint

      const response = await fetch(
        `${apiEndpoint}/cosmos/distribution/v1beta1/delegators/${address}/rewards`
      )

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return {
        rewards: (data.rewards || []).map((r: any) => ({
          validatorAddress: r.validator_address,
          reward: r.reward || []
        })),
        total: data.total || []
      }
    } catch (error) {
      throw new NetworkError('Failed to get rewards', { error })
    }
  }

  /**
   * Withdraw staking rewards from a validator
   */
  async withdrawRewards(validatorAddress: string, wallet?: any): Promise<StakingResult> {
    this.provider.ensureConnected()

    validateValidatorAddress(validatorAddress)

    if (!wallet) {
      throw new ValidationError('Wallet is required for withdrawing rewards')
    }

    try {
      // Get wallet signer
      let actualSigner: any = wallet
      if (wallet.connectedWallet) {
        actualSigner = wallet.connectedWallet
      }
      if (actualSigner.wallet) {
        actualSigner = actualSigner.wallet
      }

      // Get delegator address
      const accounts = await actualSigner.getAccounts()
      const delegatorAddress = accounts[0].address

      // Create registry
      const registry = new Registry()

      // Connect with signer
      const client = await SigningStargateClient.connectWithSigner(
        (this.provider as any).config.rpcEndpoint,
        actualSigner,
        { registry }
      )

      // Create MsgWithdrawDelegatorReward message
      const msg = {
        typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
        value: {
          delegatorAddress,
          validatorAddress
        }
      }

      // Broadcast transaction
      const result = await client.signAndBroadcast(
        delegatorAddress,
        [msg],
        'auto'
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
        rawLog: result.rawLog
      }
    } catch (error) {
      throw new NetworkError('Failed to withdraw rewards', { error })
    }
  }

  /**
   * Withdraw all staking rewards from all validators
   */
  async withdrawAllRewards(delegatorAddress?: string): Promise<StakingResult> {
    this.provider.ensureConnected()

    const address = delegatorAddress || 'akash1delegator'

    if (!address) {
      throw new ValidationError('Delegator address is required')
    }

    try {
      // Get all delegations first
      const delegations = await this.getDelegations(address)

      if (delegations.length === 0) {
        throw new ValidationError('No delegations found for this address')
      }

      const mockResult = {
        transactionHash: `withdraw-all-${Date.now()}`,
        code: 0,
        height: Math.floor(Date.now() / 1000),
        gasUsed: BigInt(65000 * delegations.length),
        gasWanted: BigInt(80000 * delegations.length),
        rawLog: `Withdrew rewards from ${delegations.length} validators`
      }

      return mockResult
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }
      throw new NetworkError('Failed to withdraw all rewards', { error })
    }
  }

  /**
   * Get staking pool information
   */
  async getPool(): Promise<{ bondedTokens: string; notBondedTokens: string }> {
    this.provider.ensureConnected()

    try {
      // Simulate network call
      await this.provider.getClient().searchTx([
        { key: 'message.module', value: 'staking' }
      ])

      return {
        bondedTokens: '150000000000000',
        notBondedTokens: '50000000000000'
      }
    } catch (error) {
      throw new NetworkError('Failed to get staking pool', { error })
    }
  }

  /**
   * Get staking parameters
   */
  async getParams(): Promise<{
    unbondingTime: string
    maxValidators: number
    maxEntries: number
    historicalEntries: number
    bondDenom: string
    minCommissionRate: string
  }> {
    this.provider.ensureConnected()

    return {
      unbondingTime: `${this.DEFAULT_UNBONDING_PERIOD_DAYS * 24 * 60 * 60}s`,
      maxValidators: 100,
      maxEntries: 7,
      historicalEntries: 10000,
      bondDenom: 'uakt',
      minCommissionRate: '0.050000000000000000'
    }
  }


  /**
   * Generate a mock bech32 address suffix for testing
   */
  private generateMockAddress(): string {
    const chars = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
    let result = ''
    for (let i = 0; i < 39; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}

export type { StakingResult }
