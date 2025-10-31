import { describe, it, expect } from 'vitest'
import {
  validatePositiveNumber,
  validateTransactionParams,
  validateAkashAddress,
  validateWalletAddress,
  validateValidatorAddress,
  validateNonEmptyString,
  validateCoinAmount,
  validateURL,
  validateFutureTimestamp
} from './validation-helpers'
import { ValidationError } from '../errors'

describe('Validation Helpers', () => {
  describe('validatePositiveNumber', () => {
    it('should pass for positive numbers', () => {
      expect(() => validatePositiveNumber(1, 'Test')).not.toThrow()
      expect(() => validatePositiveNumber(100.5, 'Test')).not.toThrow()
    })

    it('should throw for zero', () => {
      expect(() => validatePositiveNumber(0, 'Test')).toThrow(ValidationError)
    })

    it('should throw for negative numbers', () => {
      expect(() => validatePositiveNumber(-1, 'Test')).toThrow(ValidationError)
    })

    it('should throw for non-numbers', () => {
      expect(() => validatePositiveNumber(NaN, 'Test')).toThrow(ValidationError)
      expect(() => validatePositiveNumber(Infinity, 'Test')).toThrow(ValidationError)
    })
  })

  describe('validateTransactionParams', () => {
    it('should pass for valid params', () => {
      expect(() =>
        validateTransactionParams({
          gasPrice: '0.025uakt',
          gasAdjustment: 1.5,
          memo: 'test memo'
        })
      ).not.toThrow()
    })

    it('should throw for invalid gas price format', () => {
      expect(() =>
        validateTransactionParams({ gasPrice: 'invalid' })
      ).toThrow(ValidationError)
    })

    it('should throw for negative gas adjustment', () => {
      expect(() =>
        validateTransactionParams({ gasAdjustment: -1 })
      ).toThrow(ValidationError)
    })

    it('should throw for non-string memo', () => {
      expect(() =>
        validateTransactionParams({ memo: 123 as any })
      ).toThrow(ValidationError)
    })
  })

  describe('validateAkashAddress', () => {
    it('should pass for valid akash address', () => {
      expect(() =>
        validateAkashAddress('akash1abcdefghijklmnopqrstuvwxyz0123456789', 'akash')
      ).not.toThrow()
    })

    it('should pass for valid validator address', () => {
      expect(() =>
        validateAkashAddress('akashvaloper1abcdefghijklmnopqrstuvwxyz0123456789', 'akashvaloper')
      ).not.toThrow()
    })

    it('should throw for wrong prefix', () => {
      expect(() =>
        validateAkashAddress('cosmos1abcdefghijklmnopqrstuvwxyz0123456789', 'akash')
      ).toThrow(ValidationError)
    })

    it('should throw for too short address', () => {
      expect(() =>
        validateAkashAddress('akash1abc', 'akash')
      ).toThrow(ValidationError)
    })

    it('should throw for empty address', () => {
      expect(() =>
        validateAkashAddress('', 'akash')
      ).toThrow(ValidationError)
    })
  })

  describe('validateWalletAddress', () => {
    it('should pass for valid wallet address', () => {
      expect(() =>
        validateWalletAddress('akash1abcdefghijklmnopqrstuvwxyz0123456789')
      ).not.toThrow()
    })

    it('should throw for invalid prefix', () => {
      expect(() =>
        validateWalletAddress('cosmos1abcdefghijklmnopqrstuvwxyz0123456789')
      ).toThrow(ValidationError)
    })
  })

  describe('validateValidatorAddress', () => {
    it('should pass for valid validator address', () => {
      expect(() =>
        validateValidatorAddress('akashvaloper1abcdefghijklmnopqrstuvwxyz0123456789')
      ).not.toThrow()
    })

    it('should throw for wallet address', () => {
      expect(() =>
        validateValidatorAddress('akash1abcdefghijklmnopqrstuvwxyz0123456789')
      ).toThrow(ValidationError)
    })
  })

  describe('validateNonEmptyString', () => {
    it('should pass for non-empty strings', () => {
      expect(() =>
        validateNonEmptyString('test', 'Field')
      ).not.toThrow()
    })

    it('should throw for empty string', () => {
      expect(() =>
        validateNonEmptyString('', 'Field')
      ).toThrow(ValidationError)
    })

    it('should throw for whitespace only', () => {
      expect(() =>
        validateNonEmptyString('   ', 'Field')
      ).toThrow(ValidationError)
    })

    it('should throw for non-string', () => {
      expect(() =>
        validateNonEmptyString(123 as any, 'Field')
      ).toThrow(ValidationError)
    })
  })

  describe('validateCoinAmount', () => {
    it('should pass for valid coin', () => {
      expect(() =>
        validateCoinAmount({ denom: 'uakt', amount: '1000' })
      ).not.toThrow()
    })

    it('should throw for missing denom', () => {
      expect(() =>
        validateCoinAmount({ amount: '1000' } as any)
      ).toThrow(ValidationError)
    })

    it('should throw for missing amount', () => {
      expect(() =>
        validateCoinAmount({ denom: 'uakt' } as any)
      ).toThrow(ValidationError)
    })

    it('should throw for zero amount', () => {
      expect(() =>
        validateCoinAmount({ denom: 'uakt', amount: '0' })
      ).toThrow(ValidationError)
    })

    it('should throw for negative amount', () => {
      expect(() =>
        validateCoinAmount({ denom: 'uakt', amount: '-100' })
      ).toThrow(ValidationError)
    })
  })

  describe('validateURL', () => {
    it('should pass for valid URLs', () => {
      expect(() =>
        validateURL('https://example.com')
      ).not.toThrow()
      expect(() =>
        validateURL('http://localhost:8080')
      ).not.toThrow()
    })

    it('should throw for invalid URL', () => {
      expect(() =>
        validateURL('not-a-url')
      ).toThrow(ValidationError)
    })

    it('should throw for empty string', () => {
      expect(() =>
        validateURL('')
      ).toThrow(ValidationError)
    })
  })

  describe('validateFutureTimestamp', () => {
    it('should pass for future timestamp', () => {
      const futureTimestamp = BigInt(Date.now() + 10000) * 1_000_000n
      expect(() =>
        validateFutureTimestamp(futureTimestamp)
      ).not.toThrow()
    })

    it('should throw for past timestamp', () => {
      const pastTimestamp = BigInt(Date.now() - 10000) * 1_000_000n
      expect(() =>
        validateFutureTimestamp(pastTimestamp)
      ).toThrow(ValidationError)
    })

    it('should throw for current timestamp', () => {
      const nowTimestamp = BigInt(Date.now()) * 1_000_000n
      expect(() =>
        validateFutureTimestamp(nowTimestamp)
      ).toThrow(ValidationError)
    })
  })
})
