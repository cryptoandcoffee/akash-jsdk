/**
 * Base transaction result interface
 */
export interface BaseTransactionResult {
  /** Transaction hash */
  transactionHash: string

  /** Result code (0 = success) */
  code: number

  /** Block height */
  height: number

  /** Gas used */
  gasUsed?: bigint

  /** Gas wanted */
  gasWanted?: bigint

  /** Raw transaction log */
  rawLog?: string

  /** Transaction events */
  events?: any[]
}

/**
 * Batch operation result
 */
export interface BatchResult extends BaseTransactionResult {
  /** Success flag */
  success: boolean
}

/**
 * IBC transfer result
 */
export interface IBCTransferResult extends BaseTransactionResult {
  /** Source channel */
  sourceChannel?: string

  /** Destination chain */
  destinationChain?: string
}

/**
 * Staking operation result
 */
export interface StakingResult extends BaseTransactionResult {
  /** Validator address */
  validatorAddress?: string

  /** Unbonding completion time (for undelegations) */
  unbondingTime?: Date | string
}
