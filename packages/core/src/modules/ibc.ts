import { BaseProvider } from '../providers/base'
import { Coin } from '@cryptoandcoffee/akash-jsdk-protobuf'
import { NetworkError, ValidationError } from '../errors'
import {
  validateNonEmptyString,
  validateChannelId,
  validateCoinAmount,
  validateTimeoutTimestamp,
  validatePositiveNumber,
  validateRequired
} from '../utils/validation'
import { IBCTransferResult } from '../types/results'
import { SigningStargateClient } from '@cosmjs/stargate'
import { Registry } from '@cosmjs/proto-signing'


export interface Height {
  revisionNumber: bigint
  revisionHeight: bigint
}

export interface IBCTransferParams {
  sourceChannel: string
  token: Coin
  receiver: string
  timeoutHeight?: Height
  timeoutTimestamp?: bigint
  memo?: string
  wallet?: any
}

export interface Channel {
  id: string
  portId: string
  state: string
  ordering: string
  counterparty: {
    portId: string
    channelId: string
  }
  connectionHops: string[]
  version: string
}

export interface TransferStatus {
  txHash: string
  status: 'pending' | 'success' | 'failed' | 'timeout'
  height?: number
  timestamp?: string
  error?: string
  acknowledgement?: string
}

export class IBCManager {
  private readonly DEFAULT_TIMEOUT_OFFSET = 600_000_000_000n // 10 minutes in nanoseconds

  constructor(private provider: BaseProvider) {}

  /**
   * Initiate an IBC transfer to another chain
   */
  async transfer(params: IBCTransferParams): Promise<IBCTransferResult> {
    this.provider.ensureConnected()

    // Validate parameters
    validateChannelId(params.sourceChannel)
    validateRequired(params.token, 'Token')
    validateCoinAmount(params.token)
    validateNonEmptyString(params.receiver, 'Receiver address')

    if (params.timeoutTimestamp) {
      validateTimeoutTimestamp(params.timeoutTimestamp)
    }

    // Validate token amount is positive
    const amount = BigInt(params.token.amount)
    if (amount <= 0n) {
      throw new ValidationError('Token amount must be positive')
    }

    // Validate timeout
    const timeoutTimestamp = params.timeoutTimestamp || this.getDefaultTimeout()
    if (timeoutTimestamp <= BigInt(Date.now()) * 1_000_000n) {
      throw new ValidationError('Timeout must be in the future')
    }

    if (!params.wallet) {
      throw new ValidationError('Wallet is required for IBC transfer')
    }

    try {
      // Get wallet signer
      let actualSigner: any = params.wallet
      if (params.wallet.connectedWallet) {
        actualSigner = params.wallet.connectedWallet
      }
      if (actualSigner.wallet) {
        actualSigner = actualSigner.wallet
      }

      // Get sender address
      const accounts = await actualSigner.getAccounts()
      const sender = accounts[0].address

      // Create registry
      const registry = new Registry()

      // Connect with signer
      const client = await SigningStargateClient.connectWithSigner(
        (this.provider as any).config.rpcEndpoint,
        actualSigner,
        { registry }
      )

      // Create MsgTransfer message
      const msg = {
        typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
        value: {
          sourcePort: 'transfer',
          sourceChannel: params.sourceChannel,
          token: params.token,
          sender,
          receiver: params.receiver,
          timeoutHeight: params.timeoutHeight || {
            revisionNumber: 0n,
            revisionHeight: 0n
          },
          timeoutTimestamp,
          memo: params.memo || ''
        }
      }

      // Broadcast transaction
      const result = await client.signAndBroadcast(
        sender,
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
        gasWanted: BigInt(result.gasWanted)
      }
    } catch (error) {
      throw new NetworkError('Failed to execute IBC transfer', { error })
    }
  }

  /**
   * Get all IBC channels
   */
  async getChannels(): Promise<Channel[]> {
    this.provider.ensureConnected()

    try {
      const apiEndpoint = (this.provider as any).config.apiEndpoint

      const response = await fetch(
        `${apiEndpoint}/ibc/core/channel/v1/channels`
      )

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return (data.channels || []).map((ch: any) => ({
        id: ch.channel_id,
        portId: ch.port_id,
        state: ch.state,
        ordering: ch.ordering,
        counterparty: {
          portId: ch.counterparty.port_id,
          channelId: ch.counterparty.channel_id
        },
        connectionHops: ch.connection_hops || [],
        version: ch.version
      }))
    } catch (error) {
      throw new NetworkError('Failed to get IBC channels', { error })
    }
  }

