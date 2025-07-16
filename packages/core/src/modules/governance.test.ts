import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GovernanceManager } from './governance'
import { AkashProvider } from '../providers/akash'
import { VoteOption } from '@cryptoandcoffee/akash-jsdk-protobuf'

// Helper function to create mock IndexedTx objects
const createMockTx = (height: number, hash: string = `tx-hash-${height}`) => ({
  height,
  txIndex: 0,
  hash,
  code: 0,
  events: [],
  rawLog: '',
  tx: new Uint8Array(),
  msgResponses: [],
  gasUsed: BigInt(50000),
  gasWanted: BigInt(60000)
})

// Mock the provider
const mockProvider = {
  client: {
    searchTx: vi.fn()
  },
  ensureConnected: vi.fn()
} as unknown as AkashProvider

describe('GovernanceManager', () => {
  let governanceManager: GovernanceManager

  beforeEach(() => {
    governanceManager = new GovernanceManager(mockProvider)
    vi.clearAllMocks()
  })

  describe('submitProposal', () => {
    it('should submit proposal successfully', async () => {
      const proposalParams = {
        title: 'Test Proposal',
        description: 'A test governance proposal',
        proposer: 'akash1test',
        initialDeposit: [{ denom: 'uakt', amount: '10000000' }]
      }

      const mockTx = createMockTx(12345, 'proposal-tx-hash')

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await governanceManager.submitProposal(proposalParams)

      expect(result).toBe('12345') // proposal ID based on height
    })

    it('should throw error for invalid proposal parameters', async () => {
      const invalidParams = {
        title: '',
        description: '',
        proposer: '',
        initialDeposit: []
      }

      await expect(governanceManager.submitProposal(invalidParams)).rejects.toThrow('Invalid proposal parameters')
    })

    it('should throw error for missing initial deposit', async () => {
      const invalidParams = {
        title: 'Valid Title',
        description: 'Valid Description',
        proposer: 'akash1test',
        initialDeposit: []
      }

      await expect(governanceManager.submitProposal(invalidParams)).rejects.toThrow('Invalid proposal parameters')
    })

    it('should handle empty response during proposal submission', async () => {
      const proposalParams = {
        title: 'Test Proposal',
        description: 'A test governance proposal',
        proposer: 'akash1test',
        initialDeposit: [{ denom: 'uakt', amount: '10000000' }]
      }

      // Mock empty response to trigger the fallback case
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await governanceManager.submitProposal(proposalParams)

      expect(result).toBe('12345') // fallback proposal ID
    })

    it('should handle network errors during proposal submission', async () => {
      const proposalParams = {
        title: 'Test Proposal',
        description: 'A test governance proposal',
        proposer: 'akash1test',
        initialDeposit: [{ denom: 'uakt', amount: '10000000' }]
      }

      const networkError = new Error('Network connection failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(governanceManager.submitProposal(proposalParams)).rejects.toThrow('Failed to submit proposal')
    })
  })

  describe('vote', () => {
    it('should vote on proposal successfully', async () => {
      const voteParams = {
        proposalId: '123',
        voter: 'akash1voter',
        option: VoteOption.YES
      }

      const mockTx = createMockTx(12346, 'vote-tx-hash')

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      await governanceManager.vote(voteParams)

      expect(mockProvider['client']!.searchTx).toHaveBeenCalled()
    })

    it('should throw error for invalid vote option', async () => {
      const invalidVoteParams = {
        proposalId: '123',
        voter: 'akash1voter',
        option: 'INVALID_OPTION' as any
      }

      await expect(governanceManager.vote(invalidVoteParams)).rejects.toThrow('Invalid vote option')
    })

    it('should throw error for missing vote parameters', async () => {
      const invalidVoteParams = {
        proposalId: '',
        voter: 'akash1voter',
        option: VoteOption.YES
      }

      await expect(governanceManager.vote(invalidVoteParams)).rejects.toThrow('Proposal ID, voter, and vote option are required')
    })

    it('should throw error for missing voter', async () => {
      const invalidVoteParams = {
        proposalId: '123',
        voter: '',
        option: VoteOption.YES
      }

      await expect(governanceManager.vote(invalidVoteParams)).rejects.toThrow('Proposal ID, voter, and vote option are required')
    })

    it('should throw error for undefined vote option', async () => {
      const invalidVoteParams = {
        proposalId: '123',
        voter: 'akash1voter',
        option: undefined as any
      }

      await expect(governanceManager.vote(invalidVoteParams)).rejects.toThrow('Proposal ID, voter, and vote option are required')
    })

    it('should handle network errors during vote submission', async () => {
      const voteParams = {
        proposalId: '123',
        voter: 'akash1voter',
        option: VoteOption.YES
      }

      const networkError = new Error('Network connection failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(governanceManager.vote(voteParams)).rejects.toThrow('Failed to submit vote')
    })
  })

  describe('getProposal', () => {
    it('should get proposal by ID', async () => {
      const proposalId = '123'
      const mockTxs = [createMockTx(123, 'proposal-tx-hash')]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await governanceManager.getProposal(proposalId)

      expect(result).toMatchObject({
        proposalId,
        title: 'Mock Proposal',
        description: 'Mock proposal description',
        status: 'PROPOSAL_STATUS_VOTING_PERIOD',
        submitTime: expect.any(String),
        votingStartTime: expect.any(String),
        votingEndTime: expect.any(String)
      })
    })

    it('should return null for non-existent proposal', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await governanceManager.getProposal('999')

      expect(result).toBeNull()
    })

    it('should throw error for missing proposal ID in getProposal', async () => {
      await expect(governanceManager.getProposal('')).rejects.toThrow('Proposal ID is required')
    })

    it('should handle network errors during getProposal', async () => {
      const proposalId = '123'
      
      const networkError = new Error('Network connection failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(governanceManager.getProposal(proposalId)).rejects.toThrow('Failed to get proposal')
    })
  })

  describe('deposit', () => {
    it('should deposit to proposal successfully', async () => {
      const depositParams = {
        proposalId: '123',
        depositor: 'akash1depositor',
        amount: [{ denom: 'uakt', amount: '5000000' }]
      }

      const mockTx = createMockTx(12347, 'deposit-tx-hash')

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      await governanceManager.deposit(depositParams)

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'gov' },
        { key: 'message.action', value: 'deposit' },
        { key: 'message.sender', value: 'akash1depositor' }
      ])
    })

    it('should throw error for missing proposal ID', async () => {
      const invalidParams = {
        proposalId: '',
        depositor: 'akash1depositor',
        amount: [{ denom: 'uakt', amount: '5000000' }]
      }

      await expect(governanceManager.deposit(invalidParams)).rejects.toThrow('Proposal ID, depositor, and amount are required')
    })

    it('should throw error for missing depositor', async () => {
      const invalidParams = {
        proposalId: '123',
        depositor: '',
        amount: [{ denom: 'uakt', amount: '5000000' }]
      }

      await expect(governanceManager.deposit(invalidParams)).rejects.toThrow('Proposal ID, depositor, and amount are required')
    })

    it('should throw error for empty amount array', async () => {
      const invalidParams = {
        proposalId: '123',
        depositor: 'akash1depositor',
        amount: []
      }

      await expect(governanceManager.deposit(invalidParams)).rejects.toThrow('Proposal ID, depositor, and amount are required')
    })

    it('should throw error for missing amount', async () => {
      const invalidParams = {
        proposalId: '123',
        depositor: 'akash1depositor',
        amount: undefined as any
      }

      await expect(governanceManager.deposit(invalidParams)).rejects.toThrow('Proposal ID, depositor, and amount are required')
    })

    it('should handle network error during deposit', async () => {
      const depositParams = {
        proposalId: '123',
        depositor: 'akash1depositor',
        amount: [{ denom: 'uakt', amount: '5000000' }]
      }

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(governanceManager.deposit(depositParams)).rejects.toThrow('Failed to submit deposit')
    })
  })

  describe('listProposals', () => {
    it('should list all proposals without filters', async () => {
      const mockTxs = [
        createMockTx(100, 'proposal-tx-1'),
        createMockTx(101, 'proposal-tx-2')
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await governanceManager.listProposals()

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        id: '1',
        proposalId: '1',
        content: {
          title: 'Proposal 1',
          description: 'Description for proposal 1'
        },
        status: expect.any(Number),
        finalTallyResult: {
          yes: '1000000',
          abstain: '100000',
          no: '50000',
          noWithVeto: '10000'
        }
      })
      expect(result[1]).toMatchObject({
        id: '2',
        proposalId: '2',
        content: {
          title: 'Proposal 2',
          description: 'Description for proposal 2'
        }
      })
    })

    it('should list proposals with voter filter', async () => {
      const mockTxs = [createMockTx(100, 'proposal-tx-1')]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await governanceManager.listProposals({ voter: 'akash1voter' })

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'gov' },
        { key: 'message.sender', value: 'akash1voter' }
      ])
      expect(result).toHaveLength(1)
    })

    it('should list proposals with depositor filter', async () => {
      const mockTxs = [createMockTx(100, 'proposal-tx-1')]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await governanceManager.listProposals({ depositor: 'akash1depositor' })

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'gov' },
        { key: 'message.sender', value: 'akash1depositor' }
      ])
      expect(result).toHaveLength(1)
    })

    it('should list proposals with status filter', async () => {
      const mockTxs = [createMockTx(100, 'proposal-tx-1')]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await governanceManager.listProposals({ status: 'PROPOSAL_STATUS_PASSED' as any })

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('PROPOSAL_STATUS_PASSED')
    })

    it('should list proposals with multiple filters', async () => {
      const mockTxs = [createMockTx(100, 'proposal-tx-1')]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await governanceManager.listProposals({ 
        voter: 'akash1voter',
        depositor: 'akash1depositor',
        status: 'PROPOSAL_STATUS_VOTING_PERIOD' as any
      })

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'gov' },
        { key: 'message.sender', value: 'akash1voter' },
        { key: 'message.sender', value: 'akash1depositor' }
      ])
      expect(result).toHaveLength(1)
    })

    it('should return empty array when no proposals found', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await governanceManager.listProposals()

      expect(result).toHaveLength(0)
    })

    it('should handle network error during list proposals', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(governanceManager.listProposals()).rejects.toThrow('Failed to list proposals')
    })
  })

  describe('getVote', () => {
    it('should get vote for proposal and voter', async () => {
      const proposalId = '123'
      const voter = 'akash1voter'
      const mockTxs = [createMockTx(125, 'vote-tx-1')]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await governanceManager.getVote(proposalId, voter)

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'gov' },
        { key: 'message.action', value: 'vote' },
        { key: 'proposal.id', value: proposalId },
        { key: 'message.sender', value: voter }
      ])
      expect(result).toMatchObject({
        option: VoteOption.YES,
        metadata: 'Vote cast via SDK'
      })
    })

    it('should return null when vote not found', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await governanceManager.getVote('123', 'akash1voter')

      expect(result).toBeNull()
    })

    it('should throw error for missing proposal ID', async () => {
      await expect(governanceManager.getVote('', 'akash1voter')).rejects.toThrow('Proposal ID and voter are required')
    })

    it('should throw error for missing voter', async () => {
      await expect(governanceManager.getVote('123', '')).rejects.toThrow('Proposal ID and voter are required')
    })

    it('should throw error for missing both proposal ID and voter', async () => {
      await expect(governanceManager.getVote('', '')).rejects.toThrow('Proposal ID and voter are required')
    })

    it('should handle network error during get vote', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(governanceManager.getVote('123', 'akash1voter')).rejects.toThrow('Failed to get vote')
    })
  })

  describe('getDeposits', () => {
    it('should get deposits for proposal', async () => {
      const proposalId = '123'
      const mockTxs = [
        createMockTx(120, 'deposit-tx-1'),
        createMockTx(121, 'deposit-tx-2')
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await governanceManager.getDeposits(proposalId)

      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'gov' },
        { key: 'message.action', value: 'deposit' },
        { key: 'proposal.id', value: proposalId }
      ])
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        depositor: 'akash1depositor0',
        amount: [{ denom: 'uakt', amount: '1000000' }]
      })
      expect(result[1]).toMatchObject({
        depositor: 'akash1depositor1',
        amount: [{ denom: 'uakt', amount: '2000000' }]
      })
    })

    it('should return empty array when no deposits found', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await governanceManager.getDeposits('123')

      expect(result).toHaveLength(0)
    })

    it('should throw error for missing proposal ID', async () => {
      await expect(governanceManager.getDeposits('')).rejects.toThrow('Proposal ID is required')
    })

    it('should handle network error during get deposits', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(governanceManager.getDeposits('123')).rejects.toThrow('Failed to get deposits')
    })

    it('should handle single deposit correctly', async () => {
      const proposalId = '123'
      const mockTxs = [createMockTx(120, 'deposit-tx-1')]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await governanceManager.getDeposits(proposalId)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        depositor: 'akash1depositor0',
        amount: [{ denom: 'uakt', amount: '1000000' }]
      })
    })
  })

  describe('getVotes', () => {
    it('should get votes for proposal', async () => {
      const proposalId = '123'
      const mockTxs = [createMockTx(125, 'vote-tx-1')]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await governanceManager.getVotes(proposalId)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        proposalId,
        voter: 'akash1mock',
        option: 'VOTE_OPTION_YES'
      })
    })

    it('should throw error for missing proposal ID in getVotes', async () => {
      await expect(governanceManager.getVotes('')).rejects.toThrow('Proposal ID is required')
    })

    it('should handle network errors during getVotes', async () => {
      const proposalId = '123'
      
      const networkError = new Error('Network connection failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(governanceManager.getVotes(proposalId)).rejects.toThrow('Failed to get votes')
    })
  })

  describe('getTallyResult', () => {
    it('should get tally result for proposal', async () => {
      const proposalId = '123'
      
      const mockVoteTxs = [
        createMockTx(125, 'vote-tx-1'),
        createMockTx(126, 'vote-tx-2')
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockVoteTxs)

      const result = await governanceManager.getTallyResult(proposalId)

      expect(result).toMatchObject({
        yes: '1000000',
        abstain: '1000000',
        no: '0',
        noWithVeto: '0'
      })
    })

    it('should throw error for missing proposal ID in getTallyResult', async () => {
      await expect(governanceManager.getTallyResult('')).rejects.toThrow('Proposal ID is required')
    })

    it('should handle network errors during getTallyResult', async () => {
      const proposalId = '123'
      
      const networkError = new Error('Network connection failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(governanceManager.getTallyResult(proposalId)).rejects.toThrow('Failed to get tally result')
    })
  })

  describe('getParams', () => {
    it('should get governance parameters', async () => {
      const result = await governanceManager.getParams()

      expect(result).toMatchObject({
        votingParams: {
          votingPeriod: '172800s'
        },
        depositParams: {
          minDeposit: [{ denom: 'uakt', amount: '10000000' }],
          maxDepositPeriod: '172800s'
        },
        tallyParams: {
          quorum: '0.334000000000000000',
          threshold: '0.500000000000000000',
          vetoThreshold: '0.334000000000000000'
        }
      })
    })
  })
})