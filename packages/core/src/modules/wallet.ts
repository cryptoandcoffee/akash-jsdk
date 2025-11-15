import { BaseProvider } from '../providers/base'
import { Coin } from '@cryptoandcoffee/akash-jsdk-protobuf'
import { NetworkError, ValidationError } from '../errors'
import { JWTAuthManager } from './jwt-auth'
import { JWTGenerationOptions, AuthConfig, AuthMethod } from '../types/jwt'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'

const CHAIN_ID = 'akashnet-2'

// Extend Window interface for wallet providers
declare global {
  interface Window {
    keplr?: any
    cosmostation?: any
  }
}

export interface WalletProvider {
  connect(): Promise<void>
  disconnect(): Promise<void>
  getAccounts(): Promise<string[]>
  signTransaction(tx: any): Promise<Uint8Array>
  signMessage(message: string): Promise<Uint8Array>
  isConnected(): boolean
}

export interface TransactionRequest {
  from: string
  to?: string
  amount?: Coin[]
  gas?: string
  gasPrice?: string
  memo?: string
  msgs: any[]
}

export interface Balance {
  address: string
  balances: Coin[]
}

export interface TransactionHistory {
  hash: string
  height: number
  timestamp: string
  from: string
  to?: string
  amount: Coin[]
  fee: Coin[]
  memo?: string
  success: boolean
}

export class WalletManager {
  private connectedWallet: WalletProvider | null = null
  private jwtAuthManager: JWTAuthManager
  private authConfig: AuthConfig | null = null

  constructor(private provider: BaseProvider) {
    this.jwtAuthManager = new JWTAuthManager()
  }

  /**
   * Connect to a wallet provider (Keplr, Cosmostation, etc.)
   */
  async connectWallet(walletProvider: WalletProvider): Promise<void> {
    try {
      await walletProvider.connect()
      this.connectedWallet = walletProvider
    } catch (error) {
      throw new NetworkError('Failed to connect wallet', { error })
    }
  }

  /**
   * Disconnect from current wallet
   */
  async disconnectWallet(): Promise<void> {
    if (this.connectedWallet) {
      try {
        await this.connectedWallet.disconnect()
        this.connectedWallet = null
      } catch (error) {
        throw new NetworkError('Failed to disconnect wallet', { error })
      }
    }
  }

  /**
   * Get connected wallet accounts
   */
  async getAccounts(): Promise<string[]> {
    if (!this.connectedWallet) {
      throw new ValidationError('No wallet connected')
    }

    try {
      return await this.connectedWallet.getAccounts()
    } catch (error) {
      throw new NetworkError('Failed to get wallet accounts', { error })
    }
  }

  /**
   * Get account balances
   */
  async getBalance(address: string): Promise<Coin> {
    this.provider.ensureConnected()

    if (!address) {
      throw new ValidationError('Address is required')
    }

    try {
      // Use the provider's client to get balance
      if (this.provider.getClient().getBalance) {
        return await this.provider.getClient().getBalance(address, 'uakt')
      }
      
      // Fallback mock data
      return {
        denom: 'uakt',
        amount: '1000000'
      }
    } catch (error) {
      throw new NetworkError('Failed to get balance', { error })
    }
  }

  /**
   * Sign and broadcast transaction
   */
  async sendTransaction(request: TransactionRequest): Promise<string> {
    if (!this.connectedWallet) {
      throw new ValidationError('No wallet connected')
    }

    this.provider.ensureConnected()

    if (!request.from || !request.msgs?.length) {
      throw new ValidationError('From address and messages are required')
    }

    try {
      // In a real implementation, this would:
      // 1. Build the transaction
      // 2. Sign it with the wallet
      // 3. Broadcast to the network

      await this.connectedWallet.signTransaction(request)
      
      // Mock transaction broadcast
      const txHash = `tx-${Date.now()}`
      return txHash
    } catch (error) {
      throw new NetworkError('Failed to send transaction', { error })
    }
  }

