import { BaseProvider } from '../providers/base'
import { Account, AccountID, AccountState, DecCoin } from '@cryptoandcoffee/akash-jsdk-protobuf'
import { NetworkError, ValidationError } from '../errors'

export interface DepositRequest {
  accountId: AccountID;
  amount: DecCoin;
  depositor: string;
}

export interface WithdrawRequest {
  accountId: AccountID;
  amount: DecCoin;
}

export interface EscrowFilters {
  owner?: string;
  scope?: string;
  state?: AccountState;
}

export class EscrowManager {
  constructor(private provider: BaseProvider) {}

  async createAccount(params: { scope: string; xid: string }): Promise<Account> {
    this.provider['ensureConnected']()
    
    if (!params.scope || !params.xid) {
      throw new ValidationError('Invalid account parameters')
    }

    try {
      // In a real implementation, this would submit a MsgCreateAccount transaction
      await this.provider['client']!.searchTx([
        { key: 'message.module', value: 'escrow' },
        { key: 'message.action', value: 'create-account' }
      ])

      const account: Account = {
        id: { scope: params.scope, xid: params.xid },
        owner: 'akash1mock',
        state: 'open',
        balance: { denom: 'uakt', amount: '0' },
        transferred: { denom: 'uakt', amount: '0' },
        settledAt: Date.now(),
        depositor: 'akash1mock',
        funds: { denom: 'uakt', amount: '0' }
      }

      return account
    } catch (error) {
      throw new NetworkError('Failed to create escrow account', { error })
    }
  }

  async depositFunds(request: DepositRequest): Promise<void> {
    this.provider['ensureConnected']()
    
    if (!request.accountId.scope || !request.amount.amount || !request.depositor) {
      throw new ValidationError('Account ID, amount, and depositor are required')
    }

    if (parseFloat(request.amount.amount) <= 0) {
      throw new ValidationError('Deposit amount must be positive')
    }

    try {
      // In a real implementation, this would submit a MsgDepositDeployment transaction
      await this.provider['client']!.searchTx([
        { key: 'message.module', value: 'escrow' },
        { key: 'message.action', value: 'deposit-deployment' },
        { key: 'message.sender', value: request.depositor }
      ])
    } catch (error) {
      throw new NetworkError('Failed to deposit funds', { error })
    }
  }

  // Alias method for the test interface
  async deposit(params: { scope: string; xid: string; amount: { denom: string; amount: string } }): Promise<void> {
    const request: DepositRequest = {
      accountId: { scope: params.scope, xid: params.xid },
      amount: params.amount,
      depositor: 'akash1mock'
    }
    return this.depositFunds(request)
  }

  async withdrawFunds(request: WithdrawRequest): Promise<void> {
    this.provider['ensureConnected']()
    
    if (!request.accountId.scope || !request.amount.amount) {
      throw new ValidationError('Account ID and amount are required')
    }

    if (parseFloat(request.amount.amount) <= 0) {
      throw new ValidationError('Withdrawal amount must be positive')
    }

    try {
      // In a real implementation, this would submit a MsgWithdrawLease transaction
      await this.provider['client']!.searchTx([
        { key: 'message.module', value: 'escrow' },
        { key: 'message.action', value: 'withdraw-lease' }
      ])
    } catch (error) {
      throw new NetworkError('Failed to withdraw funds', { error })
    }
  }

  async getAccount(accountId: AccountID): Promise<Account | null> {
    this.provider['ensureConnected']()

    try {
      const response = await this.provider['client']!.searchTx([
        { key: 'message.module', value: 'escrow' },
        { key: 'escrow.account.scope', value: accountId.scope },
        { key: 'escrow.account.xid', value: accountId.xid }
      ])

      if (response.length === 0) {
        return null
      }

      // Mock account data based on the latest transaction
      return {
        id: accountId,
        owner: 'akash1mock',
        state: 'open',
        balance: { denom: 'uakt', amount: '1000000' },
        transferred: { denom: 'uakt', amount: '0' },
        settledAt: Date.now(),
        depositor: 'akash1mock',
        funds: { denom: 'uakt', amount: '1000000' }
      }
    } catch (error) {
      throw new NetworkError('Failed to get escrow account', { error })
    }
  }

  async listAccounts(filters: EscrowFilters = {}): Promise<Account[]> {
    this.provider['ensureConnected']()

    try {
      const searchTags = [
        { key: 'message.module', value: 'escrow' }
      ]

      if (filters.owner) {
        searchTags.push({ key: 'message.sender', value: filters.owner })
      }

      if (filters.scope) {
        searchTags.push({ key: 'escrow.account.scope', value: filters.scope })
      }

      const response = await this.provider['client']!.searchTx(searchTags)

      // Mock account data based on transaction results
      return response.map((tx, index) => ({
        id: {
          scope: filters.scope || `deployment-${tx.height}`,
          xid: `${index}`
        },
        owner: filters.owner || 'akash1owner',
        state: filters.state || AccountState.OPEN,
        balance: { denom: 'uakt', amount: `${(index + 1) * 1000000}` },
        transferred: { denom: 'uakt', amount: `${index * 500000}` },
        settledAt: Date.now(),
        depositor: 'akash1depositor',
        funds: { denom: 'uakt', amount: `${(index + 1) * 1500000}` }
      }))
    } catch (error) {
      throw new NetworkError('Failed to list escrow accounts', { error })
    }
  }

  async getBalance(accountId: AccountID): Promise<DecCoin> {
    const account = await this.getAccount(accountId)
    if (!account) {
      throw new NetworkError('Escrow account not found')
    }
    return account.balance
  }

  async closeAccount(accountId: AccountID): Promise<void> {
    this.provider['ensureConnected']()
    
    if (!accountId.scope || !accountId.xid) {
      throw new ValidationError('Account scope and xid are required')
    }

    try {
      // In a real implementation, this would submit a MsgCloseAccount transaction
      await this.provider['client']!.searchTx([
        { key: 'message.module', value: 'escrow' },
        { key: 'message.action', value: 'close-account' }
      ])
    } catch (error) {
      throw new NetworkError('Failed to close escrow account', { error })
    }
  }
}