/**
 * Log levels in ascending order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Logger interface for structured logging
 */
export interface Logger {
  /**
   * Log an error message with optional context
   */
  error(message: string, context?: Record<string, any>): void

  /**
   * Log a warning message with optional context
   */
  warn(message: string, context?: Record<string, any>): void

  /**
   * Log an informational message with optional context
   */
  info(message: string, context?: Record<string, any>): void

  /**
   * Log a debug message with optional context
   */
  debug(message: string, context?: Record<string, any>): void
}

/**
 * Console-based logger implementation
 * Respects the configured log level and outputs to console
 */
export class ConsoleLogger implements Logger {
  private level: LogLevel

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this.level
  }

  error(message: string, context?: Record<string, any>): void {
    if (this.level <= LogLevel.ERROR) {
      if (context) {
        console.error(`[ERROR] ${message}`, context)
      } else {
        console.error(`[ERROR] ${message}`)
      }
    }
  }

  warn(message: string, context?: Record<string, any>): void {
    if (this.level <= LogLevel.WARN) {
      if (context) {
        console.warn(`[WARN] ${message}`, context)
      } else {
        console.warn(`[WARN] ${message}`)
      }
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (this.level <= LogLevel.INFO) {
      if (context) {
        console.log(`[INFO] ${message}`, context)
      } else {
        console.log(`[INFO] ${message}`)
      }
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.level <= LogLevel.DEBUG) {
      if (context) {
        console.log(`[DEBUG] ${message}`, context)
      } else {
        console.log(`[DEBUG] ${message}`)
      }
    }
  }
}

/**
 * No-op logger implementation that produces no output
 * Useful for production environments or when logging should be disabled
 */
export class NoOpLogger implements Logger {
  error(_message: string, _context?: Record<string, any>): void {
    // No-op
  }

  warn(_message: string, _context?: Record<string, any>): void {
    // No-op
  }

  info(_message: string, _context?: Record<string, any>): void {
    // No-op
  }

  debug(_message: string, _context?: Record<string, any>): void {
    // No-op
  }
}

/**
 * Create a default logger instance
 * Uses ConsoleLogger with INFO level by default
 */
export function createDefaultLogger(): Logger {
  return new ConsoleLogger(LogLevel.INFO)
}