  /**
   * Get details of a specific IBC channel
   */
  async getChannel(channelId: string, portId: string = 'transfer'): Promise<Channel> {
    this.provider.ensureConnected()

    if (!channelId) {
      throw new ValidationError('Channel ID is required')
    }

    try {
      const apiEndpoint = (this.provider as any).config.apiEndpoint

      const response = await fetch(
        `${apiEndpoint}/ibc/core/channel/v1/channels/${channelId}/ports/${portId}`
      )

      if (!response.ok) {
        if (response.status === 404) {
          throw new ValidationError(`Channel ${channelId} not found`)
        }
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      const ch = data.channel
      return {
        id: channelId,
        portId,
        state: ch.state,
        ordering: ch.ordering,
        counterparty: {
          portId: ch.counterparty.port_id,
          channelId: ch.counterparty.channel_id
        },
        connectionHops: ch.connection_hops || [],
        version: ch.version
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }
      throw new NetworkError('Failed to get IBC channel', { error })
    }
  }

  /**
   * Check the status of an IBC transfer by querying transaction details and events
   */
  async getTransferStatus(txHash: string): Promise<TransferStatus> {
    this.provider.ensureConnected()

    if (!txHash) {
      throw new ValidationError('Transaction hash is required')
    }

    try {
      // Connect to query the blockchain
      const client = await SigningStargateClient.connect(
        (this.provider as any).config.rpcEndpoint
      )

      // Get the transaction from the chain
      const tx = await client.getTx(txHash)

      if (!tx) {
        return {
          txHash,
          status: 'pending',
          error: 'Transaction not found'
        }
      }

      // Get block data for timestamp
      const block = await client.getBlock(tx.height)

      // Check for IBC acknowledgement events in the transaction logs
      let acknowledgement: string | undefined
      let hasAckEvent = false

      if (tx.events) {
        for (const event of tx.events) {
          if (event.type === 'acknowledge_packet' || event.type === 'write_acknowledgement') {
            hasAckEvent = true
            const ackAttr = event.attributes?.find((attr: any) =>
              attr.key === 'packet_ack' || attr.key === 'acknowledgement'
            )
            if (ackAttr) {
              acknowledgement = ackAttr.value
            }
          }
        }
      }

      // Determine status based on transaction code and events
      let status: 'pending' | 'success' | 'failed' | 'timeout'
      if (tx.code !== 0) {
        status = 'failed'
      } else if (hasAckEvent) {
        status = 'success'
      } else {
        status = 'pending'
      }

      return {
        txHash,
        status,
        height: tx.height,
        timestamp: block.header.time,
        acknowledgement,
        error: tx.code !== 0 ? tx.rawLog : undefined
      }
    } catch (error) {
      throw new NetworkError('Failed to get transfer status', { error })
    }
  }

  /**
   * Get default timeout timestamp (10 minutes from now)
   */
  private getDefaultTimeout(): bigint {
    const nowInNano = BigInt(Date.now()) * 1_000_000n
    return nowInNano + this.DEFAULT_TIMEOUT_OFFSET
  }

  /**
   * Calculate timeout height based on current height
   */
  async calculateTimeoutHeight(blocksInFuture: number = 100): Promise<Height> {
    this.provider.ensureConnected()
    validatePositiveNumber(blocksInFuture, 'Blocks in future')


    if (blocksInFuture <= 0) {
      throw new ValidationError('Blocks in future must be positive')
    }

    try {
      // In a real implementation, this would query the current chain height
      const currentHeight = await this.provider.getClient().getHeight()

      return {
        revisionNumber: 0n, // Typically 0 for most chains
        revisionHeight: BigInt(currentHeight + blocksInFuture)
      }
    } catch (error) {
      throw new NetworkError('Failed to calculate timeout height', { error })
    }
  }

  /**
   * Validate an IBC transfer before execution
   */
  async validateTransfer(params: IBCTransferParams): Promise<{
    valid: boolean
    errors: string[]
  }> {
    const errors: string[] = []

    // Check channel exists and is open
    try {
      const channel = await this.getChannel(params.sourceChannel)
      if (channel.state !== 'STATE_OPEN') {
        errors.push(`Channel ${params.sourceChannel} is not in open state`)
      }
    } catch (error) {
      errors.push(`Channel ${params.sourceChannel} not found`)
    }

    // Validate token amount
    try {
      const amount = BigInt(params.token.amount)
      if (amount <= 0n) {
        errors.push('Token amount must be positive')
      }
    } catch {
      errors.push('Invalid token amount')
    }

    // Validate receiver address format
    if (!params.receiver || params.receiver.length < 20) {
      errors.push('Invalid receiver address format')
    }

    // Validate timeout
    if (params.timeoutTimestamp) {
      const now = BigInt(Date.now()) * 1_000_000n
      if (params.timeoutTimestamp <= now) {
        errors.push('Timeout must be in the future')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Get IBC denom trace for a token
   */
  async getDenomTrace(denom: string): Promise<{
    path: string
    baseDenom: string
    hash: string
  } | null> {
    this.provider.ensureConnected()

    if (!denom) {
      throw new ValidationError('Denom is required')
    }

    // Check if this is an IBC denom (starts with "ibc/")
    if (!denom.startsWith('ibc/')) {
      return null
    }

    try {
      const apiEndpoint = (this.provider as any).config.apiEndpoint
      const hash = denom.replace('ibc/', '')

      const response = await fetch(
        `${apiEndpoint}/ibc/apps/transfer/v1/denom_traces/${hash}`
      )

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return {
        path: data.denom_trace.path,
        baseDenom: data.denom_trace.base_denom,
        hash
      }
    } catch (error) {
      throw new NetworkError('Failed to get denom trace', { error })
    }
  }
}

export type { IBCTransferResult }