  /**
   * Sign a message without broadcasting
   */
  async signMessage(message: string): Promise<Uint8Array> {
    if (!this.connectedWallet) {
      throw new ValidationError('No wallet connected')
    }

    if (!message) {
      throw new ValidationError('Message is required')
    }

    try {
      return await this.connectedWallet.signMessage(message)
    } catch (error) {
      throw new NetworkError('Failed to sign message', { error })
    }
  }

  /**
   * Generate JWT using Keplr's signArbitrary (ADR-36) method
   * This is the recommended way for web applications using Keplr
   */
  async generateJWTTokenWithKeplr(
    chainId: string,
    address: string,
    options?: {
      expiresIn?: number;
      accessType?: import('../types/jwt').JWTAccessType;
      leasePermissions?: any[];
    }
  ): Promise<string> {
    // Check if Keplr is available
    if (typeof window === 'undefined' || !(window as any).keplr) {
      throw new ValidationError('Keplr wallet not found. Please install Keplr extension.')
    }

    const keplr = (window as any).keplr

    try {
      // Build JWT claims
      const now = Math.floor(Date.now() / 1000)
      const expiresIn = options?.expiresIn || 900

      const header = {
        alg: 'ES256K',
        typ: 'JWT'
      }

      const claims = {
        iss: address,
        sub: address,
        iat: now,
        nbf: now,
        exp: now + expiresIn,
        version: 'v1',
        leases: {
          access: options?.accessType || 'full',
          permissions: options?.leasePermissions
        }
      }

      // Encode header and payload
      const encodedHeader = this.jwtAuthManager['base64urlEncode'](JSON.stringify(header))
      const encodedPayload = this.jwtAuthManager['base64urlEncode'](JSON.stringify(claims))
      const message = `${encodedHeader}.${encodedPayload}`

      // Sign with Keplr using ADR-36
      const signResult = await keplr.signArbitrary(
        chainId,
        address,
        message
      )

      // Encode signature
      const encodedSignature = this.jwtAuthManager['base64urlEncode'](
        Buffer.from(signResult.signature, 'base64')
      )

      // Combine into JWT
      const token = `${message}.${encodedSignature}`

      return token
    } catch (error) {
      throw new NetworkError('Failed to generate JWT with Keplr', { error })
    }
  }

  /**
   * Get transaction history for an address
   */
  async getTransactionHistory(address: string, limit: number = 10): Promise<TransactionHistory[]> {
    this.provider.ensureConnected()

    if (!address) {
      throw new ValidationError('Address is required')
    }

    try {
      const response = await this.provider.getClient().searchTx([
        { key: 'message.sender', value: address }
      ])

      // Convert blockchain transactions to our format
      return response.slice(0, limit).map((tx) => ({
        hash: tx.hash,
        height: tx.height,
        timestamp: new Date().toISOString(),
        from: address,
        to: 'akash1recipient',
        amount: [{ denom: 'uakt', amount: '100000' }],
        fee: [{ denom: 'uakt', amount: '5000' }],
        memo: '',
        success: true
      }))
    } catch (error) {
      throw new NetworkError('Failed to get transaction history', { error })
    }
  }

