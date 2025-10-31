/**
 * Constants for staking operations
 * @module staking-constants
 */

/**
 * Default unbonding period for Akash Network (21 days)
 */
export const DEFAULT_UNBONDING_PERIOD_DAYS = 21

/**
 * Milliseconds per day for time calculations
 */
export const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Seconds per day for time calculations
 */
export const SECONDS_PER_DAY = 24 * 60 * 60

/**
 * Default validator bond status for bonded validators
 */
export const DEFAULT_VALIDATOR_STATUS = 'BOND_STATUS_BONDED'

/**
 * Unbonding validator status
 */
export const VALIDATOR_STATUS_UNBONDING = 'BOND_STATUS_UNBONDING'

/**
 * Unbonded validator status
 */
export const VALIDATOR_STATUS_UNBONDED = 'BOND_STATUS_UNBONDED'

/**
 * Default commission rate (10%)
 */
export const DEFAULT_COMMISSION_RATE = '0.100000000000000000'

/**
 * Default maximum commission rate (20%)
 */
export const DEFAULT_MAX_COMMISSION_RATE = '0.200000000000000000'

/**
 * Default maximum commission rate change per day (1%)
 */
export const DEFAULT_MAX_COMMISSION_CHANGE_RATE = '0.010000000000000000'

/**
 * Minimum commission rate for validators (5%)
 */
export const MIN_COMMISSION_RATE = '0.050000000000000000'

/**
 * Default minimum self delegation amount
 */
export const DEFAULT_MIN_SELF_DELEGATION = '1000000'

/**
 * Default maximum number of validators
 */
export const DEFAULT_MAX_VALIDATORS = 100

/**
 * Default maximum number of unbonding/redelegation entries
 */
export const DEFAULT_MAX_ENTRIES = 7

/**
 * Default number of historical entries to keep
 */
export const DEFAULT_HISTORICAL_ENTRIES = 10000

/**
 * Default denomination for staking tokens
 */
export const DEFAULT_BOND_DENOM = 'uakt'

/**
 * Validator address prefix for Akash Network
 */
export const VALIDATOR_ADDRESS_PREFIX = 'akashvaloper1'

/**
 * Delegator address prefix for Akash Network
 */
export const DELEGATOR_ADDRESS_PREFIX = 'akash1'

/**
 * Default gas used for delegate operation
 */
export const DEFAULT_DELEGATE_GAS_USED = 75000

/**
 * Default gas wanted for delegate operation
 */
export const DEFAULT_DELEGATE_GAS_WANTED = 90000

/**
 * Default gas used for undelegate operation
 */
export const DEFAULT_UNDELEGATE_GAS_USED = 85000

/**
 * Default gas wanted for undelegate operation
 */
export const DEFAULT_UNDELEGATE_GAS_WANTED = 100000

/**
 * Default gas used for redelegate operation
 */
export const DEFAULT_REDELEGATE_GAS_USED = 95000

/**
 * Default gas wanted for redelegate operation
 */
export const DEFAULT_REDELEGATE_GAS_WANTED = 110000

/**
 * Default gas used for withdraw rewards operation
 */
export const DEFAULT_WITHDRAW_GAS_USED = 65000

/**
 * Default gas wanted for withdraw rewards operation
 */
export const DEFAULT_WITHDRAW_GAS_WANTED = 80000

/**
 * Default mock validator token amount
 */
export const MOCK_VALIDATOR_TOKENS_BASE = 1000000

/**
 * Mock validator token multiplier suffix
 */
export const MOCK_VALIDATOR_TOKENS_SUFFIX = '000000'

/**
 * Precision for delegator shares (18 decimal places)
 */
export const DELEGATOR_SHARES_PRECISION = '.000000000000000000'

/**
 * Mock bonded tokens in staking pool
 */
export const MOCK_BONDED_TOKENS = '150000000000000'

/**
 * Mock not bonded tokens in staking pool
 */
export const MOCK_NOT_BONDED_TOKENS = '50000000000000'

/**
 * Mock delegation amount base multiplier
 */
export const MOCK_DELEGATION_AMOUNT_BASE = 1000000

/**
 * Mock reward amount base multiplier
 */
export const MOCK_REWARD_AMOUNT_BASE = 5000

/**
 * Mock unbonding/redelegation amount base multiplier
 */
export const MOCK_UNBONDING_AMOUNT_BASE = 500000

/**
 * Mock redelegation amount base multiplier
 */
export const MOCK_REDELEGATION_AMOUNT_BASE = 300000

/**
 * Maximum validator count for mock data generation
 */
export const MAX_MOCK_VALIDATORS = 10

/**
 * Maximum delegation count for mock data generation
 */
export const MAX_MOCK_DELEGATIONS = 5

/**
 * Maximum unbonding delegation count for mock data generation
 */
export const MAX_MOCK_UNBONDING_DELEGATIONS = 3

/**
 * Maximum redelegation count for mock data generation
 */
export const MAX_MOCK_REDELEGATIONS = 2

/**
 * Maximum rewards count for mock data generation
 */
export const MAX_MOCK_REWARDS = 3

/**
 * Mock validator status modulo (every 3rd validator is unbonding)
 */
export const VALIDATOR_STATUS_MODULO = 3

/**
 * Bech32 character set for address generation
 */
export const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'

/**
 * Length of bech32 address suffix
 */
export const BECH32_ADDRESS_SUFFIX_LENGTH = 39

/**
 * Default TTL for revalidation (1 minute in milliseconds)
 */
export const DEFAULT_REVALIDATION_TTL = 60000
