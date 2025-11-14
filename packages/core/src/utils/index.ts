import { AkashConfig } from '../types'
import { ValidationError } from '../errors'

export function validateConfig(config: AkashConfig): void {
  if (!config.rpcEndpoint) {
    throw new ValidationError('rpcEndpoint is required')
  }

  if (!config.chainId) {
    throw new ValidationError('chainId is required')
  }

  try {
    new URL(config.rpcEndpoint)
  } catch {
    throw new ValidationError('rpcEndpoint must be a valid URL')
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  return fn().catch(async (error) => {
    if (retries <= 0) throw error
    await sleep(delay)
    return retry(fn, retries - 1, delay * 2)
  })
}

export function formatAKT(amount: string | number, decimals: number = 6): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return (num / Math.pow(10, decimals)).toFixed(decimals)
}

export function parseAKT(amount: string, decimals: number = 6): string {
  const num = parseFloat(amount)
  return Math.floor(num * Math.pow(10, decimals)).toString()
}

// Export all validation utilities
export * from './validation-helpers'

// Export logger components
export type { Logger } from './logger'
export { LogLevel, ConsoleLogger, NoOpLogger, createDefaultLogger } from './logger'

// Export new utilities
export * from './event-parsing'
export * from './error-helpers'