import { ValidationError } from '../errors'

/**
 * Validates that a number is positive
 */
export function validatePositiveNumber(value: number, fieldName: string): void {
  if (typeof value !== 'number' || value <= 0 || !isFinite(value)) {
    throw new ValidationError(`${fieldName} must be a positive number`)
  }
}

/**
 * Validates transaction parameters common to all modules
 */
export function validateTransactionParams(params: {
  gasPrice?: string
  gasAdjustment?: number
  memo?: string
}): void {
  if (params.gasPrice !== undefined) {
    if (typeof params.gasPrice !== 'string' || params.gasPrice.length === 0) {
      throw new ValidationError('Gas price must be a non-empty string')
    }
    // Validate gas price format (e.g., "0.025uakt")
    const gasPriceRegex = /^[0-9]+\.?[0-9]*[a-z]+$/
    if (!gasPriceRegex.test(params.gasPrice)) {
      throw new ValidationError('Gas price must be in format "0.025uakt"')
    }
  }

  if (params.gasAdjustment !== undefined) {
    validatePositiveNumber(params.gasAdjustment, 'Gas adjustment')
  }

  if (params.memo !== undefined && typeof params.memo !== 'string') {
    throw new ValidationError('Memo must be a string')
  }
}

/**
 * Validates Akash address with a specific prefix
 */
export function validateAkashAddress(address: string, prefix: string = 'akash'): void {
  if (!address || typeof address !== 'string') {
    throw new ValidationError('Address must be a non-empty string')
  }

  const expectedPrefix = prefix === 'akash' ? 'akash1' : `${prefix}1`
  if (!address.startsWith(expectedPrefix)) {
    throw new ValidationError(`Address must start with ${expectedPrefix}`)
  }

  // Basic length validation (Bech32 addresses are typically 39-59 characters)
  if (address.length < 39) {
    throw new ValidationError('Address is too short')
  }
}

/**
 * Common wallet validation used across modules
 */
export function validateWalletAddress(address: string): void {
  validateAkashAddress(address, 'akash')
}

/**
 * Validates validator address
 */
export function validateValidatorAddress(address: string): void {
  validateAkashAddress(address, 'akashvaloper')
}

/**
 * Validates that a string is non-empty
 */
export function validateNonEmptyString(value: string, fieldName: string): void {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} must be a non-empty string`)
  }
}

/**
 * Validates coin amount
 */
export function validateCoinAmount(coin: { denom?: string; amount?: string }, fieldName: string = 'Coin'): void {
  if (!coin) {
    throw new ValidationError(`${fieldName} is required`)
  }

  if (!coin.denom || typeof coin.denom !== 'string') {
    throw new ValidationError(`${fieldName} must have a valid denom`)
  }

  if (!coin.amount || typeof coin.amount !== 'string') {
    throw new ValidationError(`${fieldName} must have a valid amount`)
  }

  // Validate amount is a positive number
  const amount = BigInt(coin.amount)
  if (amount <= 0n) {
    throw new ValidationError(`${fieldName} amount must be positive`)
  }
}

/**
 * Validates URL format
 */
export function validateURL(url: string, fieldName: string = 'URL'): void {
  if (!url || typeof url !== 'string') {
    throw new ValidationError(`${fieldName} must be a non-empty string`)
  }

  try {
    new URL(url)
  } catch {
    throw new ValidationError(`${fieldName} must be a valid URL`)
  }
}

/**
 * Validates a timeout timestamp is in the future
 */
export function validateFutureTimestamp(timestamp: bigint, fieldName: string = 'Timeout'): void {
  const now = BigInt(Date.now()) * 1_000_000n // Convert to nanoseconds
  if (timestamp <= now) {
    throw new ValidationError(`${fieldName} must be in the future`)
  }
}
