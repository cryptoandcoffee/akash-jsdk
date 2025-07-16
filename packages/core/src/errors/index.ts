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

export class NetworkError extends AkashSDKError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', details)
    this.name = 'NetworkError'
  }
}

export class ValidationError extends AkashSDKError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class DeploymentError extends AkashSDKError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DEPLOYMENT_ERROR', details)
    this.name = 'DeploymentError'
  }
}

export class ProviderError extends AkashSDKError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PROVIDER_ERROR', details)
    this.name = 'ProviderError'
  }
}