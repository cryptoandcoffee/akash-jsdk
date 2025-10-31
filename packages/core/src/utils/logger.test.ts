import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConsoleLogger, NoOpLogger, LogLevel, createDefaultLogger } from './logger'

describe('Logger', () => {
  describe('ConsoleLogger', () => {
    let consoleErrorSpy: any
    let consoleWarnSpy: any
    let consoleLogSpy: any

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
      consoleWarnSpy.mockRestore()
      consoleLogSpy.mockRestore()
    })

    describe('Level Filtering', () => {
      it('should log all levels when set to DEBUG', () => {
        const logger = new ConsoleLogger(LogLevel.DEBUG)

        logger.debug('debug message')
        logger.info('info message')
        logger.warn('warn message')
        logger.error('error message')

        expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG] debug message')
        expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] info message')
        expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warn message')
        expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message')
      })

      it('should not log DEBUG when set to INFO', () => {
        const logger = new ConsoleLogger(LogLevel.INFO)

        logger.debug('debug message')
        logger.info('info message')
        logger.warn('warn message')
        logger.error('error message')

        expect(consoleLogSpy).not.toHaveBeenCalledWith('[DEBUG] debug message')
        expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] info message')
        expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warn message')
        expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message')
      })

      it('should only log WARN and ERROR when set to WARN', () => {
        const logger = new ConsoleLogger(LogLevel.WARN)

        logger.debug('debug message')
        logger.info('info message')
        logger.warn('warn message')
        logger.error('error message')

        expect(consoleLogSpy).not.toHaveBeenCalledWith('[DEBUG] debug message')
        expect(consoleLogSpy).not.toHaveBeenCalledWith('[INFO] info message')
        expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warn message')
        expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message')
      })

      it('should only log ERROR when set to ERROR', () => {
        const logger = new ConsoleLogger(LogLevel.ERROR)

        logger.debug('debug message')
        logger.info('info message')
        logger.warn('warn message')
        logger.error('error message')

        expect(consoleLogSpy).not.toHaveBeenCalledWith('[DEBUG] debug message')
        expect(consoleLogSpy).not.toHaveBeenCalledWith('[INFO] info message')
        expect(consoleWarnSpy).not.toHaveBeenCalledWith('[WARN] warn message')
        expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message')
      })
    })

    describe('Context Handling', () => {
      it('should log messages with context objects', () => {
        const logger = new ConsoleLogger(LogLevel.DEBUG)
        const context = { userId: '123', action: 'test' }

        logger.error('error occurred', context)
        logger.warn('warning message', context)
        logger.info('info message', context)
        logger.debug('debug message', context)

        expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error occurred', context)
        expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warning message', context)
        expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] info message', context)
        expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG] debug message', context)
      })

      it('should log messages without context when not provided', () => {
        const logger = new ConsoleLogger(LogLevel.DEBUG)

        logger.error('error occurred')
        logger.warn('warning message')
        logger.info('info message')
        logger.debug('debug message')

        expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error occurred')
        expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warning message')
        expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] info message')
        expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG] debug message')
      })

      it('should handle complex context objects', () => {
        const logger = new ConsoleLogger(LogLevel.INFO)
        const context = {
          nested: { value: 123 },
          array: [1, 2, 3],
          nullValue: null,
          undefinedValue: undefined
        }

        logger.info('complex context', context)

        expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] complex context', context)
      })
    })

    describe('Level Management', () => {
      it('should allow changing log level dynamically', () => {
        const logger = new ConsoleLogger(LogLevel.DEBUG)

        logger.debug('should be logged')
        expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG] should be logged')

        logger.setLevel(LogLevel.ERROR)
        logger.debug('should not be logged')
        expect(consoleLogSpy).not.toHaveBeenCalledWith('[DEBUG] should not be logged')
      })

      it('should return current log level', () => {
        const logger = new ConsoleLogger(LogLevel.INFO)
        expect(logger.getLevel()).toBe(LogLevel.INFO)

        logger.setLevel(LogLevel.DEBUG)
        expect(logger.getLevel()).toBe(LogLevel.DEBUG)
      })

      it('should default to INFO level when not specified', () => {
        const logger = new ConsoleLogger()
        expect(logger.getLevel()).toBe(LogLevel.INFO)

        logger.info('should be logged')
        logger.debug('should not be logged')

        expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] should be logged')
        expect(consoleLogSpy).not.toHaveBeenCalledWith('[DEBUG] should not be logged')
      })
    })
  })

  describe('NoOpLogger', () => {
    let consoleErrorSpy: any
    let consoleWarnSpy: any
    let consoleLogSpy: any

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
      consoleWarnSpy.mockRestore()
      consoleLogSpy.mockRestore()
    })

    it('should not produce any console output for error', () => {
      const logger = new NoOpLogger()
      logger.error('error message')
      logger.error('error with context', { key: 'value' })

      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should not produce any console output for warn', () => {
      const logger = new NoOpLogger()
      logger.warn('warn message')
      logger.warn('warn with context', { key: 'value' })

      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('should not produce any console output for info', () => {
      const logger = new NoOpLogger()
      logger.info('info message')
      logger.info('info with context', { key: 'value' })

      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should not produce any console output for debug', () => {
      const logger = new NoOpLogger()
      logger.debug('debug message')
      logger.debug('debug with context', { key: 'value' })

      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should be truly silent with all log methods', () => {
      const logger = new NoOpLogger()

      logger.error('error')
      logger.warn('warn')
      logger.info('info')
      logger.debug('debug')

      expect(consoleErrorSpy).not.toHaveBeenCalled()
      expect(consoleWarnSpy).not.toHaveBeenCalled()
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })
  })

  describe('createDefaultLogger', () => {
    let consoleLogSpy: any

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleLogSpy.mockRestore()
    })

    it('should create a ConsoleLogger with INFO level', () => {
      const logger = createDefaultLogger() as ConsoleLogger

      logger.info('test message')
      logger.debug('should not be logged')

      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] test message')
      expect(consoleLogSpy).not.toHaveBeenCalledWith('[DEBUG] should not be logged')
    })

    it('should return a Logger instance', () => {
      const logger = createDefaultLogger()

      expect(logger).toHaveProperty('error')
      expect(logger).toHaveProperty('warn')
      expect(logger).toHaveProperty('info')
      expect(logger).toHaveProperty('debug')
    })
  })

  describe('LogLevel Enum', () => {
    it('should have correct numeric values', () => {
      expect(LogLevel.DEBUG).toBe(0)
      expect(LogLevel.INFO).toBe(1)
      expect(LogLevel.WARN).toBe(2)
      expect(LogLevel.ERROR).toBe(3)
    })

    it('should have correct ordering for filtering', () => {
      expect(LogLevel.DEBUG < LogLevel.INFO).toBe(true)
      expect(LogLevel.INFO < LogLevel.WARN).toBe(true)
      expect(LogLevel.WARN < LogLevel.ERROR).toBe(true)
    })
  })
})
