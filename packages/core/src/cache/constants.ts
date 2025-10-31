/**
 * Constants for cache management
 * @module cache/constants
 */

/**
 * Default stale period for cache entries (1 minute)
 * During this period, stale data is returned while revalidation happens in background
 */
export const DEFAULT_STALE_TTL = 60000

/**
 * Default TTL when original TTL cannot be determined (1 minute)
 */
export const DEFAULT_FALLBACK_TTL = 60000

/**
 * Default cache TTL for provider lists (5 minutes)
 */
export const DEFAULT_PROVIDER_CACHE_TTL = 300000

/**
 * Default cache TTL for market operations (2 minutes)
 */
export const DEFAULT_MARKET_CACHE_TTL = 120000

/**
 * Default cache TTL for deployment data (3 minutes)
 */
export const DEFAULT_DEPLOYMENT_CACHE_TTL = 180000

/**
 * Default cache TTL for validator data (5 minutes)
 */
export const DEFAULT_VALIDATOR_CACHE_TTL = 300000

/**
 * Default cache TTL for blockchain height/status (10 seconds)
 */
export const DEFAULT_STATUS_CACHE_TTL = 10000
