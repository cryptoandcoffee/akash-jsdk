/**
 * Constants for IBC (Inter-Blockchain Communication) operations
 * @module ibc-constants
 */

/**
 * Default timeout offset in nanoseconds (10 minutes)
 */
export const DEFAULT_TIMEOUT_OFFSET_NS = 600_000_000_000n

/**
 * Conversion factor from milliseconds to nanoseconds
 */
export const MS_TO_NS_CONVERSION = 1_000_000n

/**
 * Default source port for IBC transfers
 */
export const DEFAULT_SOURCE_PORT = 'transfer'

/**
 * Default number of blocks to use for timeout height calculation
 */
export const DEFAULT_TIMEOUT_BLOCKS = 100

/**
 * Default revision number for timeout height (typically 0 for most chains)
 */
export const DEFAULT_REVISION_NUMBER = 0n

/**
 * Default channel state for open channels
 */
export const DEFAULT_CHANNEL_STATE = 'STATE_OPEN'

/**
 * Default channel ordering type
 */
export const DEFAULT_CHANNEL_ORDERING = 'ORDER_UNORDERED'

/**
 * Default IBC protocol version
 */
export const DEFAULT_IBC_VERSION = 'ics20-1'

/**
 * Success transaction code
 */
export const TX_SUCCESS_CODE = 0

/**
 * Default channel ID for IBC transfers
 */
export const DEFAULT_CHANNEL_ID = 'channel-0'

/**
 * Channel ID offset for counterparty channels
 */
export const COUNTERPARTY_CHANNEL_OFFSET = 100

/**
 * Minimum receiver address length for validation
 */
export const MIN_RECEIVER_ADDRESS_LENGTH = 20

/**
 * IBC denom prefix
 */
export const IBC_DENOM_PREFIX = 'ibc/'

/**
 * Default base denomination for Akash Network
 */
export const DEFAULT_BASE_DENOM = 'uakt'

/**
 * Default IBC path for transfers
 */
export const DEFAULT_IBC_PATH = 'transfer/channel-0'

/**
 * Mock acknowledgement response (base64 encoded "01")
 */
export const MOCK_IBC_ACK = 'AQ=='

/**
 * Default gas used for IBC transfers
 */
export const DEFAULT_IBC_GAS_USED = 150000n

/**
 * Default gas wanted for IBC transfers
 */
export const DEFAULT_IBC_GAS_WANTED = 200000n

/**
 * Mock height for IBC transfers in tests
 */
export const MOCK_IBC_HEIGHT = 12345
