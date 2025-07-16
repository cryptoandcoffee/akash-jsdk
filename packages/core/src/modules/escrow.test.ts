import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EscrowManager } from './escrow'
import { AkashProvider } from '../providers/akash'

// Mock the provider
const mockProvider = {
  client: {
    searchTx: vi.fn()
  },
  ensureConnected: vi.fn()
} as unknown as AkashProvider

describe('EscrowManager', () => {
  let escrowManager: EscrowManager

  beforeEach(() => {
    escrowManager = new EscrowManager(mockProvider)
    vi.clearAllMocks()
  })

  describe('createAccount', () => {
    it('should create escrow account successfully', async () => {
      const accountParams = {
        scope: 'deployment',
        xid: '123'
      }

      const mockTx = {
        height: 12345,
        txIndex: 0,
        hash: 'escrow-tx-hash',
        code: 0,
        events: [],
        rawLog: '',
        tx: new Uint8Array(),
        msgResponses: [],
        gasUsed: 50000n,
        gasWanted: 60000n
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await escrowManager.createAccount(accountParams)

      expect(result).toMatchObject({
        id: {
          scope: accountParams.scope,
          xid: accountParams.xid
        },
        owner: 'akash1mock',
        state: 'open',
        balance: { denom: 'uakt', amount: '0' },
        transferred: { denom: 'uakt', amount: '0' }
      })
    })

    it('should throw error for invalid account parameters', async () => {
      const invalidParams = {
        scope: '',
        xid: ''
      }

      await expect(escrowManager.createAccount(invalidParams)).rejects.toThrow('Invalid account parameters')
    })
  })

  describe('deposit', () => {
    it('should deposit funds successfully', async () => {
      const depositParams = {
        scope: 'deployment',
        xid: '123',
        amount: { denom: 'uakt', amount: '1000000' }
      }

      const mockTx = {
        height: 12346,
        txIndex: 0,
        hash: 'deposit-tx-hash',
        code: 0,
        events: [],
        rawLog: '',
        tx: new Uint8Array(),
        msgResponses: [],
        gasUsed: 50000n,
        gasWanted: 60000n
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      await escrowManager.deposit(depositParams)

      expect(mockProvider['client']!.searchTx).toHaveBeenCalled()
    })
  })

  describe('getAccount', () => {
    it('should get escrow account details', async () => {
      const accountId = {
        scope: 'deployment',
        xid: '123'
      }

      const mockTxs = [
        {
          height: 12345,
          txIndex: 0,
          hash: 'account-tx-hash',
          code: 0,
          events: [],
          rawLog: '',
          tx: new Uint8Array(),
          msgResponses: [],
          gasUsed: 50000n,
          gasWanted: 60000n
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await escrowManager.getAccount(accountId)

      expect(result).toMatchObject({
        id: accountId,
        owner: 'akash1mock',
        state: 'open',
        balance: { denom: 'uakt', amount: '1000000' },
        transferred: { denom: 'uakt', amount: '0' }
      })
    })

    it('should return null for non-existent account', async () => {
      const accountId = {
        scope: 'deployment',
        xid: '999'
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await escrowManager.getAccount(accountId)

      expect(result).toBeNull()
    })
  })

  describe('getBalance', () => {
    it('should get account balance', async () => {
      const accountId = {
        scope: 'deployment',
        xid: '123'
      }

      const mockTxs = [
        {
          height: 12345,
          txIndex: 0,
          hash: 'balance-tx-hash',
          code: 0,
          events: [],
          rawLog: '',
          tx: new Uint8Array(),
          msgResponses: [],
          gasUsed: 50000n,
          gasWanted: 60000n
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await escrowManager.getBalance(accountId)

      expect(result).toEqual({
        denom: 'uakt',
        amount: '1000000'
      })
    })

    it('should throw error for non-existent account', async () => {
      const accountId = {
        scope: 'deployment',
        xid: '999'
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      await expect(escrowManager.getBalance(accountId)).rejects.toThrow('Escrow account not found')
    })
  })

  describe('withdrawFunds', () => {
    it('should withdraw funds successfully', async () => {
      const withdrawRequest = {
        accountId: { scope: 'deployment', xid: '123' },
        amount: { denom: 'uakt', amount: '500000' }
      }

      const mockTx = {
        height: 12347,
        txIndex: 0,
        hash: 'withdraw-tx-hash',
        code: 0,
        events: [],
        rawLog: '',
        tx: new Uint8Array(),
        msgResponses: [],
        gasUsed: 45000n,
        gasWanted: 55000n
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      await escrowManager.withdrawFunds(withdrawRequest)

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'escrow' },
        { key: 'message.action', value: 'withdraw-lease' }
      ])
    })

    it('should throw validation error for missing account scope', async () => {
      const invalidRequest = {
        accountId: { scope: '', xid: '123' },
        amount: { denom: 'uakt', amount: '500000' }
      }

      await expect(escrowManager.withdrawFunds(invalidRequest)).rejects.toThrow('Account ID and amount are required')
    })

    it('should throw validation error for missing amount', async () => {
      const invalidRequest = {
        accountId: { scope: 'deployment', xid: '123' },
        amount: { denom: 'uakt', amount: '' }
      }

      await expect(escrowManager.withdrawFunds(invalidRequest)).rejects.toThrow('Account ID and amount are required')
    })

    it('should throw validation error for negative amount', async () => {
      const invalidRequest = {
        accountId: { scope: 'deployment', xid: '123' },
        amount: { denom: 'uakt', amount: '-100' }
      }

      await expect(escrowManager.withdrawFunds(invalidRequest)).rejects.toThrow('Withdrawal amount must be positive')
    })

    it('should throw validation error for zero amount', async () => {
      const invalidRequest = {
        accountId: { scope: 'deployment', xid: '123' },
        amount: { denom: 'uakt', amount: '0' }
      }

      await expect(escrowManager.withdrawFunds(invalidRequest)).rejects.toThrow('Withdrawal amount must be positive')
    })

    it('should throw network error when transaction fails', async () => {
      const withdrawRequest = {
        accountId: { scope: 'deployment', xid: '123' },
        amount: { denom: 'uakt', amount: '500000' }
      }

      const networkError = new Error('Network connection failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(escrowManager.withdrawFunds(withdrawRequest)).rejects.toThrow('Failed to withdraw funds')
    })
  })

  describe('listAccounts', () => {
    it('should list all accounts without filters', async () => {
      const mockTxs = [
        {
          height: 12345,
          txIndex: 0,
          hash: 'account1-tx-hash',
          code: 0,
          events: [],
          rawLog: '',
          tx: new Uint8Array(),
          msgResponses: [],
          gasUsed: 50000n,
          gasWanted: 60000n
        },
        {
          height: 12346,
          txIndex: 1,
          hash: 'account2-tx-hash',
          code: 0,
          events: [],
          rawLog: '',
          tx: new Uint8Array(),
          msgResponses: [],
          gasUsed: 52000n,
          gasWanted: 62000n
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await escrowManager.listAccounts()

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        id: { scope: 'deployment-12345', xid: '0' },
        owner: 'akash1owner',
        state: 1,
        balance: { denom: 'uakt', amount: '1000000' },
        transferred: { denom: 'uakt', amount: '0' },
        depositor: 'akash1depositor',
        funds: { denom: 'uakt', amount: '1500000' }
      })
      expect(result[1]).toMatchObject({
        id: { scope: 'deployment-12346', xid: '1' },
        owner: 'akash1owner',
        state: 1,
        balance: { denom: 'uakt', amount: '2000000' },
        transferred: { denom: 'uakt', amount: '500000' },
        depositor: 'akash1depositor',
        funds: { denom: 'uakt', amount: '3000000' }
      })

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'escrow' }
      ])
    })

    it('should list accounts with owner filter', async () => {
      const filters = { owner: 'akash1specificowner' }
      const mockTxs = [
        {
          height: 12345,
          txIndex: 0,
          hash: 'filtered-tx-hash',
          code: 0,
          events: [],
          rawLog: '',
          tx: new Uint8Array(),
          msgResponses: [],
          gasUsed: 50000n,
          gasWanted: 60000n
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await escrowManager.listAccounts(filters)

      expect(result).toHaveLength(1)
      expect(result[0].owner).toBe('akash1specificowner')

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'escrow' },
        { key: 'message.sender', value: 'akash1specificowner' }
      ])
    })

    it('should list accounts with scope filter', async () => {
      const filters = { scope: 'specific-deployment' }
      const mockTxs = [
        {
          height: 12345,
          txIndex: 0,
          hash: 'scoped-tx-hash',
          code: 0,
          events: [],
          rawLog: '',
          tx: new Uint8Array(),
          msgResponses: [],
          gasUsed: 50000n,
          gasWanted: 60000n
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await escrowManager.listAccounts(filters)

      expect(result).toHaveLength(1)
      expect(result[0].id.scope).toBe('specific-deployment')

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'escrow' },
        { key: 'escrow.account.scope', value: 'specific-deployment' }
      ])
    })

    it('should list accounts with state filter', async () => {
      const filters = { state: 2 as any }
      const mockTxs = [
        {
          height: 12345,
          txIndex: 0,
          hash: 'closed-tx-hash',
          code: 0,
          events: [],
          rawLog: '',
          tx: new Uint8Array(),
          msgResponses: [],
          gasUsed: 50000n,
          gasWanted: 60000n
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await escrowManager.listAccounts(filters)

      expect(result).toHaveLength(1)
      expect(result[0].state).toBe(2)

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'escrow' }
      ])
    })

    it('should list accounts with multiple filters', async () => {
      const filters = {
        owner: 'akash1multiowner',
        scope: 'multi-deployment',
        state: 1 as any
      }
      const mockTxs = [
        {
          height: 12345,
          txIndex: 0,
          hash: 'multi-filter-tx-hash',
          code: 0,
          events: [],
          rawLog: '',
          tx: new Uint8Array(),
          msgResponses: [],
          gasUsed: 50000n,
          gasWanted: 60000n
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await escrowManager.listAccounts(filters)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        owner: 'akash1multiowner',
        state: 1,
        id: { scope: 'multi-deployment' }
      })

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'escrow' },
        { key: 'message.sender', value: 'akash1multiowner' },
        { key: 'escrow.account.scope', value: 'multi-deployment' }
      ])
    })

    it('should return empty array when no accounts found', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await escrowManager.listAccounts()

      expect(result).toEqual([])
    })

    it('should throw network error when transaction search fails', async () => {
      const networkError = new Error('Search failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(escrowManager.listAccounts()).rejects.toThrow('Failed to list escrow accounts')
    })
  })

  describe('closeAccount', () => {
    it('should close account successfully', async () => {
      const accountId = { scope: 'deployment', xid: '123' }

      const mockTx = {
        height: 12348,
        txIndex: 0,
        hash: 'close-tx-hash',
        code: 0,
        events: [],
        rawLog: '',
        tx: new Uint8Array(),
        msgResponses: [],
        gasUsed: 40000n,
        gasWanted: 50000n
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      await escrowManager.closeAccount(accountId)

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'escrow' },
        { key: 'message.action', value: 'close-account' }
      ])
    })

    it('should throw validation error for missing scope', async () => {
      const invalidAccountId = { scope: '', xid: '123' }

      await expect(escrowManager.closeAccount(invalidAccountId)).rejects.toThrow('Account scope and xid are required')
    })

    it('should throw validation error for missing xid', async () => {
      const invalidAccountId = { scope: 'deployment', xid: '' }

      await expect(escrowManager.closeAccount(invalidAccountId)).rejects.toThrow('Account scope and xid are required')
    })

    it('should throw validation error for missing both scope and xid', async () => {
      const invalidAccountId = { scope: '', xid: '' }

      await expect(escrowManager.closeAccount(invalidAccountId)).rejects.toThrow('Account scope and xid are required')
    })

    it('should throw network error when transaction fails', async () => {
      const accountId = { scope: 'deployment', xid: '123' }
      const networkError = new Error('Close transaction failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(escrowManager.closeAccount(accountId)).rejects.toThrow('Failed to close escrow account')
    })
  })

  describe('depositFunds validation', () => {
    it('should throw validation error for missing depositor', async () => {
      const invalidRequest = {
        accountId: { scope: 'deployment', xid: '123' },
        amount: { denom: 'uakt', amount: '1000000' },
        depositor: ''
      }

      await expect(escrowManager.depositFunds(invalidRequest)).rejects.toThrow('Account ID, amount, and depositor are required')
    })

    it('should throw validation error for negative deposit amount', async () => {
      const invalidRequest = {
        accountId: { scope: 'deployment', xid: '123' },
        amount: { denom: 'uakt', amount: '-1000' },
        depositor: 'akash1depositor'
      }

      await expect(escrowManager.depositFunds(invalidRequest)).rejects.toThrow('Deposit amount must be positive')
    })

    it('should throw network error when deposit transaction fails', async () => {
      const depositRequest = {
        accountId: { scope: 'deployment', xid: '123' },
        amount: { denom: 'uakt', amount: '1000000' },
        depositor: 'akash1depositor'
      }

      const networkError = new Error('Deposit failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(escrowManager.depositFunds(depositRequest)).rejects.toThrow('Failed to deposit funds')
    })
  })

  describe('createAccount network errors', () => {
    it('should throw network error when create transaction fails', async () => {
      const accountParams = { scope: 'deployment', xid: '123' }
      const networkError = new Error('Create failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(escrowManager.createAccount(accountParams)).rejects.toThrow('Failed to create escrow account')
    })
  })

  describe('getAccount network errors', () => {
    it('should throw network error when get transaction fails', async () => {
      const accountId = { scope: 'deployment', xid: '123' }
      const networkError = new Error('Get failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(escrowManager.getAccount(accountId)).rejects.toThrow('Failed to get escrow account')
    })
  })
})