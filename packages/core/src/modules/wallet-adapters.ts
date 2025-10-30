/**
 * Wallet Adapters for JWT Authentication
 * Supports multiple Cosmos wallets: Keplr, Leap, Cosmostation, MetaMask Cosmos Snap
 */

import { JWTAuthManager } from './jwt-auth'
import { JWTAccessType } from '../types/jwt'
import { ValidationError, NetworkError } from '../errors'

export enum SupportedWallet {
  Keplr = 'keplr',
  Leap = 'leap',
  Cosmostation = 'cosmostation',
  MetaMaskSnap = 'metamask-snap'
}

export interface WalletJWTOptions {
  expiresIn?: number
  accessType?: JWTAccessType
  leasePermissions?: any[]
}

/**
 * Universal Wallet Adapter for JWT Generation
 * Automatically detects and uses the correct wallet API
 */
export class WalletAdapter {
  private jwtAuthManager: JWTAuthManager

  constructor() {
    this.jwtAuthManager = new JWTAuthManager()
  }

  /**
   * Detect available wallets in the browser
   */
  detectAvailableWallets(): SupportedWallet[] {
    if (typeof window === 'undefined') {
      return []
    }

    const available: SupportedWallet[] = []
    const w = window as any

    if (w.keplr) available.push(SupportedWallet.Keplr)
    if (w.leap) available.push(SupportedWallet.Leap)
    if (w.cosmostation) available.push(SupportedWallet.Cosmostation)
    if (w.ethereum?.isMetaMask) available.push(SupportedWallet.MetaMaskSnap)

    return available
  }

  /**
   * Generate JWT using Keplr wallet
   */
  async generateJWTWithKeplr(
    chainId: string,
    address: string,
    options?: WalletJWTOptions
  ): Promise<string> {
    if (typeof window === 'undefined' || !(window as any).keplr) {
      throw new ValidationError('Keplr wallet not found')
    }

    const keplr = (window as any).keplr

    try {
      const token = await this.signJWTWithWallet(
        chainId,
        address,
        options,
        async (message: string) => {
          const result = await keplr.signArbitrary(chainId, address, message)
          return result.signature
        }
      )

      return token
    } catch (error) {
      throw new NetworkError('Failed to generate JWT with Keplr', { error })
    }
  }

  /**
   * Generate JWT using Leap wallet
   * API: https://docs.leapwallet.io/cosmos/for-dapps-connect-to-leap/api-reference
   */
  async generateJWTWithLeap(
    chainId: string,
    address: string,
    options?: WalletJWTOptions
  ): Promise<string> {
    if (typeof window === 'undefined' || !(window as any).leap) {
      throw new ValidationError('Leap wallet not found')
    }

    const leap = (window as any).leap

    try {
      // Leap uses the same signArbitrary API as Keplr
      const token = await this.signJWTWithWallet(
        chainId,
        address,
        options,
        async (message: string) => {
          const result = await leap.signArbitrary(chainId, address, message)
          return result.signature
        }
      )

      return token
    } catch (error) {
      throw new NetworkError('Failed to generate JWT with Leap', { error })
    }
  }

  /**
   * Generate JWT using Cosmostation wallet
   * Cosmostation has a different API structure
   */
  async generateJWTWithCosmostation(
    chainId: string,
    address: string,
    options?: WalletJWTOptions
  ): Promise<string> {
    if (typeof window === 'undefined' || !(window as any).cosmostation) {
      throw new ValidationError('Cosmostation wallet not found')
    }

    const cosmostation = (window as any).cosmostation

    try {
      // Cosmostation uses cosmos.request API
      const token = await this.signJWTWithWallet(
        chainId,
        address,
        options,
        async (message: string) => {
          // Try signArbitrary if available
          if (cosmostation.cosmos?.signArbitrary) {
            const result = await cosmostation.cosmos.signArbitrary(
              chainId,
              address,
              message
            )
            return result.signature
          }

          // Fallback: Use signAmino with ADR-36 format
          const signDoc = {
            chain_id: '',
            account_number: '0',
            sequence: '0',
            fee: {
              gas: '0',
              amount: []
            },
            msgs: [
              {
                type: 'sign/MsgSignData',
                value: {
                  signer: address,
                  data: Buffer.from(message).toString('base64')
                }
              }
            ],
            memo: ''
          }

          const result = await cosmostation.cosmos.request({
            method: 'cos_signAmino',
            params: { chainName: chainId, doc: signDoc, isADR36: true }
          })

          return result.signature.signature
        }
      )

      return token
    } catch (error) {
      throw new NetworkError('Failed to generate JWT with Cosmostation', { error })
    }
  }

