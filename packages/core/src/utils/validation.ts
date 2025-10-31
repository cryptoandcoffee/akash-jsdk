import { ValidationError } from '../errors'

/**
 * Validates that a value is a positive number
 */
export function validatePositiveNumber(
  value: number,
  fieldName: string
): void {
  if (typeof value !== 'number' || value <= 0 || isNaN(value)) {
    throw new ValidationError(
      `${fieldName} must be a positive number, got: ${value}`
    )
  }
}

/**
 * Validates TTL value for cache operations
 */
export function validateTTL(ttl: number): void {
  validatePositiveNumber(ttl, 'TTL')
  if (ttl > Number.MAX_SAFE_INTEGER) {
    throw new ValidationError(
      `TTL value too large: ${ttl}`
    )
  }
}

/**
 * Validates Tendermint query syntax
 */
export function validateTendermintQuery(query: string): void {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new ValidationError(
      'Query must be a non-empty string'
    )
  }
  // Add basic syntax validation
  if (!query.includes('=')) {
    throw new ValidationError(
      'Invalid Tendermint query syntax. Must contain key=value pairs'
    )
  }
}

/**
 * Validates BigInt string format
 */
export function validateBigIntString(value: string, fieldName: string): void {
  if (!value || typeof value !== 'string') {
    throw new ValidationError(
      `${fieldName} must be a string, got: ${typeof value}`
    )
  }

  if (!/^\d+$/.test(value)) {
    throw new ValidationError(
      `${fieldName} must be a numeric string, got: ${value}`
    )
  }
}

/**
 * Validates Akash address format
 */
export function validateAkashAddress(
  address: string,
  prefix: string = 'akash'
): void {
  if (!address || typeof address !== 'string') {
    throw new ValidationError(
      `Address must be a non-empty string, got: ${typeof address}`
    )
  }

  if (!address.startsWith(prefix)) {
    throw new ValidationError(
      `Address must start with ${prefix}, got: ${address}`
    )
  }

  // Basic bech32 length validation (prefix + 1 + 38-45 chars)
  const minLength = prefix.length + 1 + 38
  const maxLength = prefix.length + 1 + 45
  if (address.length < minLength || address.length > maxLength) {
    throw new ValidationError(
      `Invalid address length: ${address.length}`
    )
  }
}

/**
 * Validates validator address format
 */
export function validateValidatorAddress(address: string): void {
  validateAkashAddress(address, 'akashvaloper')
}

/**
 * Validates WebSocket URL format
 */
export function validateWebSocketUrl(url: string): void {
  if (!url || typeof url !== 'string') {
    throw new ValidationError(
      'URL must be a non-empty string'
    )
  }

  try {
    const parsed = new URL(url)
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) {
      throw new ValidationError(
        `Invalid protocol: ${parsed.protocol}. Must be http/https/ws/wss`
      )
    }
  } catch (error) {
    throw new ValidationError(
      `Invalid URL format: ${url}`
    )
  }
}

/**
 * Validates coin amount structure
 */
export function validateCoinAmount(coin: { denom: string; amount: string }): void {
  if (!coin || typeof coin !== 'object') {
    throw new ValidationError('Coin must be an object')
  }

  if (!coin.denom || typeof coin.denom !== 'string') {
    throw new ValidationError('Coin denom must be a non-empty string')
  }

  validateBigIntString(coin.amount, 'Coin amount')

  const amount = BigInt(coin.amount)
  if (amount <= 0n) {
    throw new ValidationError(
      `Coin amount must be positive, got: ${coin.amount}`
    )
  }
}

/**
 * Validates required field
 */
export function validateRequired<T>(
  value: T | null | undefined,
  fieldName: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(
      `${fieldName} is required`
    )
  }
}

/**
 * Validates string is non-empty
 */
export function validateNonEmptyString(value: string, fieldName: string): void {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(
      `${fieldName} must be a non-empty string`
    )
  }
}

/**
 * Validates IBC channel ID format
 */
export function validateChannelId(channelId: string): void {
  validateNonEmptyString(channelId, 'Channel ID')
  if (!/^channel-\d+$/.test(channelId)) {
    throw new ValidationError(
      `Invalid channel ID format: ${channelId}. Must be in format 'channel-N'`
    )
  }
}

/**
 * Validates timeout timestamp for IBC transfers
 */
export function validateTimeoutTimestamp(timeout: bigint): void {
  const now = BigInt(Date.now()) * 1_000_000n // Convert to nanoseconds
  if (timeout <= now) {
    throw new ValidationError(
      'Timeout must be in the future'
    )
  }
}

/**
 * Validates SDL (Service Definition Language) string
 */
export function validateSDL(sdl: string): void {
  validateNonEmptyString(sdl, 'SDL')

  // Basic SDL validation - check if it looks like YAML
  const trimmed = sdl.trim()
  if (!trimmed.includes(':') && !trimmed.includes('\n')) {
    throw new ValidationError(
      'SDL must be valid YAML format'
    )
  }
}

/**
 * Validates certificate string format
 */
export function validateCertificate(cert: string): void {
  validateNonEmptyString(cert, 'Certificate')

  // Check if it looks like a PEM certificate
  if (!cert.includes('BEGIN') || !cert.includes('END')) {
    throw new ValidationError(
      'Certificate must be in PEM format'
    )
  }
}

/**
 * Validates provider address format
 */
export function validateProviderAddress(address: string): void {
  validateAkashAddress(address, 'akash')
}

/**
 * Validates deployment sequence number
 */
export function validateDseq(dseq: string): void {
  validateNonEmptyString(dseq, 'dseq')
  validateBigIntString(dseq, 'dseq')
}

/**
 * Validates gas price string format
 */
export function validateGasPrice(gasPrice: string): void {
  validateNonEmptyString(gasPrice, 'Gas price')

  // Check format: number + denom (e.g., "0.025uakt")
  if (!/^\d+(\.\d+)?[a-z]+$/.test(gasPrice)) {
    throw new ValidationError(
      `Invalid gas price format: ${gasPrice}. Must be in format '0.025uakt'`
    )
  }
}

/**
 * Validates transaction hash format
 */
export function validateTxHash(txHash: string): void {
  validateNonEmptyString(txHash, 'Transaction hash')

  // Basic hex string validation
  if (!/^[A-Fa-f0-9]{64}$/.test(txHash) && !txHash.match(/^[a-z]+-\d+$/)) {
    throw new ValidationError(
      `Invalid transaction hash format: ${txHash}`
    )
  }
}

/**
 * Validates that an array is non-empty
 */
export function validateNonEmptyArray<T>(
  array: T[],
  fieldName: string
): void {
  if (!Array.isArray(array) || array.length === 0) {
    throw new ValidationError(
      `${fieldName} must be a non-empty array`
    )
  }
}

/**
 * Validates that a callback function is provided
 */
export function validateCallback(callback: unknown, fieldName: string): void {
  if (typeof callback !== 'function') {
    throw new ValidationError(
      `${fieldName} must be a function`
    )
  }
}
