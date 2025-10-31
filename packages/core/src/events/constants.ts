/**
 * Constants for event streaming
 * @module events/constants
 */

/**
 * Default maximum reconnection attempts before giving up
 */
export const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5

/**
 * Base delay for exponential backoff reconnection strategy (1 second)
 */
export const DEFAULT_RECONNECT_BASE_DELAY = 1000

/**
 * Maximum reconnection delay cap (30 seconds)
 */
export const DEFAULT_MAX_RECONNECT_DELAY = 30000

/**
 * Heartbeat ping interval (30 seconds)
 */
export const DEFAULT_HEARTBEAT_INTERVAL = 30000

/**
 * Heartbeat timeout before considering connection dead (10 seconds)
 */
export const DEFAULT_HEARTBEAT_TIMEOUT = 10000

/**
 * Base for exponential backoff calculation
 */
export const EXPONENTIAL_BACKOFF_BASE = 2

/**
 * JSON-RPC protocol version
 */
export const JSONRPC_VERSION = '2.0'

/**
 * WebSocket path suffix for Tendermint RPC
 */
export const WEBSOCKET_PATH_SUFFIX = '/websocket'

/**
 * Base 10 radix for parseInt operations
 */
export const DECIMAL_RADIX = 10

/**
 * Random string length for subscription IDs
 */
export const SUBSCRIPTION_ID_RANDOM_LENGTH = 9

/**
 * Base for random ID generation (base36 = 0-9,a-z)
 */
export const RANDOM_ID_BASE = 36

/**
 * Starting index for substring extraction in random ID generation
 */
export const RANDOM_ID_SUBSTRING_START = 2
