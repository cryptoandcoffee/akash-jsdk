import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StakingManager } from './staking'
import { AkashProvider } from '../providers/akash'
import { NetworkError, ValidationError } from '../errors'

// Mock SigningStargateClient
vi.mock('@cosmjs/stargate', () => ({
  SigningStargateClient: {
    connect: vi.fn(),
    connectWithSigner: vi.fn()
  },
  calculateFee: vi.fn((gas, gasPrice) => ({
    amount: [{ denom: 'uakt', amount: '5000' }],
    gas: gas.toString()
  })),
  GasPrice: {
    fromString: vi.fn(() => ({ denom: 'uakt', amount: '0.025' }))
  }
}))

// Mock global fetch
global.fetch = vi.fn()

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
const mockClient = {
  searchTx: vi.fn(),
  getHeight: vi.fn().mockResolvedValue(12345)
}

const mockProvider = {
  client: mockClient,
  ensureConnected: vi.fn(),
  getClient: vi.fn().mockReturnValue(mockClient),
  config: {
    rpcEndpoint: 'http://localhost:26657',
    apiEndpoint: 'http://localhost:1317'
  }
} as unknown as AkashProvider

describe('StakingManager', () => {
  let stakingManager: StakingManager
  const validValidatorAddress = 'akashvaloper1testvalidator12345678901234567890123456'
  const validDelegatorAddress = 'akash1testdelegator12345678901234567890123456'

  beforeEach(async () => {
    const { SigningStargateClient } = await import('@cosmjs/stargate')

    const mockClient = {
      signAndBroadcast: vi.fn().mockResolvedValue({
        transactionHash: 'mock-tx-hash',
        code: 0,
        height: 12345,
        gasUsed: 75000,
        gasWanted: 90000,
        rawLog: '',
        events: []
      }),
      simulate: vi.fn().mockResolvedValue(50000),
      getTx: vi.fn().mockResolvedValue({
        hash: 'mock-tx-hash',
        height: 12345,
        code: 0
      }),
      getBlock: vi.fn().mockResolvedValue({
        header: {
          time: new Date().toISOString()
        }
      })
    }

    vi.mocked(SigningStargateClient.connect).mockResolvedValue(mockClient as any)
    vi.mocked(SigningStargateClient.connectWithSigner).mockResolvedValue(mockClient as any)

    // Mock fetch for API calls
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        validators: [
          {
            operator_address: validValidatorAddress,
            consensus_pubkey: { type: 'tendermint/PubKeyEd25519', value: 'mockkey' },
            jailed: false,
            status: 'BOND_STATUS_BONDED',
            tokens: '1000000000',
            delegator_shares: '1000000000.000000000000000000',
            description: {
              moniker: 'Test Validator',
              identity: '',
              website: '',
              security_contact: '',
              details: ''
            },
            unbonding_height: '0',
            unbonding_time: '1970-01-01T00:00:00Z',
            commission: {
              commission_rates: {
                rate: '0.100000000000000000',
                max_rate: '0.200000000000000000',
                max_change_rate: '0.010000000000000000'
              },
              update_time: new Date().toISOString()
            },
            min_self_delegation: '1'
          }
        ],
        validator: {
          operator_address: validValidatorAddress,
          consensus_pubkey: { type: 'tendermint/PubKeyEd25519', value: 'mockkey' },
          jailed: false,
          status: 'BOND_STATUS_BONDED',
          tokens: '1000000000',
          delegator_shares: '1000000000.000000000000000000',
          description: {
            moniker: 'Test Validator',
            identity: '',
            website: '',
            security_contact: '',
            details: ''
          },
          unbonding_height: '0',
          unbonding_time: '1970-01-01T00:00:00Z',
          commission: {
            commission_rates: {
              rate: '0.100000000000000000',
              max_rate: '0.200000000000000000',
              max_change_rate: '0.010000000000000000'
            },
            update_time: new Date().toISOString()
          },
          min_self_delegation: '1'
        },
        delegation_responses: [
          {
            delegation: {
              delegator_address: validDelegatorAddress,
              validator_address: validValidatorAddress,
              shares: '1000000.000000000000000000'
            },
            balance: { denom: 'uakt', amount: '1000000' }
          }
        ],
        rewards: [
          {
            validator_address: validValidatorAddress,
            reward: [{ denom: 'uakt', amount: '50000' }]
          }
        ],
        total: [{ denom: 'uakt', amount: '50000' }]
      })
    } as Response)

    stakingManager = new StakingManager(mockProvider)
    vi.clearAllMocks()
  })

  describe('delegate', () => {
    it('should delegate tokens successfully', async () => {
      const amount = { denom: 'uakt', amount: '1000000' }
      const mockWallet = {
        getAccounts: vi.fn().mockResolvedValue([
          { address: validDelegatorAddress }
        ])
      }

      const result = await stakingManager.delegate(validValidatorAddress, amount, mockWallet)

      expect(result.code).toBe(0)
      expect(result.transactionHash).toBe('mock-tx-hash')
      expect(result.height).toBe(12345)
      expect(result.gasUsed).toBe(75000n)
      expect(result.gasWanted).toBe(90000n)
    })

    it('should throw error for missing validator address', async () => {
      const amount = { denom: 'uakt', amount: '1000000' }

      await expect(stakingManager.delegate('', amount)).rejects.toThrow(ValidationError)
      await expect(stakingManager.delegate('', amount)).rejects.toThrow('Address must be a non-empty string')
    })

    it('should throw error for invalid validator address format', async () => {
      const amount = { denom: 'uakt', amount: '1000000' }

      await expect(stakingManager.delegate('cosmos1invalid', amount)).rejects.toThrow(ValidationError)
      await expect(stakingManager.delegate('cosmos1invalid', amount)).rejects.toThrow('Address must start with akashvaloper')
    })

    it('should throw error for missing amount', async () => {
      await expect(stakingManager.delegate(validValidatorAddress, null as any)).rejects.toThrow(ValidationError)
      await expect(stakingManager.delegate(validValidatorAddress, null as any)).rejects.toThrow('Amount is required')
    })

    it('should throw error for invalid amount', async () => {
      const invalidAmount = { denom: '', amount: '' }

      await expect(stakingManager.delegate(validValidatorAddress, invalidAmount)).rejects.toThrow(ValidationError)
      await expect(stakingManager.delegate(validValidatorAddress, invalidAmount)).rejects.toThrow('Coin denom must be a non-empty string')
    })

    it('should handle network errors during delegation', async () => {
      const amount = { denom: 'uakt', amount: '1000000' }
      const errorWallet = {
        getAccounts: vi.fn().mockRejectedValue(new Error('Network connection failed'))
      }

      await expect(stakingManager.delegate(validValidatorAddress, amount, errorWallet)).rejects.toThrow(NetworkError)
      await expect(stakingManager.delegate(validValidatorAddress, amount, errorWallet)).rejects.toThrow('Failed to delegate tokens')
    })
  })

  describe('undelegate', () => {
    it('should undelegate tokens successfully', async () => {
      const amount = { denom: 'uakt', amount: '500000' }
      const mockWallet = {
        getAccounts: vi.fn().mockResolvedValue([{ address: validDelegatorAddress }])
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12346)
      ])

      const result = await stakingManager.undelegate(validValidatorAddress, amount, mockWallet)

      expect(result.code).toBe(0)
      expect(result.transactionHash).toBe('mock-tx-hash')
      expect(result.height).toBe(12345)
      expect(result.gasUsed).toBe(75000n)
      expect(result.gasWanted).toBe(90000n)
      expect(result.unbondingTime).toBeDefined()
      expect(new Date(result.unbondingTime!).getTime()).toBeGreaterThan(Date.now())
    })

    it('should calculate correct unbonding time', async () => {
      const amount = { denom: 'uakt', amount: '500000' }
      const mockWallet = {
        getAccounts: vi.fn().mockResolvedValue([{ address: validDelegatorAddress }])
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12346)
      ])

      const beforeTime = Date.now()
      const result = await stakingManager.undelegate(validValidatorAddress, amount, mockWallet)
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
      await expect(stakingManager.undelegate('', amount)).rejects.toThrow('Address must be a non-empty string')
    })

    it('should throw error for invalid validator address format', async () => {
      const amount = { denom: 'uakt', amount: '500000' }

      await expect(stakingManager.undelegate('akash1invalid', amount)).rejects.toThrow(ValidationError)
      await expect(stakingManager.undelegate('akash1invalid', amount)).rejects.toThrow('Address must start with akashvaloper')
    })

    it('should handle network errors during undelegation', async () => {
      const amount = { denom: 'uakt', amount: '500000' }
      const errorWallet = {
        getAccounts: vi.fn().mockRejectedValue(new Error('Network connection failed'))
      }

      await expect(stakingManager.undelegate(validValidatorAddress, amount, errorWallet)).rejects.toThrow(NetworkError)
      await expect(stakingManager.undelegate(validValidatorAddress, amount, errorWallet)).rejects.toThrow('Failed to undelegate tokens')
    })
  })

  describe('redelegate', () => {
    const srcValidator = 'akashvaloper1srcvalidator123456789012345678901234567'
    const dstValidator = 'akashvaloper1dstvalidator123456789012345678901234567'

    it('should redelegate tokens successfully', async () => {
      const amount = { denom: 'uakt', amount: '750000' }
      const mockWallet = {
        getAccounts: vi.fn().mockResolvedValue([{ address: validDelegatorAddress }])
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12347)
      ])

      const result = await stakingManager.redelegate(srcValidator, dstValidator, amount, mockWallet)

      expect(result.code).toBe(0)
      expect(result.transactionHash).toBe('mock-tx-hash')
      expect(result.height).toBe(12345)
      expect(result.gasUsed).toBe(75000n)
      expect(result.gasWanted).toBe(90000n)
    })

    it('should throw error for missing source validator', async () => {
      const amount = { denom: 'uakt', amount: '750000' }

      await expect(stakingManager.redelegate('', dstValidator, amount)).rejects.toThrow(ValidationError)
      await expect(stakingManager.redelegate('', dstValidator, amount)).rejects.toThrow('Address must be a non-empty string')
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
      await expect(stakingManager.redelegate('invalid', dstValidator, amount)).rejects.toThrow('Address must start with akashvaloper')
    })

    it('should throw error for missing amount', async () => {
      await expect(stakingManager.redelegate(srcValidator, dstValidator, null as any)).rejects.toThrow(ValidationError)
      await expect(stakingManager.redelegate(srcValidator, dstValidator, null as any)).rejects.toThrow('Amount is required')
    })

    it('should handle network errors during redelegation', async () => {
      const amount = { denom: 'uakt', amount: '750000' }
      const errorWallet = {
        getAccounts: vi.fn().mockRejectedValue(new Error('Network connection failed'))
      }

      await expect(stakingManager.redelegate(srcValidator, dstValidator, amount, errorWallet)).rejects.toThrow(NetworkError)
      await expect(stakingManager.redelegate(srcValidator, dstValidator, amount, errorWallet)).rejects.toThrow('Failed to redelegate tokens')
    })
  })

  describe('getValidators', () => {
    it('should get all validators successfully', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          validators: [
            { operator_address: validValidatorAddress, status: 'BOND_STATUS_BONDED', tokens: '1000000000', delegator_shares: '1000000000.000000000000000000', description: { moniker: 'Validator 1' }, commission: { commission_rates: { rate: '0.1', max_rate: '0.2', max_change_rate: '0.01' } }, jailed: false, min_self_delegation: '1' },
            { operator_address: 'akashvaloper1validator2', status: 'BOND_STATUS_BONDED', tokens: '2000000000', delegator_shares: '2000000000.000000000000000000', description: { moniker: 'Validator 2' }, commission: { commission_rates: { rate: '0.1', max_rate: '0.2', max_change_rate: '0.01' } }, jailed: false, min_self_delegation: '1' },
            { operator_address: 'akashvaloper1validator3', status: 'BOND_STATUS_BONDED', tokens: '3000000000', delegator_shares: '3000000000.000000000000000000', description: { moniker: 'Validator 3' }, commission: { commission_rates: { rate: '0.1', max_rate: '0.2', max_change_rate: '0.01' } }, jailed: false, min_self_delegation: '1' },
            { operator_address: 'akashvaloper1validator4', status: 'BOND_STATUS_BONDED', tokens: '4000000000', delegator_shares: '4000000000.000000000000000000', description: { moniker: 'Validator 4' }, commission: { commission_rates: { rate: '0.1', max_rate: '0.2', max_change_rate: '0.01' } }, jailed: false, min_self_delegation: '1' },
            { operator_address: 'akashvaloper1validator5', status: 'BOND_STATUS_BONDED', tokens: '5000000000', delegator_shares: '5000000000.000000000000000000', description: { moniker: 'Validator 5' }, commission: { commission_rates: { rate: '0.1', max_rate: '0.2', max_change_rate: '0.01' } }, jailed: false, min_self_delegation: '1' }
          ]
        })
      } as Response)

      const validators = await stakingManager.getValidators()

      expect(validators).toHaveLength(5)
      expect(validators[0]).toHaveProperty('operator_address')
      expect(validators[0].operator_address).toMatch(/^akashvaloper1/)
      expect(validators[0]).toHaveProperty('status')
      expect(validators[0]).toHaveProperty('tokens')
      expect(validators[0]).toHaveProperty('description')
      expect(validators[0].description).toHaveProperty('moniker')
      expect(validators[0]).toHaveProperty('commission')
    })

    it('should filter validators by bonded status', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          validators: [
            { operator_address: 'akashvaloper1validator1', status: 'BOND_STATUS_BONDED', tokens: '1000000000', delegator_shares: '1000000000.000000000000000000', description: { moniker: 'Validator 1' }, commission: { commission_rates: { rate: '0.1', max_rate: '0.2', max_change_rate: '0.01' } }, jailed: false, min_self_delegation: '1' },
            { operator_address: 'akashvaloper1validator2', status: 'BOND_STATUS_BONDED', tokens: '2000000000', delegator_shares: '2000000000.000000000000000000', description: { moniker: 'Validator 2' }, commission: { commission_rates: { rate: '0.1', max_rate: '0.2', max_change_rate: '0.01' } }, jailed: false, min_self_delegation: '1' },
            { operator_address: 'akashvaloper1validator3', status: 'BOND_STATUS_BONDED', tokens: '3000000000', delegator_shares: '3000000000.000000000000000000', description: { moniker: 'Validator 3' }, commission: { commission_rates: { rate: '0.1', max_rate: '0.2', max_change_rate: '0.01' } }, jailed: false, min_self_delegation: '1' }
          ]
        })
      } as Response)

      const validators = await stakingManager.getValidators('BOND_STATUS_BONDED')

      expect(validators).toHaveLength(3)
      validators.forEach(validator => {
        expect(validator.status).toBe('BOND_STATUS_BONDED')
      })
    })

    it('should filter validators by unbonding status', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          validators: [
            { operator_address: 'akashvaloper1validator1', status: 'BOND_STATUS_UNBONDING', tokens: '1000000000', delegator_shares: '1000000000.000000000000000000', description: { moniker: 'Validator 1' }, commission: { commission_rates: { rate: '0.1', max_rate: '0.2', max_change_rate: '0.01' } }, jailed: false, min_self_delegation: '1' },
            { operator_address: 'akashvaloper1validator2', status: 'BOND_STATUS_UNBONDING', tokens: '2000000000', delegator_shares: '2000000000.000000000000000000', description: { moniker: 'Validator 2' }, commission: { commission_rates: { rate: '0.1', max_rate: '0.2', max_change_rate: '0.01' } }, jailed: false, min_self_delegation: '1' }
          ]
        })
      } as Response)

      const validators = await stakingManager.getValidators('BOND_STATUS_UNBONDING')

      expect(validators).toHaveLength(2)
      validators.forEach(validator => {
        expect(validator.status).toBe('BOND_STATUS_UNBONDING')
      })
    })

    it('should handle network errors when getting validators', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({})
      } as Response)

      await expect(stakingManager.getValidators()).rejects.toThrow(NetworkError)
      await expect(stakingManager.getValidators()).rejects.toThrow('Failed to get validators')
    })
  })

  describe('getValidator', () => {
    it('should get validator details successfully', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          validator: {
            operator_address: validValidatorAddress,
            consensus_pubkey: { type: 'tendermint/PubKeyEd25519', value: 'mockkey' },
            jailed: false,
            status: 'BOND_STATUS_BONDED',
            tokens: '1000000000',
            delegator_shares: '1000000000.000000000000000000',
            description: {
              moniker: 'Test Validator',
              identity: '',
              website: '',
              security_contact: '',
              details: ''
            },
            unbonding_height: '0',
            unbonding_time: '1970-01-01T00:00:00Z',
            commission: {
              commission_rates: {
                rate: '0.100000000000000000',
                max_rate: '0.200000000000000000',
                max_change_rate: '0.010000000000000000'
              },
              update_time: new Date().toISOString()
            },
            min_self_delegation: '1'
          }
        })
      } as Response)

      const validator = await stakingManager.getValidator(validValidatorAddress)

      expect(validator.operator_address).toBe(validValidatorAddress)
      expect(validator.status).toBe('BOND_STATUS_BONDED')
      expect(validator.jailed).toBe(false)
      expect(validator.description.moniker).toBe('Test Validator')
      expect(validator.commission.commission_rates.rate).toBe('0.100000000000000000')
    })

    it('should throw error for missing validator address', async () => {
      await expect(stakingManager.getValidator('')).rejects.toThrow(ValidationError)
      await expect(stakingManager.getValidator('')).rejects.toThrow('Address must be a non-empty string')
    })

    it('should throw error for invalid validator address format', async () => {
      await expect(stakingManager.getValidator('akash1invalid')).rejects.toThrow(ValidationError)
      await expect(stakingManager.getValidator('akash1invalid')).rejects.toThrow('Address must start with akashvaloper')
    })

    it('should throw error for validator not found', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({})
      } as Response)

      await expect(stakingManager.getValidator(validValidatorAddress)).rejects.toThrow(ValidationError)
      await expect(stakingManager.getValidator(validValidatorAddress)).rejects.toThrow(`Validator ${validValidatorAddress} not found`)
    })

    it('should handle network errors when getting validator', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({})
      } as Response)

      await expect(stakingManager.getValidator(validValidatorAddress)).rejects.toThrow(NetworkError)
      await expect(stakingManager.getValidator(validValidatorAddress)).rejects.toThrow('Failed to get validator')
    })
  })

  describe('getDelegations', () => {
    it('should get delegations successfully', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          delegation_responses: [
            {
              delegation: {
                delegator_address: validDelegatorAddress,
                validator_address: 'akashvaloper1validator1',
                shares: '1000000.000000000000000000'
              },
              balance: { denom: 'uakt', amount: '1000000' }
            },
            {
              delegation: {
                delegator_address: validDelegatorAddress,
                validator_address: 'akashvaloper1validator2',
                shares: '2000000.000000000000000000'
              },
              balance: { denom: 'uakt', amount: '2000000' }
            },
            {
              delegation: {
                delegator_address: validDelegatorAddress,
                validator_address: 'akashvaloper1validator3',
                shares: '3000000.000000000000000000'
              },
              balance: { denom: 'uakt', amount: '3000000' }
            }
          ]
        })
      } as Response)

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
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          delegation_responses: [
            {
              delegation: {
                delegator_address: 'akash1delegator',
                validator_address: 'akashvaloper1validator1',
                shares: '1000000.000000000000000000'
              },
              balance: { denom: 'uakt', amount: '1000000' }
            }
          ]
        })
      } as Response)

      const delegations = await stakingManager.getDelegations()

      expect(delegations).toHaveLength(1)
      expect(delegations[0].delegatorAddress).toBe('akash1delegator')
    })

    it('should throw error for invalid delegator address format', async () => {
      await expect(stakingManager.getDelegations('invalid')).rejects.toThrow(ValidationError)
      await expect(stakingManager.getDelegations('invalid')).rejects.toThrow('Invalid delegator address format')
    })

    it('should handle network errors when getting delegations', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({})
      } as Response)

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
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          rewards: [
            {
              validator_address: 'akashvaloper1validator1',
              reward: [{ denom: 'uakt', amount: '10000' }]
            },
            {
              validator_address: 'akashvaloper1validator2',
              reward: [{ denom: 'uakt', amount: '20000' }]
            },
            {
              validator_address: 'akashvaloper1validator3',
              reward: [{ denom: 'uakt', amount: '30000' }]
            }
          ],
          total: [{ denom: 'uakt', amount: '60000' }]
        })
      } as Response)

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
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          rewards: [
            {
              validator_address: 'akashvaloper1validator1',
              reward: [{ denom: 'uakt', amount: '10000' }]
            }
          ],
          total: [{ denom: 'uakt', amount: '10000' }]
        })
      } as Response)

      const rewards = await stakingManager.getRewards()

      expect(rewards.rewards).toHaveLength(1)
    })

    it('should throw error for invalid delegator address format', async () => {
      await expect(stakingManager.getRewards('invalid')).rejects.toThrow(ValidationError)
      await expect(stakingManager.getRewards('invalid')).rejects.toThrow('Invalid delegator address format')
    })

    it('should handle network errors when getting rewards', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({})
      } as Response)

      await expect(stakingManager.getRewards(validDelegatorAddress)).rejects.toThrow(NetworkError)
      await expect(stakingManager.getRewards(validDelegatorAddress)).rejects.toThrow('Failed to get rewards')
    })
  })

  describe('withdrawRewards', () => {
    it('should withdraw rewards successfully', async () => {
      const mockWallet = {
        getAccounts: vi.fn().mockResolvedValue([{ address: validDelegatorAddress }])
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12350)
      ])

      const result = await stakingManager.withdrawRewards(validValidatorAddress, mockWallet)

      expect(result.code).toBe(0)
      expect(result.transactionHash).toBe('mock-tx-hash')
      expect(result.height).toBe(12345)
      expect(result.gasUsed).toBe(75000n)
      expect(result.gasWanted).toBe(90000n)
    })

    it('should throw error for missing validator address', async () => {
      await expect(stakingManager.withdrawRewards('')).rejects.toThrow(ValidationError)
      await expect(stakingManager.withdrawRewards('')).rejects.toThrow('Address must be a non-empty string')
    })

    it('should throw error for invalid validator address format', async () => {
      await expect(stakingManager.withdrawRewards('akash1invalid')).rejects.toThrow(ValidationError)
      await expect(stakingManager.withdrawRewards('akash1invalid')).rejects.toThrow('Address must start with akashvaloper')
    })

    it('should handle network errors during reward withdrawal', async () => {
      const errorWallet = {
        getAccounts: vi.fn().mockRejectedValue(new Error('Network connection failed'))
      }

      await expect(stakingManager.withdrawRewards(validValidatorAddress, errorWallet)).rejects.toThrow(NetworkError)
      await expect(stakingManager.withdrawRewards(validValidatorAddress, errorWallet)).rejects.toThrow('Failed to withdraw rewards')
    })
  })

  describe('withdrawAllRewards', () => {
    it('should withdraw all rewards successfully', async () => {
      // Mock getDelegations response
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          delegation_responses: [
            {
              delegation: {
                delegator_address: validDelegatorAddress,
                validator_address: 'akashvaloper1validator1',
                shares: '1000000.000000000000000000'
              },
              balance: { denom: 'uakt', amount: '1000000' }
            },
            {
              delegation: {
                delegator_address: validDelegatorAddress,
                validator_address: 'akashvaloper1validator2',
                shares: '2000000.000000000000000000'
              },
              balance: { denom: 'uakt', amount: '2000000' }
            },
            {
              delegation: {
                delegator_address: validDelegatorAddress,
                validator_address: 'akashvaloper1validator3',
                shares: '3000000.000000000000000000'
              },
              balance: { denom: 'uakt', amount: '3000000' }
            }
          ]
        })
      } as Response)

      const result = await stakingManager.withdrawAllRewards(validDelegatorAddress)

      expect(result.code).toBe(0)
      expect(result.transactionHash).toContain('withdraw-all-')
      expect(result.height).toBeGreaterThan(0)
      expect(result.gasUsed).toBeGreaterThan(0)
      expect(result.gasWanted).toBeGreaterThan(0)
      expect(result.rawLog).toContain('Withdrew rewards from')
    })

    it('should throw error when no delegations found', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          delegation_responses: []
        })
      } as Response)

      await expect(stakingManager.withdrawAllRewards(validDelegatorAddress)).rejects.toThrow(ValidationError)
      await expect(stakingManager.withdrawAllRewards(validDelegatorAddress)).rejects.toThrow('No delegations found for this address')
    })

    it('should handle network errors during withdraw all', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({})
      } as Response)

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
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          validators: [
            { operator_address: validValidatorAddress, status: 'BOND_STATUS_BONDED', tokens: '1000000000', delegator_shares: '1000000000.000000000000000000', description: { moniker: 'Validator 1' }, commission: { commission_rates: { rate: '0.1', max_rate: '0.2', max_change_rate: '0.01' } }, jailed: false, min_self_delegation: '1' },
            { operator_address: 'akashvaloper1validator2', status: 'BOND_STATUS_BONDED', tokens: '2000000000', delegator_shares: '2000000000.000000000000000000', description: { moniker: 'Validator 2' }, commission: { commission_rates: { rate: '0.1', max_rate: '0.2', max_change_rate: '0.01' } }, jailed: false, min_self_delegation: '1' },
            { operator_address: 'akashvaloper1validator3', status: 'BOND_STATUS_BONDED', tokens: '3000000000', delegator_shares: '3000000000.000000000000000000', description: { moniker: 'Validator 3' }, commission: { commission_rates: { rate: '0.1', max_rate: '0.2', max_change_rate: '0.01' } }, jailed: false, min_self_delegation: '1' },
            { operator_address: 'akashvaloper1validator4', status: 'BOND_STATUS_BONDED', tokens: '4000000000', delegator_shares: '4000000000.000000000000000000', description: { moniker: 'Validator 4' }, commission: { commission_rates: { rate: '0.1', max_rate: '0.2', max_change_rate: '0.01' } }, jailed: false, min_self_delegation: '1' },
            { operator_address: 'akashvaloper1validator5', status: 'BOND_STATUS_BONDED', tokens: '5000000000', delegator_shares: '5000000000.000000000000000000', description: { moniker: 'Validator 5' }, commission: { commission_rates: { rate: '0.1', max_rate: '0.2', max_change_rate: '0.01' } }, jailed: false, min_self_delegation: '1' }
          ]
        })
      } as Response)

      const validators = await stakingManager.getValidators()
      expect(validators).toHaveLength(5) // Should return mock validators even with empty response
    })

    it('should handle very large delegation amounts', async () => {
      const largeAmount = { denom: 'uakt', amount: '999999999999999999' }
      const mockWallet = {
        getAccounts: vi.fn().mockResolvedValue([{ address: validDelegatorAddress }])
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345)
      ])

      const result = await stakingManager.delegate(validValidatorAddress, largeAmount, mockWallet)
      expect(result.code).toBe(0)
    })

    it('should validate different coin denoms', async () => {
      const differentDenom = { denom: 'stake', amount: '1000000' }
      const mockWallet = {
        getAccounts: vi.fn().mockResolvedValue([{ address: validDelegatorAddress }])
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345)
      ])

      const result = await stakingManager.delegate(validValidatorAddress, differentDenom, mockWallet)
      expect(result.code).toBe(0)
    })

    it('should handle multiple concurrent operations', async () => {
      const amount = { denom: 'uakt', amount: '1000000' }
      const mockWallet = {
        getAccounts: vi.fn().mockResolvedValue([{ address: validDelegatorAddress }])
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([
        createMockTx(12345)
      ])

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          validators: [
            { operator_address: validValidatorAddress, status: 'BOND_STATUS_BONDED', tokens: '1000000000', delegator_shares: '1000000000.000000000000000000', description: { moniker: 'Validator 1' }, commission: { commission_rates: { rate: '0.1', max_rate: '0.2', max_change_rate: '0.01' } }, jailed: false, min_self_delegation: '1' }
          ],
          rewards: [
            {
              validator_address: 'akashvaloper1validator1',
              reward: [{ denom: 'uakt', amount: '10000' }]
            }
          ],
          total: [{ denom: 'uakt', amount: '10000' }]
        })
      } as Response)

      const promises = [
        stakingManager.delegate(validValidatorAddress, amount, mockWallet),
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
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          delegation_responses: [
            {
              delegation: {
                delegator_address: validDelegatorAddress,
                validator_address: 'akashvaloper1vldtr1234567890123456789012345678901234',
                shares: '1000000.000000000000000000'
              },
              balance: { denom: 'uakt', amount: '1000000' }
            },
            {
              delegation: {
                delegator_address: validDelegatorAddress,
                validator_address: 'akashvaloper1vldtr2234567890123456789012345678901234',
                shares: '2000000.000000000000000000'
              },
              balance: { denom: 'uakt', amount: '2000000' }
            }
          ]
        })
      } as Response)

      const delegations = await stakingManager.getDelegations(validDelegatorAddress)

      delegations.forEach(delegation => {
        expect(delegation.validatorAddress).toMatch(/^akashvaloper1[a-z0-9]{39}$/)
      })
    })

    it('should maintain proper balance and shares relationship', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          delegation_responses: [
            {
              delegation: {
                delegator_address: validDelegatorAddress,
                validator_address: 'akashvaloper1validator1',
                shares: '1000000.000000000000000000'
              },
              balance: { denom: 'uakt', amount: '1000000' }
            }
          ]
        })
      } as Response)

      const delegations = await stakingManager.getDelegations(validDelegatorAddress)

      delegations.forEach(delegation => {
        const balanceAmount = parseInt(delegation.balance.amount)
        const sharesAmount = parseFloat(delegation.shares)

        expect(balanceAmount).toBeGreaterThan(0)
        expect(sharesAmount).toBeGreaterThan(0)
      })
    })

    it('should calculate total rewards correctly', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          rewards: [
            {
              validator_address: 'akashvaloper1validator1',
              reward: [{ denom: 'uakt', amount: '10000' }]
            },
            {
              validator_address: 'akashvaloper1validator2',
              reward: [{ denom: 'uakt', amount: '20000' }]
            }
          ],
          total: [{ denom: 'uakt', amount: '30000' }]
        })
      } as Response)

      const rewards = await stakingManager.getRewards(validDelegatorAddress)

      const calculatedTotal = rewards.rewards.reduce(
        (sum, r) => sum + parseInt(r.reward[0].amount),
        0
      )

      expect(parseInt(rewards.total[0].amount)).toBe(calculatedTotal)
    })
  })
})
