import { describe, it, expect } from 'vitest'
import { parseEventAttributes, getEventAttribute, getEventAttributes } from './event-parsing'

describe('Event Parsing Utilities', () => {
  describe('parseEventAttributes', () => {
    it('should parse base64 encoded attributes into a Map', () => {
      const event = {
        attributes: [
          { key: Buffer.from('owner').toString('base64'), value: Buffer.from('akash1abc').toString('base64') },
          { key: Buffer.from('dseq').toString('base64'), value: Buffer.from('12345').toString('base64') }
        ]
      }

      const result = parseEventAttributes(event)

      expect(result.get('owner')).toBe('akash1abc')
      expect(result.get('dseq')).toBe('12345')
      expect(result.size).toBe(2)
    })

    it('should skip malformed attributes', () => {
      const event = {
        attributes: [
          { key: 'invalid-base64', value: 'also-invalid' },
          { key: Buffer.from('valid').toString('base64'), value: Buffer.from('value').toString('base64') }
        ]
      }

      const result = parseEventAttributes(event)

      expect(result.get('valid')).toBe('value')
      expect(result.size).toBe(1)
    })

    it('should handle empty attributes', () => {
      const event = { attributes: [] }

      const result = parseEventAttributes(event)

      expect(result.size).toBe(0)
    })
  })

  describe('getEventAttribute', () => {
    it('should return attribute value if found', () => {
      const event = {
        attributes: [
          { key: Buffer.from('owner').toString('base64'), value: Buffer.from('akash1abc').toString('base64') }
        ]
      }

      const result = getEventAttribute(event, 'owner')

      expect(result).toBe('akash1abc')
    })

    it('should return null if attribute not found', () => {
      const event = {
        attributes: [
          { key: Buffer.from('owner').toString('base64'), value: Buffer.from('akash1abc').toString('base64') }
        ]
      }

      const result = getEventAttribute(event, 'notfound')

      expect(result).toBeNull()
    })

    it('should return null for malformed attribute', () => {
      const event = {
        attributes: [
          { key: 'invalid', value: 'invalid' }
        ]
      }

      const result = getEventAttribute(event, 'test')

      expect(result).toBeNull()
    })
  })

  describe('getEventAttributes', () => {
    it('should return multiple attributes as object', () => {
      const event = {
        attributes: [
          { key: Buffer.from('owner').toString('base64'), value: Buffer.from('akash1abc').toString('base64') },
          { key: Buffer.from('dseq').toString('base64'), value: Buffer.from('12345').toString('base64') },
          { key: Buffer.from('version').toString('base64'), value: Buffer.from('v1').toString('base64') }
        ]
      }

      const result = getEventAttributes(event, ['owner', 'dseq', 'version'])

      expect(result).toEqual({
        owner: 'akash1abc',
        dseq: '12345',
        version: 'v1'
      })
    })

    it('should return null for missing attributes', () => {
      const event = {
        attributes: [
          { key: Buffer.from('owner').toString('base64'), value: Buffer.from('akash1abc').toString('base64') }
        ]
      }

      const result = getEventAttributes(event, ['owner', 'dseq', 'missing'])

      expect(result).toEqual({
        owner: 'akash1abc',
        dseq: null,
        missing: null
      })
    })

    it('should handle empty key list', () => {
      const event = {
        attributes: [
          { key: Buffer.from('owner').toString('base64'), value: Buffer.from('akash1abc').toString('base64') }
        ]
      }

      const result = getEventAttributes(event, [])

      expect(result).toEqual({})
    })
  })
})
