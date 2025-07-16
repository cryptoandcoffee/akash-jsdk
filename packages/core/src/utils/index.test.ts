import { describe, it, expect, vi } from 'vitest'
import { validateConfig, formatAKT, parseAKT, retry, sleep } from './index'
import { ValidationError } from '../errors'

describe('Utils', () => {
  describe('validateConfig', () => {
    it('should validate valid config', () => {
      const config = {
        rpcEndpoint: 'https://rpc.akashedge.com',
        chainId: 'akashnet-2'
      }
      
      expect(() => validateConfig(config)).not.toThrow()
    })

    it('should throw for missing rpcEndpoint', () => {
      const config = {
        rpcEndpoint: '',
        chainId: 'akashnet-2'
      }
      
      expect(() => validateConfig(config)).toThrow(ValidationError)
    })

    it('should throw for invalid rpcEndpoint URL', () => {
      const config = {
        rpcEndpoint: 'not-a-url',
        chainId: 'akashnet-2'
      }
      
      expect(() => validateConfig(config)).toThrow(ValidationError)
    })

    it('should throw for missing chainId', () => {
      const config = {
        rpcEndpoint: 'https://rpc.akashedge.com',
        chainId: ''
      }
      
      expect(() => validateConfig(config)).toThrow(ValidationError)
    })
  })

  describe('formatAKT', () => {
    it('should format AKT correctly from string', () => {
      expect(formatAKT('1000000')).toBe('1.000000')
    })

    it('should format AKT correctly from number', () => {
      expect(formatAKT(1000000)).toBe('1.000000')
    })

    it('should handle custom decimals', () => {
      expect(formatAKT('1000', 3)).toBe('1.000')
    })
  })

  describe('parseAKT', () => {
    it('should parse AKT correctly', () => {
      expect(parseAKT('1.5')).toBe('1500000')
    })

    it('should handle custom decimals', () => {
      expect(parseAKT('1.5', 3)).toBe('1500')
    })
  })

  describe('sleep', () => {
    it('should resolve after specified time', async () => {
      const start = Date.now()
      await sleep(10)
      const end = Date.now()
      
      expect(end - start).toBeGreaterThanOrEqual(8) // Allow small timing variance
    })
  })

  describe('retry', () => {
    it('should succeed on first try', async () => {
      const fn = vi.fn().mockResolvedValue('success')
      
      const result = await retry(fn, 3, 10)
      
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and eventually succeed', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')
      
      const result = await retry(fn, 3, 10)
      
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should throw after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))
      
      await expect(retry(fn, 2, 10)).rejects.toThrow('fail')
      expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries
    })
  })
})