import { TendermintEvent } from '../events/types'

export interface TendermintAttribute {
  key: string
  value: string
}

/**
 * Parses Tendermint event attributes into a Map
 * Handles base64 decoding automatically
 */
export function parseEventAttributes(
  event: TendermintEvent | { attributes: TendermintAttribute[] }
): Map<string, string> {
  const attrs = new Map<string, string>()

  // Handle both full TendermintEvent and simplified event objects
  const attributes = 'attributes' in event ? event.attributes : []

  for (const attr of attributes) {
    try {
      const key = Buffer.from(attr.key, 'base64').toString()
      const value = Buffer.from(attr.value, 'base64').toString()
      attrs.set(key, value)
    } catch (error) {
      // Skip malformed attributes
      continue
    }
  }

  return attrs
}

/**
 * Gets a specific attribute value from an event
 * Returns null if not found or cannot decode
 */
export function getEventAttribute(
  event: TendermintEvent | { attributes: TendermintAttribute[] },
  attributeKey: string
): string | null {
  const attrs = parseEventAttributes(event)
  return attrs.get(attributeKey) ?? null
}

/**
 * Gets multiple attributes from an event
 */
export function getEventAttributes(
  event: TendermintEvent | { attributes: TendermintAttribute[] },
  attributeKeys: string[]
): Record<string, string | null> {
  const attrs = parseEventAttributes(event)
  const result: Record<string, string | null> = {}

  for (const key of attributeKeys) {
    result[key] = attrs.get(key) ?? null
  }

  return result
}
