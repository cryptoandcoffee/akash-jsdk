import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StakingManager } from './staking'
import { AkashProvider } from '../providers/akash'
import { NetworkError, ValidationError } from '../errors'

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

describe('StakingManager', () => {
  let stakingManager: StakingManager
  const validValidatorAddress = 'akashvaloper1testvalidator1234567890123456789012'
  const validDelegatorAddress = 'akash1testdelegator1234567890123456789012'

  beforeEach(() => {
    stakingManager = new StakingManager(mockProvider)
    vi.clearAllMocks()
  })

  describe('delegate', () => {
    it('should delegate tokens successfully', async () => {
      const amount = { denom: 'uakt', amount: '1000000' }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345)
      ])

      const result = await stakingManager.delegate(validValidatorAddress, amount)

      expect(result.code).toBe(0)
      expect(result.transactionHash).toContain('delegate-')
      expect(result.height).toBeGreaterThan(0)
      expect(result.gasUsed).toBe(75000)
      expect(result.gasWanted).toBe(90000)
      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'staking' },
        { key: 'message.action', value: 'delegate' }
      ])
    })

    it('should throw error for missing validator address', async () => {
      const amount = { denom: 'uakt', amount: '1000000' }

      await expect(stakingManager.delegate('', amount)).rejects.toThrow(ValidationError)
      await expect(stakingManager.delegate('', amount)).rejects.toThrow('Validator address is required')
    })

    it('should throw error for invalid validator address format', async () => {
      const amount = { denom: 'uakt', amount: '1000000' }

      await expect(stakingManager.delegate('cosmos1invalid', amount)).rejects.toThrow(ValidationError)
      await expect(stakingManager.delegate('cosmos1invalid', amount)).rejects.toThrow('Invalid validator address format')
    })

    it('should throw error for missing amount', async () => {
      await expect(stakingManager.delegate(validValidatorAddress, null as any)).rejects.toThrow(ValidationError)
      await expect(stakingManager.delegate(validValidatorAddress, null as any)).rejects.toThrow('Valid amount is required')
    })

    it('should throw error for invalid amount', async () => {
      const invalidAmount = { denom: '', amount: '' }

      await expect(stakingManager.delegate(validValidatorAddress, invalidAmount)).rejects.toThrow(ValidationError)
      await expect(stakingManager.delegate(validValidatorAddress, invalidAmount)).rejects.toThrow('Valid amount is required')
    })

    it('should handle network errors during delegation', async () => {
      const amount = { denom: 'uakt', amount: '1000000' }
      const networkError = new Error('Network connection failed')

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(stakingManager.delegate(validValidatorAddress, amount)).rejects.toThrow(NetworkError)
      await expect(stakingManager.delegate(validValidatorAddress, amount)).rejects.toThrow('Failed to delegate tokens')
    })
  })

  describe('undelegate', () => {
    it('should undelegate tokens successfully', async () => {
      const amount = { denom: 'uakt', amount: '500000' }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12346)
      ])

      const result = await stakingManager.undelegate(validValidatorAddress, amount)

      expect(result.code).toBe(0)
      expect(result.transactionHash).toContain('undelegate-')
      expect(result.height).toBeGreaterThan(0)
      expect(result.gasUsed).toBe(85000)
      expect(result.gasWanted).toBe(100000)
      expect(result.unbondingTime).toBeDefined()
      expect(new Date(result.unbondingTime!).getTime()).toBeGreaterThan(Date.now())
    })

    it('should calculate correct unbonding time', async () => {
      const amount = { denom: 'uakt', amount: '500000' }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12346)
      ])

      const beforeTime = Date.now()
      const result = await stakingManager.undelegate(validValidatorAddress, amount)
      const afterTime = Date.now()

      const unbondingTime = new Date(result.unbondingTime!).getTime()
      const expectedMin = beforeTime + 21 * 24 * 60 * 60 * 1000
      const expectedMax = afterTime + 21 * 24 * 60 * 60 * 1000

      expect(unbondingTime).toBeGreaterThanOrEqual(expectedMin)
      expect(unbondingTime).toBeLessThanOrEqual(expectedMax)
    })

    it('should throw error for missing validator address', async () => {
      const amount = { denom: 'uakt', amount: '500000' }

      await expect(stakingManager.undelegate('', amount)).rejects.toThrow(ValidationError)
      await expect(stakingManager.undelegate('', amount)).rejects.toThrow('Validator address is required')
    })

    it('should throw error for invalid validator address format', async () => {
      const amount = { denom: 'uakt', amount: '500000' }

      await expect(stakingManager.undelegate('akash1invalid', amount)).rejects.toThrow(ValidationError)
      await expect(stakingManager.undelegate('akash1invalid', amount)).rejects.toThrow('Invalid validator address format')
    })

    it('should handle network errors during undelegation', async () => {
      const amount = { denom: 'uakt', amount: '500000' }
      const networkError = new Error('Connection timeout')

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(stakingManager.undelegate(validValidatorAddress, amount)).rejects.toThrow(NetworkError)
      await expect(stakingManager.undelegate(validValidatorAddress, amount)).rejects.toThrow('Failed to undelegate tokens')
    })
  })

  describe('redelegate', () => {
    const srcValidator = 'akashvaloper1srcvalidator12345678901234567890'
    const dstValidator = 'akashvaloper1dstvalidator12345678901234567890'

    it('should redelegate tokens successfully', async () => {
      const amount = { denom: 'uakt', amount: '750000' }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12347)
      ])

      const result = await stakingManager.redelegate(srcValidator, dstValidator, amount)

      expect(result.code).toBe(0)
      expect(result.transactionHash).toContain('redelegate-')
      expect(result.height).toBeGreaterThan(0)
      expect(result.gasUsed).toBe(95000)
      expect(result.gasWanted).toBe(110000)
      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'staking' },
        { key: 'message.action', value: 'begin_redelegate' }
      ])
    })

    it('should throw error for missing source validator', async () => {
      const amount = { denom: 'uakt', amount: '750000' }

      await expect(stakingManager.redelegate('', dstValidator, amount)).rejects.toThrow(ValidationError)
      await expect(stakingManager.redelegate('', dstValidator, amount)).rejects.toThrow('Source and destination validator addresses are required')
    })

    it('should throw error for missing destination validator', async () => {
      const amount = { denom: 'uakt', amount: '750000' }

      await expect(stakingManager.redelegate(srcValidator, '', amount)).rejects.toThrow(ValidationError)
    })

    it('should throw error for same source and destination validators', async () => {
      const amount = { denom: 'uakt', amount: '750000' }

      await expect(stakingManager.redelegate(srcValidator, srcValidator, amount)).rejects.toThrow(ValidationError)
      await expect(stakingManager.redelegate(srcValidator, srcValidator, amount)).rejects.toThrow('Source and destination validators must be different')
    })

    it('should throw error for invalid validator address format', async () => {
      const amount = { denom: 'uakt', amount: '750000' }

      await expect(stakingManager.redelegate('invalid', dstValidator, amount)).rejects.toThrow(ValidationError)
      await expect(stakingManager.redelegate('invalid', dstValidator, amount)).rejects.toThrow('Invalid validator address format')
    })

    it('should throw error for missing amount', async () => {
      await expect(stakingManager.redelegate(srcValidator, dstValidator, null as any)).rejects.toThrow(ValidationError)
      await expect(stakingManager.redelegate(srcValidator, dstValidator, null as any)).rejects.toThrow('Valid amount is required')
    })

    it('should handle network errors during redelegation', async () => {
      const amount = { denom: 'uakt', amount: '750000' }
      const networkError = new Error('RPC error')

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(stakingManager.redelegate(srcValidator, dstValidator, amount)).rejects.toThrow(NetworkError)
      await expect(stakingManager.redelegate(srcValidator, dstValidator, amount)).rejects.toThrow('Failed to redelegate tokens')
    })
  })

  describe('getValidators', () => {
    it('should get all validators successfully', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345),
        createMockTx(12346),
        createMockTx(12347),
        createMockTx(12348),
        createMockTx(12349)
      ])

      const validators = await stakingManager.getValidators()

      expect(validators).toHaveLength(5)
      expect(validators[0]).toHaveProperty('operatorAddress')
      expect(validators[0].operatorAddress).toMatch(/^akashvaloper1/)
      expect(validators[0]).toHaveProperty('status')
      expect(validators[0]).toHaveProperty('tokens')
      expect(validators[0]).toHaveProperty('description')
      expect(validators[0].description).toHaveProperty('moniker')
      expect(validators[0]).toHaveProperty('commission')
    })

    it('should filter validators by bonded status', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345),
        createMockTx(12346),
        createMockTx(12347)
      ])

      const validators = await stakingManager.getValidators('BOND_STATUS_BONDED')

      expect(validators).toHaveLength(3)
      validators.forEach(validator => {
        expect(validator.status).toBe('BOND_STATUS_BONDED')
      })
    })

    it('should filter validators by unbonding status', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345),
        createMockTx(12346)
      ])

      const validators = await stakingManager.getValidators('BOND_STATUS_UNBONDING')

      expect(validators).toHaveLength(2)
      validators.forEach(validator => {
        expect(validator.status).toBe('BOND_STATUS_UNBONDING')
      })
    })

    it('should handle network errors when getting validators', async () => {
      const networkError = new Error('API unavailable')

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(stakingManager.getValidators()).rejects.toThrow(NetworkError)
      await expect(stakingManager.getValidators()).rejects.toThrow('Failed to get validators')
    })
  })

  describe('getValidator', () => {
    it('should get validator details successfully', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345)
      ])

      const validator = await stakingManager.getValidator(validValidatorAddress)

      expect(validator.operatorAddress).toBe(validValidatorAddress)
      expect(validator.status).toBe('BOND_STATUS_BONDED')
      expect(validator.jailed).toBe(false)
      expect(validator.description.moniker).toBe('Test Validator')
      expect(validator.commission.commissionRates.rate).toBe('0.100000000000000000')
    })

    it('should throw error for missing validator address', async () => {
      await expect(stakingManager.getValidator('')).rejects.toThrow(ValidationError)
      await expect(stakingManager.getValidator('')).rejects.toThrow('Validator address is required')
    })

    it('should throw error for invalid validator address format', async () => {
      await expect(stakingManager.getValidator('akash1invalid')).rejects.toThrow(ValidationError)
      await expect(stakingManager.getValidator('akash1invalid')).rejects.toThrow('Invalid validator address format')
    })

    it('should throw error for validator not found', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      await expect(stakingManager.getValidator(validValidatorAddress)).rejects.toThrow(ValidationError)
      await expect(stakingManager.getValidator(validValidatorAddress)).rejects.toThrow(`Validator ${validValidatorAddress} not found`)
    })

    it('should handle network errors when getting validator', async () => {
      const networkError = new Error('Query failed')

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(stakingManager.getValidator(validValidatorAddress)).rejects.toThrow(NetworkError)
      await expect(stakingManager.getValidator(validValidatorAddress)).rejects.toThrow('Failed to get validator')
    })
  })

  describe('getDelegations', () => {
    it('should get delegations successfully', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345),
        createMockTx(12346),
        createMockTx(12347)
      ])

      const delegations = await stakingManager.getDelegations(validDelegatorAddress)

      expect(delegations).toHaveLength(3)
      expect(delegations[0].delegatorAddress).toBe(validDelegatorAddress)
      expect(delegations[0]).toHaveProperty('validatorAddress')
      expect(delegations[0].validatorAddress).toMatch(/^akashvaloper1/)
      expect(delegations[0]).toHaveProperty('shares')
      expect(delegations[0]).toHaveProperty('balance')
      expect(delegations[0].balance.denom).toBe('uakt')
    })

    it('should use default delegator address when not provided', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345)
      ])

      const delegations = await stakingManager.getDelegations()

      expect(delegations).toHaveLength(1)
      expect(delegations[0].delegatorAddress).toBe('akash1delegator')
    })

    it('should throw error for invalid delegator address format', async () => {
      await expect(stakingManager.getDelegations('invalid')).rejects.toThrow(ValidationError)
      await expect(stakingManager.getDelegations('invalid')).rejects.toThrow('Invalid delegator address format')
    })

    it('should handle network errors when getting delegations', async () => {
      const networkError = new Error('Query timeout')

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(stakingManager.getDelegations(validDelegatorAddress)).rejects.toThrow(NetworkError)
      await expect(stakingManager.getDelegations(validDelegatorAddress)).rejects.toThrow('Failed to get delegations')
    })
  })

  describe('getUnbondingDelegations', () => {
    it('should get unbonding delegations successfully', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345),
        createMockTx(12346)
      ])

      const unbonding = await stakingManager.getUnbondingDelegations(validDelegatorAddress)

      expect(unbonding).toHaveLength(2)
      expect(unbonding[0].delegatorAddress).toBe(validDelegatorAddress)
      expect(unbonding[0]).toHaveProperty('validatorAddress')
      expect(unbonding[0]).toHaveProperty('entries')
      expect(unbonding[0].entries).toHaveLength(1)
      expect(unbonding[0].entries[0]).toHaveProperty('completionTime')
      expect(unbonding[0].entries[0]).toHaveProperty('initialBalance')
    })

    it('should use default delegator address when not provided', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345)
      ])

      const unbonding = await stakingManager.getUnbondingDelegations()

      expect(unbonding).toHaveLength(1)
      expect(unbonding[0].delegatorAddress).toBe('akash1delegator')
    })

    it('should throw error for invalid delegator address format', async () => {
      await expect(stakingManager.getUnbondingDelegations('cosmos1invalid')).rejects.toThrow(ValidationError)
    })

    it('should handle network errors when getting unbonding delegations', async () => {
      const networkError = new Error('Service unavailable')

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(stakingManager.getUnbondingDelegations(validDelegatorAddress)).rejects.toThrow(NetworkError)
      await expect(stakingManager.getUnbondingDelegations(validDelegatorAddress)).rejects.toThrow('Failed to get unbonding delegations')
    })
  })

  describe('getRedelegations', () => {
    it('should get redelegations successfully', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345),
        createMockTx(12346)
      ])

      const redelegations = await stakingManager.getRedelegations(validDelegatorAddress)

      expect(redelegations).toHaveLength(2)
      expect(redelegations[0].delegatorAddress).toBe(validDelegatorAddress)
      expect(redelegations[0]).toHaveProperty('validatorSrcAddress')
      expect(redelegations[0]).toHaveProperty('validatorDstAddress')
      expect(redelegations[0]).toHaveProperty('entries')
      expect(redelegations[0].entries).toHaveLength(1)
      expect(redelegations[0].entries[0]).toHaveProperty('completionTime')
      expect(redelegations[0].entries[0]).toHaveProperty('sharesDst')
    })

    it('should use default delegator address when not provided', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345)
      ])

      const redelegations = await stakingManager.getRedelegations()

      expect(redelegations).toHaveLength(1)
      expect(redelegations[0].delegatorAddress).toBe('akash1delegator')
    })

    it('should handle network errors when getting redelegations', async () => {
      const networkError = new Error('Database error')

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(stakingManager.getRedelegations(validDelegatorAddress)).rejects.toThrow(NetworkError)
      await expect(stakingManager.getRedelegations(validDelegatorAddress)).rejects.toThrow('Failed to get redelegations')
    })
  })

  describe('getRewards', () => {
    it('should get staking rewards successfully', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345),
        createMockTx(12346),
        createMockTx(12347)
      ])

      const rewards = await stakingManager.getRewards(validDelegatorAddress)

      expect(rewards).toHaveProperty('rewards')
      expect(rewards).toHaveProperty('total')
      expect(rewards.rewards).toHaveLength(3)
      expect(rewards.rewards[0]).toHaveProperty('validatorAddress')
      expect(rewards.rewards[0]).toHaveProperty('reward')
      expect(rewards.rewards[0].reward[0].denom).toBe('uakt')
      expect(rewards.total).toHaveLength(1)
      expect(rewards.total[0].denom).toBe('uakt')

      // Total should be sum of all rewards
      const expectedTotal = rewards.rewards.reduce(
        (sum, r) => sum + parseInt(r.reward[0].amount),
        0
      )
      expect(rewards.total[0].amount).toBe(expectedTotal.toString())
    })

    it('should use default delegator address when not provided', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345)
      ])

      const rewards = await stakingManager.getRewards()

      expect(rewards.rewards).toHaveLength(1)
    })

    it('should throw error for invalid delegator address format', async () => {
      await expect(stakingManager.getRewards('invalid')).rejects.toThrow(ValidationError)
      await expect(stakingManager.getRewards('invalid')).rejects.toThrow('Invalid delegator address format')
    })

    it('should handle network errors when getting rewards', async () => {
      const networkError = new Error('Connection lost')

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(stakingManager.getRewards(validDelegatorAddress)).rejects.toThrow(NetworkError)
      await expect(stakingManager.getRewards(validDelegatorAddress)).rejects.toThrow('Failed to get rewards')
    })
  })

  describe('withdrawRewards', () => {
    it('should withdraw rewards successfully', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12350)
      ])

      const result = await stakingManager.withdrawRewards(validValidatorAddress)

      expect(result.code).toBe(0)
      expect(result.transactionHash).toContain('withdraw-')
      expect(result.height).toBeGreaterThan(0)
      expect(result.gasUsed).toBe(65000)
      expect(result.gasWanted).toBe(80000)
      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'distribution' },
        { key: 'message.action', value: 'withdraw_delegator_reward' }
      ])
    })

    it('should throw error for missing validator address', async () => {
      await expect(stakingManager.withdrawRewards('')).rejects.toThrow(ValidationError)
      await expect(stakingManager.withdrawRewards('')).rejects.toThrow('Validator address is required')
    })

    it('should throw error for invalid validator address format', async () => {
      await expect(stakingManager.withdrawRewards('akash1invalid')).rejects.toThrow(ValidationError)
      await expect(stakingManager.withdrawRewards('akash1invalid')).rejects.toThrow('Invalid validator address format')
    })

    it('should handle network errors during reward withdrawal', async () => {
      const networkError = new Error('Transaction failed')

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(stakingManager.withdrawRewards(validValidatorAddress)).rejects.toThrow(NetworkError)
      await expect(stakingManager.withdrawRewards(validValidatorAddress)).rejects.toThrow('Failed to withdraw rewards')
    })
  })

  describe('withdrawAllRewards', () => {
    it('should withdraw all rewards successfully', async () => {
      // Mock getDelegations response
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345),
        createMockTx(12346),
        createMockTx(12347)
      ])

      const result = await stakingManager.withdrawAllRewards(validDelegatorAddress)

      expect(result.code).toBe(0)
      expect(result.transactionHash).toContain('withdraw-all-')
      expect(result.height).toBeGreaterThan(0)
      expect(result.gasUsed).toBeGreaterThan(0)
      expect(result.gasWanted).toBeGreaterThan(0)
      expect(result.rawLog).toContain('Withdrew rewards from')
    })

    it('should throw error when no delegations found', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      await expect(stakingManager.withdrawAllRewards(validDelegatorAddress)).rejects.toThrow(ValidationError)
      await expect(stakingManager.withdrawAllRewards(validDelegatorAddress)).rejects.toThrow('No delegations found for this address')
    })

    it('should handle network errors during withdraw all', async () => {
      const networkError = new Error('Broadcast failed')

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(stakingManager.withdrawAllRewards(validDelegatorAddress)).rejects.toThrow(NetworkError)
      await expect(stakingManager.withdrawAllRewards(validDelegatorAddress)).rejects.toThrow('Failed to withdraw all rewards')
    })
  })

  describe('getPool', () => {
    it('should get staking pool information successfully', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345)
      ])

      const pool = await stakingManager.getPool()

      expect(pool).toHaveProperty('bondedTokens')
      expect(pool).toHaveProperty('notBondedTokens')
      expect(pool.bondedTokens).toBe('150000000000000')
      expect(pool.notBondedTokens).toBe('50000000000000')
    })

    it('should handle network errors when getting pool', async () => {
      const networkError = new Error('Pool query failed')

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(stakingManager.getPool()).rejects.toThrow(NetworkError)
      await expect(stakingManager.getPool()).rejects.toThrow('Failed to get staking pool')
    })
  })

  describe('getParams', () => {
    it('should get staking parameters successfully', async () => {
      const params = await stakingManager.getParams()

      expect(params).toHaveProperty('unbondingTime')
      expect(params).toHaveProperty('maxValidators')
      expect(params).toHaveProperty('maxEntries')
      expect(params).toHaveProperty('historicalEntries')
      expect(params).toHaveProperty('bondDenom')
      expect(params).toHaveProperty('minCommissionRate')
      expect(params.unbondingTime).toBe('1814400s') // 21 days in seconds
      expect(params.maxValidators).toBe(100)
      expect(params.bondDenom).toBe('uakt')
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle empty transaction responses gracefully', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const validators = await stakingManager.getValidators()
      expect(validators).toHaveLength(5) // Should return mock validators even with empty response
    })

    it('should handle very large delegation amounts', async () => {
      const largeAmount = { denom: 'uakt', amount: '999999999999999999' }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345)
      ])

      const result = await stakingManager.delegate(validValidatorAddress, largeAmount)
      expect(result.code).toBe(0)
    })

    it('should validate different coin denoms', async () => {
      const differentDenom = { denom: 'stake', amount: '1000000' }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345)
      ])

      const result = await stakingManager.delegate(validValidatorAddress, differentDenom)
      expect(result.code).toBe(0)
    })

    it('should handle multiple concurrent operations', async () => {
      const amount = { denom: 'uakt', amount: '1000000' }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345)
      ])

      const promises = [
        stakingManager.delegate(validValidatorAddress, amount),
        stakingManager.getValidators(),
        stakingManager.getRewards(validDelegatorAddress)
      ]

      const results = await Promise.all(promises)
      expect(results).toHaveLength(3)
      expect(results[0]).toHaveProperty('transactionHash')
      expect(results[1]).toBeInstanceOf(Array)
      expect(results[2]).toHaveProperty('rewards')
    })
  })

  describe('data integrity', () => {
    it('should return consistent validator addresses', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345),
        createMockTx(12346)
      ])

      const delegations = await stakingManager.getDelegations(validDelegatorAddress)

      delegations.forEach(delegation => {
        expect(delegation.validatorAddress).toMatch(/^akashvaloper1[a-z0-9]{39}$/)
      })
    })

    it('should maintain proper balance and shares relationship', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345)
      ])

      const delegations = await stakingManager.getDelegations(validDelegatorAddress)

      delegations.forEach(delegation => {
        const balanceAmount = parseInt(delegation.balance.amount)
        const sharesAmount = parseFloat(delegation.shares)

        expect(balanceAmount).toBeGreaterThan(0)
        expect(sharesAmount).toBeGreaterThan(0)
      })
    })

    it('should calculate total rewards correctly', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345),
        createMockTx(12346)
      ])

      const rewards = await stakingManager.getRewards(validDelegatorAddress)

      const calculatedTotal = rewards.rewards.reduce(
        (sum, r) => sum + parseInt(r.reward[0].amount),
        0
      )

      expect(parseInt(rewards.total[0].amount)).toBe(calculatedTotal)
    })
  })
})