  /**
   * Generate JWT using MetaMask with Leap Cosmos Snap
   * Requires the Leap Cosmos Snap to be installed
   */
  async generateJWTWithMetaMaskSnap(
    chainId: string,
    address: string,
    options?: WalletJWTOptions
  ): Promise<string> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new ValidationError('MetaMask not found')
    }

    const ethereum = (window as any).ethereum

    try {
      // Check if Leap Cosmos Snap is installed
      const snaps = await ethereum.request({
        method: 'wallet_getSnaps'
      })

      const snapId = 'npm:@leapwallet/metamask-cosmos-snap'
      if (!snaps[snapId]) {
        // Try to install the snap
        await ethereum.request({
          method: 'wallet_requestSnaps',
          params: {
            [snapId]: {}
          }
        })
      }

      // Generate JWT using the snap
      const token = await this.signJWTWithWallet(
        chainId,
        address,
        options,
        async (message: string) => {
          // Invoke the snap's signArbitrary method
          const result = await ethereum.request({
            method: 'wallet_invokeSnap',
            params: {
              snapId,
              request: {
                method: 'signArbitrary',
                params: {
                  chainId,
                  signer: address,
                  data: message
                }
              }
            }
          })

          return result.signature
        }
      )

      return token
    } catch (error) {
      throw new NetworkError('Failed to generate JWT with MetaMask Snap', { error })
    }
  }

  /**
   * Auto-detect wallet and generate JWT
   * Tries available wallets in order: Keplr -> Leap -> Cosmostation -> MetaMask
   */
  async generateJWTAuto(
    chainId: string,
    address: string,
    options?: WalletJWTOptions
  ): Promise<{ token: string; wallet: SupportedWallet }> {
    const available = this.detectAvailableWallets()

    if (available.length === 0) {
      throw new ValidationError(
        'No supported Cosmos wallet found. Please install Keplr, Leap, Cosmostation, or MetaMask with Leap Cosmos Snap.'
      )
    }

    // Try each wallet in order
    for (const wallet of available) {
      try {
        let token: string

        switch (wallet) {
          case SupportedWallet.Keplr:
            token = await this.generateJWTWithKeplr(chainId, address, options)
            return { token, wallet }

          case SupportedWallet.Leap:
            token = await this.generateJWTWithLeap(chainId, address, options)
            return { token, wallet }

          case SupportedWallet.Cosmostation:
            token = await this.generateJWTWithCosmostation(chainId, address, options)
            return { token, wallet }

          case SupportedWallet.MetaMaskSnap:
            token = await this.generateJWTWithMetaMaskSnap(chainId, address, options)
            return { token, wallet }
        }
      } catch (error) {
        // Try next wallet
        continue
      }
    }

    throw new NetworkError('Failed to generate JWT with any available wallet')
  }

  /**
   * Common JWT signing logic used by all wallet adapters
   */
  private async signJWTWithWallet(
    chainId: string,
    address: string,
    options: WalletJWTOptions | undefined,
    signFn: (message: string) => Promise<string>
  ): Promise<string> {
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
        access: options?.accessType || JWTAccessType.Full,
        permissions: options?.leasePermissions
      }
    }

    // Encode header and payload
    const encodedHeader = this.jwtAuthManager['base64urlEncode'](JSON.stringify(header))
    const encodedPayload = this.jwtAuthManager['base64urlEncode'](JSON.stringify(claims))
    const message = `${encodedHeader}.${encodedPayload}`

    // Sign with wallet
    const signature = await signFn(message)

    // Encode signature (wallet returns base64, we need base64url)
    const encodedSignature = this.jwtAuthManager['base64urlEncode'](
      Buffer.from(signature, 'base64')
    )

    // Combine into JWT
    return `${message}.${encodedSignature}`
  }
}
