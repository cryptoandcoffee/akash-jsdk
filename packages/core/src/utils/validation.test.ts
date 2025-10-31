import { describe, it, expect } from 'vitest'
import { ValidationError } from '../errors'
import {
  validatePositiveNumber,
  validateTTL,
  validateTendermintQuery,
  validateBigIntString,
  validateAkashAddress,
  validateValidatorAddress,
  validateWebSocketUrl,
  validateCoinAmount,
  validateRequired,
  validateNonEmptyString,
  validateChannelId,
  validateTimeoutTimestamp,
  validateSDL,
  validateCertificate,
  validateProviderAddress,
  validateDseq,
  validateGasPrice,
  validateTxHash,
  validateNonEmptyArray,
  validateCallback
} from './validation'

describe('Validation Utilities', () => {
  describe('validatePositiveNumber', () => {
    it('should pass for positive numbers', () => {
      expect(() => validatePositiveNumber(1, 'test')).not.toThrow()
      expect(() => validatePositiveNumber(100, 'test')).not.toThrow()
      expect(() => validatePositiveNumber(0.5, 'test')).not.toThrow()
    })

    it('should throw for zero', () => {
      expect(() => validatePositiveNumber(0, 'test')).toThrow(ValidationError)
      expect(() => validatePositiveNumber(0, 'test')).toThrow('must be a positive number')
    })

    it('should throw for negative numbers', () => {
      expect(() => validatePositiveNumber(-1, 'test')).toThrow(ValidationError)
      expect(() => validatePositiveNumber(-100, 'test')).toThrow('must be a positive number')
    })

    it('should throw for NaN', () => {
      expect(() => validatePositiveNumber(NaN, 'test')).toThrow(ValidationError)
    })

    it('should throw for non-numbers', () => {
      expect(() => validatePositiveNumber('5' as any, 'test')).toThrow(ValidationError)
    })
  })

  describe('validateTTL', () => {
    it('should pass for valid TTL values', () => {
      expect(() => validateTTL(1000)).not.toThrow()
      expect(() => validateTTL(60000)).not.toThrow()
      expect(() => validateTTL(Number.MAX_SAFE_INTEGER)).not.toThrow()
    })

    it('should throw for negative TTL', () => {
      expect(() => validateTTL(-1000)).toThrow(ValidationError)
    })

    it('should throw for zero TTL', () => {
      expect(() => validateTTL(0)).toThrow(ValidationError)
    })

    it('should throw for TTL larger than MAX_SAFE_INTEGER', () => {
      expect(() => validateTTL(Number.MAX_SAFE_INTEGER + 1)).toThrow(ValidationError)
    })
  })

  describe('validateTendermintQuery', () => {
    it('should pass for valid Tendermint queries', () => {
      expect(() => validateTendermintQuery("tm.event='Tx'")).not.toThrow()
      expect(() => validateTendermintQuery("message.module='deployment'")).not.toThrow()
      expect(() => validateTendermintQuery("tm.event='Tx' AND message.module='deployment'")).not.toThrow()
    })

    it('should throw for empty string', () => {
      expect(() => validateTendermintQuery('')).toThrow(ValidationError)
      expect(() => validateTendermintQuery('   ')).toThrow(ValidationError)
    })

    it('should throw for queries without = sign', () => {
      expect(() => validateTendermintQuery('invalid query')).toThrow(ValidationError)
      expect(() => validateTendermintQuery('invalid query')).toThrow('Must contain key=value pairs')
    })

    it('should throw for non-string values', () => {
      expect(() => validateTendermintQuery(null as any)).toThrow(ValidationError)
      expect(() => validateTendermintQuery(undefined as any)).toThrow(ValidationError)
    })
  })

  describe('validateBigIntString', () => {
    it('should pass for numeric strings', () => {
      expect(() => validateBigIntString('0', 'test')).not.toThrow()
      expect(() => validateBigIntString('123', 'test')).not.toThrow()
      expect(() => validateBigIntString('999999999999999999', 'test')).not.toThrow()
    })

    it('should throw for non-numeric strings', () => {
      expect(() => validateBigIntString('abc', 'test')).toThrow(ValidationError)
      expect(() => validateBigIntString('12.5', 'test')).toThrow(ValidationError)
      expect(() => validateBigIntString('12e5', 'test')).toThrow(ValidationError)
    })

    it('should throw for empty string', () => {
      expect(() => validateBigIntString('', 'test')).toThrow(ValidationError)
    })

    it('should throw for non-string values', () => {
      expect(() => validateBigIntString(123 as any, 'test')).toThrow(ValidationError)
      expect(() => validateBigIntString(null as any, 'test')).toThrow(ValidationError)
    })
  })

  describe('validateAkashAddress', () => {
    it('should pass for valid Akash addresses', () => {
      expect(() => validateAkashAddress('akash1' + 'a'.repeat(38))).not.toThrow()
      expect(() => validateAkashAddress('akash1' + 'x'.repeat(38))).not.toThrow()
    })

    it('should throw for addresses with wrong prefix', () => {
      expect(() => validateAkashAddress('cosmos1' + 'a'.repeat(38))).toThrow(ValidationError)
      expect(() => validateAkashAddress('cosmos1' + 'a'.repeat(38))).toThrow('must start with akash')
    })

    it('should throw for addresses with invalid length', () => {
      expect(() => validateAkashAddress('akash1abc')).toThrow(ValidationError)
      expect(() => validateAkashAddress('akash1' + 'a'.repeat(50))).toThrow(ValidationError)
    })

    it('should throw for empty string', () => {
      expect(() => validateAkashAddress('')).toThrow(ValidationError)
    })

    it('should validate custom prefix', () => {
      expect(() => validateAkashAddress('custom1' + 'a'.repeat(38), 'custom')).not.toThrow()
      expect(() => validateAkashAddress('akash1' + 'a'.repeat(38), 'custom')).toThrow(ValidationError)
    })
  })

  describe('validateValidatorAddress', () => {
    it('should pass for valid validator addresses', () => {
      expect(() => validateValidatorAddress('akashvaloper1' + 'a'.repeat(38))).not.toThrow()
    })

    it('should throw for non-validator addresses', () => {
      expect(() => validateValidatorAddress('akash1' + 'a'.repeat(38))).toThrow(ValidationError)
    })

    it('should throw for invalid length', () => {
      expect(() => validateValidatorAddress('akashvaloper1abc')).toThrow(ValidationError)
    })
  })

  describe('validateWebSocketUrl', () => {
    it('should pass for valid HTTP URLs', () => {
      expect(() => validateWebSocketUrl('http://localhost:26657')).not.toThrow()
      expect(() => validateWebSocketUrl('https://rpc.akash.network')).not.toThrow()
    })

    it('should pass for valid WebSocket URLs', () => {
      expect(() => validateWebSocketUrl('ws://localhost:26657')).not.toThrow()
      expect(() => validateWebSocketUrl('wss://rpc.akash.network')).not.toThrow()
    })

    it('should throw for invalid protocols', () => {
      expect(() => validateWebSocketUrl('ftp://localhost:26657')).toThrow(ValidationError)
      expect(() => validateWebSocketUrl('file:///path/to/file')).toThrow(ValidationError)
    })

    it('should throw for invalid URLs', () => {
      expect(() => validateWebSocketUrl('not a url')).toThrow(ValidationError)
      expect(() => validateWebSocketUrl('')).toThrow(ValidationError)
    })

    it('should throw for non-string values', () => {
      expect(() => validateWebSocketUrl(null as any)).toThrow(ValidationError)
    })
  })

  describe('validateCoinAmount', () => {
    it('should pass for valid coin amounts', () => {
      expect(() => validateCoinAmount({ denom: 'uakt', amount: '1000' })).not.toThrow()
      expect(() => validateCoinAmount({ denom: 'uakt', amount: '999999999999' })).not.toThrow()
    })

    it('should throw for zero amount', () => {
      expect(() => validateCoinAmount({ denom: 'uakt', amount: '0' })).toThrow(ValidationError)
    })

    it('should throw for negative amount', () => {
      expect(() => validateCoinAmount({ denom: 'uakt', amount: '-100' })).toThrow(ValidationError)
    })

    it('should throw for missing denom', () => {
      expect(() => validateCoinAmount({ denom: '', amount: '1000' })).toThrow(ValidationError)
      expect(() => validateCoinAmount({ denom: null as any, amount: '1000' })).toThrow(ValidationError)
    })

    it('should throw for missing amount', () => {
      expect(() => validateCoinAmount({ denom: 'uakt', amount: '' })).toThrow(ValidationError)
    })

    it('should throw for non-numeric amount', () => {
      expect(() => validateCoinAmount({ denom: 'uakt', amount: 'abc' })).toThrow(ValidationError)
    })

    it('should throw for non-object input', () => {
      expect(() => validateCoinAmount(null as any)).toThrow(ValidationError)
      expect(() => validateCoinAmount('invalid' as any)).toThrow(ValidationError)
    })
  })

  describe('validateRequired', () => {
    it('should pass for defined values', () => {
      expect(() => validateRequired('value', 'test')).not.toThrow()
      expect(() => validateRequired(0, 'test')).not.toThrow()
      expect(() => validateRequired(false, 'test')).not.toThrow()
      expect(() => validateRequired('', 'test')).not.toThrow()
    })

    it('should throw for null', () => {
      expect(() => validateRequired(null, 'test')).toThrow(ValidationError)
      expect(() => validateRequired(null, 'test')).toThrow('is required')
    })

    it('should throw for undefined', () => {
      expect(() => validateRequired(undefined, 'test')).toThrow(ValidationError)
    })
  })

  describe('validateNonEmptyString', () => {
    it('should pass for non-empty strings', () => {
      expect(() => validateNonEmptyString('hello', 'test')).not.toThrow()
      expect(() => validateNonEmptyString('a', 'test')).not.toThrow()
    })

    it('should throw for empty string', () => {
      expect(() => validateNonEmptyString('', 'test')).toThrow(ValidationError)
    })

    it('should throw for whitespace only', () => {
      expect(() => validateNonEmptyString('   ', 'test')).toThrow(ValidationError)
      expect(() => validateNonEmptyString('\n\t', 'test')).toThrow(ValidationError)
    })

    it('should throw for non-string values', () => {
      expect(() => validateNonEmptyString(null as any, 'test')).toThrow(ValidationError)
      expect(() => validateNonEmptyString(undefined as any, 'test')).toThrow(ValidationError)
      expect(() => validateNonEmptyString(123 as any, 'test')).toThrow(ValidationError)
    })
  })

  describe('validateChannelId', () => {
    it('should pass for valid channel IDs', () => {
      expect(() => validateChannelId('channel-0')).not.toThrow()
      expect(() => validateChannelId('channel-123')).not.toThrow()
      expect(() => validateChannelId('channel-999')).not.toThrow()
    })

    it('should throw for invalid format', () => {
      expect(() => validateChannelId('channel')).toThrow(ValidationError)
      expect(() => validateChannelId('ch-0')).toThrow(ValidationError)
      expect(() => validateChannelId('channel-abc')).toThrow(ValidationError)
      expect(() => validateChannelId('0')).toThrow(ValidationError)
    })

    it('should throw for empty string', () => {
      expect(() => validateChannelId('')).toThrow(ValidationError)
    })
  })

  describe('validateTimeoutTimestamp', () => {
    it('should pass for future timestamps', () => {
      const futureTime = BigInt(Date.now()) * 1_000_000n + 1_000_000_000n
      expect(() => validateTimeoutTimestamp(futureTime)).not.toThrow()
    })

    it('should throw for past timestamps', () => {
      const pastTime = BigInt(Date.now()) * 1_000_000n - 1_000_000_000n
      expect(() => validateTimeoutTimestamp(pastTime)).toThrow(ValidationError)
      expect(() => validateTimeoutTimestamp(pastTime)).toThrow('must be in the future')
    })

    it('should throw for current time', () => {
      const now = BigInt(Date.now()) * 1_000_000n
      expect(() => validateTimeoutTimestamp(now)).toThrow(ValidationError)
    })
  })

  describe('validateSDL', () => {
    it('should pass for valid SDL strings', () => {
      expect(() => validateSDL('version: "2.0"\nservices:\n  web:')).not.toThrow()
      expect(() => validateSDL('key: value')).not.toThrow()
    })

    it('should throw for empty string', () => {
      expect(() => validateSDL('')).toThrow(ValidationError)
    })

    it('should throw for non-YAML format', () => {
      expect(() => validateSDL('not yaml')).toThrow(ValidationError)
      expect(() => validateSDL('not yaml')).toThrow('must be valid YAML format')
    })

    it('should throw for whitespace only', () => {
      expect(() => validateSDL('   ')).toThrow(ValidationError)
    })
  })

  describe('validateCertificate', () => {
    it('should pass for PEM format certificates', () => {
      expect(() => validateCertificate('-----BEGIN CERTIFICATE-----\ndata\n-----END CERTIFICATE-----')).not.toThrow()
      expect(() => validateCertificate('BEGIN something END')).not.toThrow()
    })

    it('should throw for non-PEM format', () => {
      expect(() => validateCertificate('not a certificate')).toThrow(ValidationError)
      expect(() => validateCertificate('not a certificate')).toThrow('must be in PEM format')
    })

    it('should throw for empty string', () => {
      expect(() => validateCertificate('')).toThrow(ValidationError)
    })
  })

  describe('validateProviderAddress', () => {
    it('should pass for valid provider addresses', () => {
      expect(() => validateProviderAddress('akash1' + 'a'.repeat(38))).not.toThrow()
    })

    it('should throw for invalid addresses', () => {
      expect(() => validateProviderAddress('invalid')).toThrow(ValidationError)
    })
  })

  describe('validateDseq', () => {
    it('should pass for valid dseq values', () => {
      expect(() => validateDseq('123456')).not.toThrow()
      expect(() => validateDseq('999999999999')).not.toThrow()
    })

    it('should throw for non-numeric strings', () => {
      expect(() => validateDseq('abc')).toThrow(ValidationError)
    })

    it('should throw for empty string', () => {
      expect(() => validateDseq('')).toThrow(ValidationError)
    })
  })

  describe('validateGasPrice', () => {
    it('should pass for valid gas prices', () => {
      expect(() => validateGasPrice('0.025uakt')).not.toThrow()
      expect(() => validateGasPrice('1.5uatom')).not.toThrow()
      expect(() => validateGasPrice('0uakt')).not.toThrow()
    })

    it('should throw for invalid format', () => {
      expect(() => validateGasPrice('0.025')).toThrow(ValidationError)
      expect(() => validateGasPrice('uakt')).toThrow(ValidationError)
      expect(() => validateGasPrice('invalid')).toThrow(ValidationError)
    })

    it('should throw for empty string', () => {
      expect(() => validateGasPrice('')).toThrow(ValidationError)
    })
  })

  describe('validateTxHash', () => {
    it('should pass for valid transaction hashes', () => {
      expect(() => validateTxHash('A'.repeat(64))).not.toThrow()
      expect(() => validateTxHash('a'.repeat(64))).not.toThrow()
      expect(() => validateTxHash('batch-12345')).not.toThrow()
      expect(() => validateTxHash('delegate-12345')).not.toThrow()
    })

    it('should throw for invalid hashes', () => {
      expect(() => validateTxHash('tooshort')).toThrow(ValidationError)
      expect(() => validateTxHash('G'.repeat(64))).toThrow(ValidationError)
    })

    it('should throw for empty string', () => {
      expect(() => validateTxHash('')).toThrow(ValidationError)
    })
  })

  describe('validateNonEmptyArray', () => {
    it('should pass for non-empty arrays', () => {
      expect(() => validateNonEmptyArray([1], 'test')).not.toThrow()
      expect(() => validateNonEmptyArray([1, 2, 3], 'test')).not.toThrow()
      expect(() => validateNonEmptyArray(['a', 'b'], 'test')).not.toThrow()
    })

    it('should throw for empty arrays', () => {
      expect(() => validateNonEmptyArray([], 'test')).toThrow(ValidationError)
      expect(() => validateNonEmptyArray([], 'test')).toThrow('must be a non-empty array')
    })

    it('should throw for non-array values', () => {
      expect(() => validateNonEmptyArray(null as any, 'test')).toThrow(ValidationError)
      expect(() => validateNonEmptyArray('not array' as any, 'test')).toThrow(ValidationError)
      expect(() => validateNonEmptyArray({} as any, 'test')).toThrow(ValidationError)
    })
  })

  describe('validateCallback', () => {
    it('should pass for functions', () => {
      expect(() => validateCallback(() => {}, 'test')).not.toThrow()
      expect(() => validateCallback(function() {}, 'test')).not.toThrow()
      expect(() => validateCallback(async () => {}, 'test')).not.toThrow()
    })

    it('should throw for non-functions', () => {
      expect(() => validateCallback(null, 'test')).toThrow(ValidationError)
      expect(() => validateCallback(undefined, 'test')).toThrow(ValidationError)
      expect(() => validateCallback('string', 'test')).toThrow(ValidationError)
      expect(() => validateCallback({}, 'test')).toThrow(ValidationError)
      expect(() => validateCallback([], 'test')).toThrow(ValidationError)
    })
  })
})
