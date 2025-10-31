/**
 * Base SDK error with context and cause support
 */
export class SDKError extends Error {
  public context?: Record<string, any>
  public cause?: Error

  constructor(
    message: string,
    context?: Record<string, any>,
    cause?: Error
  ) {
    super(message)
    this.name = this.constructor.name
    this.context = context
    this.cause = cause

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Returns error with full context as string
   */
  toString(): string {
    let msg = `${this.name}: ${this.message}`

    if (this.context) {
      msg += `\nContext: ${JSON.stringify(this.context, null, 2)}`
    }

    if (this.cause) {
      msg += `\nCaused by: ${this.cause.message}`
      if (this.cause.stack) {
        msg += `\n${this.cause.stack}`
      }
    }

    return msg
  }
}

/**
 * Legacy error class for backward compatibility
 * @deprecated Use SDKError or specific error types instead
 */
export class AkashSDKError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AkashSDKError'
  }
}

export class NetworkError extends SDKError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, context, cause)
    this.name = 'NetworkError'
  }
}

export class ValidationError extends SDKError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, context, cause)
    this.name = 'ValidationError'
  }
}

export class DeploymentError extends SDKError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, context, cause)
    this.name = 'DeploymentError'
  }
}

export class ProviderError extends SDKError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, context, cause)
    this.name = 'ProviderError'
  }
}

export class ConfigurationError extends SDKError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, context, cause)
    this.name = 'ConfigurationError'
  }
}

export class CacheError extends SDKError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, context, cause)
    this.name = 'CacheError'
  }
}

export class EventStreamError extends SDKError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, context, cause)
    this.name = 'EventStreamError'
  }
}