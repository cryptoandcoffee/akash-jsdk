import { ValidationError, NetworkError } from '../errors'

/**
 * Creates a validation error with context
 */
export function createValidationError(
  message: string,
  context?: Record<string, any>
): ValidationError {
  const error = new ValidationError(message)
  if (context) {
    Object.assign(error, context)
  }
  return error
}

/**
 * Creates a network error with context
 */
export function createNetworkError(
  message: string,
  originalError?: Error,
  context?: Record<string, any>
): NetworkError {
  const error = new NetworkError(message)
  if (originalError) {
    error.cause = originalError
  }
  if (context) {
    Object.assign(error, context)
  }
  return error
}

/**
 * Wraps an error-prone operation with network error handling
 */
export async function wrapNetworkError<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  context?: Record<string, any>
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw createNetworkError(errorMessage, error as Error, context)
  }
}

/**
 * Wraps an error-prone operation with validation error handling
 */
export function wrapValidationError<T>(
  operation: () => T,
  errorMessage: string,
  context?: Record<string, any>
): T {
  try {
    return operation()
  } catch (error) {
    throw createValidationError(errorMessage, { ...context, originalError: error })
  }
}