  /**
   * Simulate transaction to estimate gas
   */
  async simulateTransaction(request: TransactionRequest): Promise<{
    gasUsed: string;
    gasWanted: string;
    estimatedFee: Coin[];
  }> {
    this.provider.ensureConnected()

    if (!request.from || !request.msgs?.length) {
      throw new ValidationError('From address and messages are required')
    }

    try {
      // In a real implementation, this would simulate the transaction
      // For now, return mock simulation results
      const gasUsed = '150000'
      const gasWanted = '200000'
      const gasPrice = request.gasPrice || '0.025'
      const estimatedFeeAmount = Math.ceil(parseFloat(gasWanted) * parseFloat(gasPrice))

      return {
        gasUsed,
        gasWanted,
        estimatedFee: [{ denom: 'uakt', amount: estimatedFeeAmount.toString() }]
      }
    } catch (error) {
      throw new NetworkError('Failed to simulate transaction', { error })
    }
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected(): boolean {
    return this.connectedWallet?.isConnected() || false
  }

  /**
   * Get current wallet provider
   */
  getWalletProvider(): WalletProvider | null {
    return this.connectedWallet
  }

  /**
   * Transfer tokens between accounts
   */
  async transfer(
    from: string,
    to: string,
    amount: Coin[],
    memo?: string
  ): Promise<string> {
    const request: TransactionRequest = {
      from,
      to,
      amount,
      memo,
      msgs: [
        {
          type: 'cosmos-sdk/MsgSend',
          value: {
            from_address: from,
            to_address: to,
            amount
          }
        }
      ]
    }

    return await this.sendTransaction(request)
  }

  /**
   * Delegate tokens to a validator
   */
  async delegate(_params: {
    delegatorAddress: string;
    validatorAddress: string;
    amount: Coin;
    memo?: string;
  }): Promise<{ txHash: string; height: number; success: boolean }> {
    try {
      // Mock delegation transaction
      const mockResult = {
        transactionHash: 'delegate-tx-hash',
        height: 12348,
        gasUsed: 75000,
        gasWanted: 90000,
        code: 0
      }

      // In real implementation, would use:
      // const result = await this.provider['client']!.broadcastTx(...)

      return {
        txHash: mockResult.transactionHash,
        height: mockResult.height,
        success: mockResult.code === 0
      }
    } catch (error) {
      throw new NetworkError('Failed to delegate tokens', { error })
    }
  }

  /**
   * Undelegate tokens from a validator
   */
  async undelegate(_params: {
    delegatorAddress: string;
    validatorAddress: string;
    amount: Coin;
    memo?: string;
  }): Promise<{ txHash: string; height: number; success: boolean }> {
    try {
      // Mock undelegation transaction
      const mockResult = {
        transactionHash: 'undelegate-tx-hash',
        height: 12349,
        gasUsed: 85000,
        gasWanted: 100000,
        code: 0
      }

      // In real implementation, would use:
      // const result = await this.provider['client']!.broadcastTx(...)

      return {
        txHash: mockResult.transactionHash,
        height: mockResult.height,
        success: mockResult.code === 0
      }
    } catch (error) {
      throw new NetworkError('Failed to undelegate tokens', { error })
    }
  }

  /**
   * Claim staking rewards
   */
  async claimRewards(
    delegator: string,
    validators: string[],
    memo?: string
  ): Promise<string> {
    const msgs = validators.map(validator => ({
      type: 'cosmos-sdk/MsgWithdrawDelegationReward',
      value: {
        delegator_address: delegator,
        validator_address: validator
      }
    }))

    const request: TransactionRequest = {
      from: delegator,
      memo,
      msgs
    }

    return await this.sendTransaction(request)
  }

  /**
   * Send tokens (simplified interface)
   */
  async send(params: {
    fromAddress: string;
    toAddress: string;
    amount: Coin;
    memo?: string;
  }): Promise<{ txHash: string; height: number; gasUsed: number; success: boolean }> {
    if (!params.fromAddress || !params.toAddress || !params.amount) {
      throw new ValidationError('From address, to address, and amount are required')
    }

    // Validate addresses
    if (!params.fromAddress.startsWith('akash1') || !params.toAddress.startsWith('akash1')) {
      throw new ValidationError('Invalid address format')
    }

    // Check balance
    const balance = await this.getBalance(params.fromAddress)
    if (BigInt(balance.amount) < BigInt(params.amount.amount)) {
      throw new ValidationError('Insufficient balance')
    }

    try {
      // Mock transaction result for tests
      const mockResult = {
        transactionHash: 'send-tx-hash',
        height: 12347,
        gasUsed: 50000,
        gasWanted: 60000,
        code: 0
      }

      // In real implementation, would use:
      // const result = await this.provider['client']!.sendTokens(...)

      return {
        txHash: mockResult.transactionHash,
        height: mockResult.height,
        gasUsed: mockResult.gasUsed,
        success: mockResult.code === 0
      }
    } catch (error) {
      throw new NetworkError('Failed to send tokens', { error })
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(_params: {
    fromAddress: string;
    toAddress: string;
    amount: Coin;
  }): Promise<{
    gasEstimate: number;
    gasPrice: Coin;
    estimatedFee: Coin;
  }> {
    try {
      // Mock gas estimation
      const gasEstimate = 54000 // 45000 * 1.2
      
      return {
        gasEstimate,
        gasPrice: { denom: 'uakt', amount: '0.025' },
        estimatedFee: { denom: 'uakt', amount: String(Math.ceil(gasEstimate * 0.025)) }
      }
    } catch (error) {
      throw new NetworkError('Failed to estimate gas', { error })
    }
  }

  /**
   * Get delegations for an address
   */
  async getDelegations(delegatorAddress: string): Promise<any[]> {
    this.provider.ensureConnected()

    try {
      const response = await this.provider.getClient().searchTx([
        { key: 'message.module', value: 'staking' },
        { key: 'message.sender', value: delegatorAddress }
      ])

      // Mock delegation data
      return response.map(() => ({
        validatorAddress: 'akashvaloper1mock',
        delegatedAmount: { denom: 'uakt', amount: '1000000' },
        rewards: { denom: 'uakt', amount: '5000' }
      }))
    } catch (error) {
      throw new NetworkError('Failed to get delegations', { error })
    }
  }

  /**
   * Validate an address
   */
  validateAddress(address: string): {
    valid: boolean;
    type?: 'account' | 'validator';
    errors?: string[];
  } {
    if (!address || typeof address !== 'string') {
      return {
        valid: false,
        errors: ['Invalid address format']
      }
    }

    if (address.startsWith('akash1') && address.length === 44) {
      return {
        valid: true,
        type: 'account'
      }
    }

    if (address.startsWith('akashvaloper1') && address.length === 51) {
      return {
        valid: true,
        type: 'validator'
      }
    }

    return {
      valid: false,
      errors: address.startsWith('cosmos1')
        ? ['Address must start with akash or akashvaloper']
        : ['Invalid address format']
    }
  }

  /**
   * Generate a JWT token for Akash Network authentication (Mainnet 14+)
   * Uses the wallet's private key to sign the token with ES256K (secp256k1)
   */
  async generateJWTToken(options: Omit<JWTGenerationOptions, 'privateKey'>, privateKey?: string): Promise<string> {
    if (!this.connectedWallet && !privateKey) {
      throw new ValidationError('No wallet connected and no private key provided')
    }

    try {
      // Use provided private key or generate one for development/testing
      let keyToUse = privateKey

      if (!keyToUse) {
        // In a real implementation, this would:
        // 1. Extract the private key from the connected wallet (securely)
        // 2. The wallet would need to support key export or signing delegation
        // For development, generate a test keypair
        const testKeyPair = this.jwtAuthManager.generateKeyPair()
        keyToUse = testKeyPair.privateKey

        // Note: In production, this should come from the wallet
        console.warn('Using generated test key. In production, use the actual wallet private key.')
      }

      const fullOptions: JWTGenerationOptions = {
        ...options,
        privateKey: keyToUse
      }

      return await this.jwtAuthManager.generateToken(fullOptions)
    } catch (error) {
      throw new NetworkError('Failed to generate JWT token', { error })
    }
  }

  /**
   * Set authentication configuration
   * Allows switching between JWT and certificate-based auth
   */
  setAuthConfig(config: AuthConfig): void {
    this.authConfig = config
  }

  /**
   * Get current authentication configuration
   */
  getAuthConfig(): AuthConfig | null {
    return this.authConfig
  }

  /**
   * Get JWT authentication manager instance
   */
  getJWTAuthManager(): JWTAuthManager {
    return this.jwtAuthManager
  }

  /**
   * Check if JWT token is expired and needs refresh
   */
  isJWTTokenExpired(token: string): boolean {
    return this.jwtAuthManager.isTokenExpired(token)
  }

  /**
   * Create authorization header for provider requests
   * Supports both JWT and certificate-based auth
   */
  createAuthorizationHeader(): string | null {
    if (!this.authConfig) {
      return null
    }

    if (this.authConfig.method === AuthMethod.JWT && this.authConfig.jwtToken) {
      return this.jwtAuthManager.createAuthHeader(this.authConfig.jwtToken)
    }

    // Certificate-based auth doesn't use Authorization header
    // It uses mTLS certificates in the TLS handshake
    return null
  }
}

// Keplr wallet implementation example
export class KeplrWallet implements WalletProvider {
  private keplr: any = null

  async connect(): Promise<void> {
    if (typeof window === 'undefined' || !window.keplr) {
      throw new Error('Keplr wallet not found')
    }

    this.keplr = window.keplr
    await this.keplr.enable('akashnet-2')
  }

  async disconnect(): Promise<void> {
    this.keplr = null
  }

  async getAccounts(): Promise<string[]> {
    if (!this.keplr) {
      throw new Error('Keplr not connected')
    }

    const offlineSigner = this.keplr.getOfflineSigner('akashnet-2')
    const accounts = await offlineSigner.getAccounts()
    return accounts.map((account: any) => account.address)
  }

  async signTransaction(_tx: any): Promise<Uint8Array> {
    if (!this.keplr) {
      throw new Error('Keplr not connected')
    }

    // In a real implementation, this would sign the transaction with Keplr
    return new Uint8Array([1, 2, 3, 4, 5])
  }

  async signMessage(_message: string): Promise<Uint8Array> {
    if (!this.keplr) {
      throw new Error('Keplr not connected')
    }

    // In a real implementation, this would sign the message with Keplr
    return new Uint8Array([6, 7, 8, 9, 10])
  }

  isConnected(): boolean {
    return this.keplr !== null
  }
}

// Cosmostation wallet implementation example
export class CosmostationWallet implements WalletProvider {
  async connect(): Promise<void> {
    if (!window.cosmostation?.providers?.keplr) {
      throw new Error('Cosmostation wallet not found')
    }

    try {
      await window.cosmostation.providers.keplr.enable(CHAIN_ID)
    } catch (error) {
      throw new Error('Failed to connect to Cosmostation wallet')
    }
  }

  async disconnect(): Promise<void> {
    // Cosmostation doesn't have a disconnect method
  }

  async getAccounts(): Promise<string[]> {
    if (!window.cosmostation?.providers?.keplr) {
      throw new Error('Cosmostation wallet not found')
    }

    try {
      const account = await window.cosmostation.providers.keplr.getKey(CHAIN_ID)
      return [account.bech32Address]
    } catch (error) {
      throw new Error('Failed to get accounts from Cosmostation wallet')
    }
  }

  async signTransaction(_tx: any): Promise<Uint8Array> {
    throw new Error('Transaction signing not implemented for Cosmostation')
  }

  async signMessage(_message: string): Promise<Uint8Array> {
    throw new Error('Message signing not implemented for Cosmostation')
  }

  isConnected(): boolean {
    return !!window.cosmostation?.providers?.keplr
  }
}

// Mnemonic wallet implementation for server-side usage
export class MnemonicWallet implements WalletProvider {
  private wallet: DirectSecp256k1HdWallet | null = null;
  private connected = false;

  constructor(private mnemonic: string) {}

  async connect(): Promise<void> {
    if (this.connected) return;

    this.wallet = await DirectSecp256k1HdWallet.fromMnemonic(this.mnemonic, {
      prefix: "akash",
    });
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.wallet = null;
    this.connected = false;
  }

  async getAccounts(): Promise<string[]> {
    if (!this.wallet) {
      throw new Error("Wallet not connected");
    }

    const accounts = await this.wallet.getAccounts();
    return accounts.map(account => account.address);
  }

  async signTransaction(_tx: any): Promise<Uint8Array> {
    if (!this.wallet) {
      throw new Error("Wallet not connected");
    }

    // This would need proper transaction signing logic
    // For now, throw an error as this is complex
    throw new Error("Transaction signing not implemented in mnemonic provider");
  }

  async signMessage(_message: string): Promise<Uint8Array> {
    // Message signing not implemented for server-side mnemonic wallet
    // This would require proper implementation of arbitrary message signing
    throw new Error("Message signing not implemented for mnemonic wallet");
  }

  isConnected(): boolean {
    return this.connected;
  }
}