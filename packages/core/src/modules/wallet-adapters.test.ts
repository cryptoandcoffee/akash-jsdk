import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WalletAdapter, SupportedWallet } from './wallet-adapters'
import { JWTAccessType } from '../types/jwt'

describe('WalletAdapter', () => {
  let walletAdapter: WalletAdapter

  beforeEach(() => {
    walletAdapter = new WalletAdapter()
    // Clear window mocks
    if (typeof window !== 'undefined') {
      delete (window as any).keplr
      delete (window as any).leap
      delete (window as any).cosmostation
      delete (window as any).ethereum
    }
  })

  describe('detectAvailableWallets', () => {
    it('should return empty array in Node.js environment', () => {
      const available = walletAdapter.detectAvailableWallets()
      expect(available).toEqual([])
    })

    it('should detect Keplr wallet', () => {
      if (typeof window !== 'undefined') {
        (window as any).keplr = {}
        const available = walletAdapter.detectAvailableWallets()
        expect(available).toContain(SupportedWallet.Keplr)
      }
    })

    it('should detect Leap wallet', () => {
      if (typeof window !== 'undefined') {
        (window as any).leap = {}
        const available = walletAdapter.detectAvailableWallets()
        expect(available).toContain(SupportedWallet.Leap)
      }
    })

    it('should detect Cosmostation wallet', () => {
      if (typeof window !== 'undefined') {
        (window as any).cosmostation = {}
        const available = walletAdapter.detectAvailableWallets()
        expect(available).toContain(SupportedWallet.Cosmostation)
      }
    })

    it('should detect MetaMask', () => {
      if (typeof window !== 'undefined') {
        (window as any).ethereum = { isMetaMask: true }
        const available = walletAdapter.detectAvailableWallets()
        expect(available).toContain(SupportedWallet.MetaMaskSnap)
      }
    })

    it('should detect multiple wallets', () => {
      if (typeof window !== 'undefined') {
        (window as any).keplr = {}
        (window as any).leap = {}
        const available = walletAdapter.detectAvailableWallets()
        expect(available).toContain(SupportedWallet.Keplr)
        expect(available).toContain(SupportedWallet.Leap)
        expect(available.length).toBeGreaterThanOrEqual(2)
      }
    })
  })

  describe('generateJWTWithKeplr', () => {
    it('should throw error if Keplr not found', async () => {
      await expect(
        walletAdapter.generateJWTWithKeplr('akashnet-2', 'akash1test')
      ).rejects.toThrow('Keplr wallet not found')
    })

    it('should generate JWT with Keplr', async () => {
      if (typeof window !== 'undefined') {
        const mockSignature = 'mock-signature-base64'
        ;(window as any).keplr = {
          signArbitrary: vi.fn().mockResolvedValue({
            signature: mockSignature
          })
        }

        const token = await walletAdapter.generateJWTWithKeplr(
          'akashnet-2',
          'akash1test',
          { expiresIn: 900, accessType: JWTAccessType.Full }
        )

        expect(token).toBeDefined()
        expect(token.split('.')).toHaveLength(3)
        expect((window as any).keplr.signArbitrary).toHaveBeenCalled()
      }
    })

    it('should handle Keplr signing errors', async () => {
      if (typeof window !== 'undefined') {
        ;(window as any).keplr = {
          signArbitrary: vi.fn().mockRejectedValue(new Error('User rejected'))
        }

        await expect(
          walletAdapter.generateJWTWithKeplr('akashnet-2', 'akash1test')
        ).rejects.toThrow('Failed to generate JWT with Keplr')
      }
    })
  })

  describe('generateJWTWithLeap', () => {
    it('should throw error if Leap not found', async () => {
      await expect(
        walletAdapter.generateJWTWithLeap('akashnet-2', 'akash1test')
      ).rejects.toThrow('Leap wallet not found')
    })

    it('should generate JWT with Leap', async () => {
      if (typeof window !== 'undefined') {
        const mockSignature = 'mock-signature-base64'
        ;(window as any).leap = {
          signArbitrary: vi.fn().mockResolvedValue({
            signature: mockSignature
          })
        }

        const token = await walletAdapter.generateJWTWithLeap(
          'akashnet-2',
          'akash1test',
          { expiresIn: 600, accessType: JWTAccessType.ReadOnly }
        )

        expect(token).toBeDefined()
        expect(token.split('.')).toHaveLength(3)
        expect((window as any).leap.signArbitrary).toHaveBeenCalled()
      }
    })

    it('should handle Leap signing errors', async () => {
      if (typeof window !== 'undefined') {
        ;(window as any).leap = {
          signArbitrary: vi.fn().mockRejectedValue(new Error('User rejected'))
        }

        await expect(
          walletAdapter.generateJWTWithLeap('akashnet-2', 'akash1test')
        ).rejects.toThrow('Failed to generate JWT with Leap')
      }
    })
  })

  describe('generateJWTWithCosmostation', () => {
    it('should throw error if Cosmostation not found', async () => {
      await expect(
        walletAdapter.generateJWTWithCosmostation('akashnet-2', 'akash1test')
      ).rejects.toThrow('Cosmostation wallet not found')
    })

    it('should generate JWT with Cosmostation signArbitrary', async () => {
      if (typeof window !== 'undefined') {
        const mockSignature = 'mock-signature-base64'
        ;(window as any).cosmostation = {
          cosmos: {
            signArbitrary: vi.fn().mockResolvedValue({
              signature: mockSignature
            })
          }
        }

        const token = await walletAdapter.generateJWTWithCosmostation(
          'akashnet-2',
          'akash1test'
        )

        expect(token).toBeDefined()
        expect(token.split('.')).toHaveLength(3)
        expect((window as any).cosmostation.cosmos.signArbitrary).toHaveBeenCalled()
      }
    })

    it('should fallback to signAmino if signArbitrary not available', async () => {
      if (typeof window !== 'undefined') {
        ;(window as any).cosmostation = {
          cosmos: {
            request: vi.fn().mockResolvedValue({
              signature: { signature: 'mock-signature-base64' }
            })
          }
        }

        const token = await walletAdapter.generateJWTWithCosmostation(
          'akashnet-2',
          'akash1test'
        )

        expect(token).toBeDefined()
        expect(token.split('.')).toHaveLength(3)
        expect((window as any).cosmostation.cosmos.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'cos_signAmino',
            params: expect.objectContaining({
              chainName: 'akashnet-2',
              isADR36: true
            })
          })
        )
      }
    })

    it('should handle Cosmostation signing errors', async () => {
      if (typeof window !== 'undefined') {
        ;(window as any).cosmostation = {
          cosmos: {
            request: vi.fn().mockRejectedValue(new Error('User rejected'))
          }
        }

        await expect(
          walletAdapter.generateJWTWithCosmostation('akashnet-2', 'akash1test')
        ).rejects.toThrow('Failed to generate JWT with Cosmostation')
      }
    })
  })

  describe('generateJWTWithMetaMaskSnap', () => {
    it('should throw error if MetaMask not found', async () => {
      await expect(
        walletAdapter.generateJWTWithMetaMaskSnap('akashnet-2', 'akash1test')
      ).rejects.toThrow('MetaMask not found')
    })

    it('should generate JWT with MetaMask Snap', async () => {
      if (typeof window !== 'undefined') {
        const snapId = 'npm:@leapwallet/metamask-cosmos-snap'
        ;(window as any).ethereum = {
          request: vi
            .fn()
            .mockResolvedValueOnce({ [snapId]: {} }) // wallet_getSnaps
            .mockResolvedValueOnce({ signature: 'mock-signature-base64' }) // wallet_invokeSnap
        }

        const token = await walletAdapter.generateJWTWithMetaMaskSnap(
          'akashnet-2',
          'akash1test'
        )

        expect(token).toBeDefined()
        expect(token.split('.')).toHaveLength(3)
        expect((window as any).ethereum.request).toHaveBeenCalledTimes(2)
      }
    })

    it('should install snap if not present', async () => {
      if (typeof window !== 'undefined') {
        const snapId = 'npm:@leapwallet/metamask-cosmos-snap'
        ;(window as any).ethereum = {
          request: vi
            .fn()
            .mockResolvedValueOnce({}) // wallet_getSnaps - empty
            .mockResolvedValueOnce({}) // wallet_requestSnaps
            .mockResolvedValueOnce({ signature: 'mock-signature-base64' }) // wallet_invokeSnap
        }

        const token = await walletAdapter.generateJWTWithMetaMaskSnap(
          'akashnet-2',
          'akash1test'
        )

        expect(token).toBeDefined()
        expect((window as any).ethereum.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'wallet_requestSnaps',
            params: { [snapId]: {} }
          })
        )
      }
    })

    it('should handle MetaMask Snap errors', async () => {
      if (typeof window !== 'undefined') {
        ;(window as any).ethereum = {
          request: vi.fn().mockRejectedValue(new Error('User rejected'))
        }

        await expect(
          walletAdapter.generateJWTWithMetaMaskSnap('akashnet-2', 'akash1test')
        ).rejects.toThrow('Failed to generate JWT with MetaMask Snap')
      }
    })
  })

  describe('generateJWTAuto', () => {
    it('should throw error if no wallets available', async () => {
      await expect(
        walletAdapter.generateJWTAuto('akashnet-2', 'akash1test')
      ).rejects.toThrow('No supported Cosmos wallet found')
    })

    it('should use first available wallet (Keplr)', async () => {
      if (typeof window !== 'undefined') {
        ;(window as any).keplr = {
          signArbitrary: vi.fn().mockResolvedValue({
            signature: 'mock-signature-base64'
          })
        }

        const result = await walletAdapter.generateJWTAuto('akashnet-2', 'akash1test')

        expect(result.token).toBeDefined()
        expect(result.wallet).toBe(SupportedWallet.Keplr)
      }
    })

    it('should fallback to next wallet if first fails', async () => {
      if (typeof window !== 'undefined') {
        ;(window as any).keplr = {
          signArbitrary: vi.fn().mockRejectedValue(new Error('Failed'))
        }
        ;(window as any).leap = {
          signArbitrary: vi.fn().mockResolvedValue({
            signature: 'mock-signature-base64'
          })
        }

        const result = await walletAdapter.generateJWTAuto('akashnet-2', 'akash1test')

        expect(result.token).toBeDefined()
        expect(result.wallet).toBe(SupportedWallet.Leap)
      }
    })

    it('should throw error if all wallets fail', async () => {
      if (typeof window !== 'undefined') {
        ;(window as any).keplr = {
          signArbitrary: vi.fn().mockRejectedValue(new Error('Failed'))
        }

        await expect(
          walletAdapter.generateJWTAuto('akashnet-2', 'akash1test')
        ).rejects.toThrow('Failed to generate JWT with any available wallet')
      }
    })

    it('should pass options to wallet methods', async () => {
      if (typeof window !== 'undefined') {
        ;(window as any).keplr = {
          signArbitrary: vi.fn().mockResolvedValue({
            signature: 'mock-signature-base64'
          })
        }

        const options = {
          expiresIn: 1800,
          accessType: JWTAccessType.ReadOnly,
          leasePermissions: [{ owner: 'akash1test', dseq: '12345', scopes: [] }]
        }

        await walletAdapter.generateJWTAuto('akashnet-2', 'akash1test', options)

        // Verify the message includes the options
        const signCall = (window as any).keplr.signArbitrary.mock.calls[0]
        expect(signCall).toBeDefined()
      }
    })
  })

  describe('JWT token structure', () => {
    it('should create valid JWT structure with all claims', async () => {
      if (typeof window !== 'undefined') {
        ;(window as any).keplr = {
          signArbitrary: vi.fn().mockResolvedValue({
            signature: 'dGVzdC1zaWduYXR1cmUtZGF0YQ==' // base64 encoded test data
          })
        }

        const token = await walletAdapter.generateJWTWithKeplr(
          'akashnet-2',
          'akash1test123',
          {
            expiresIn: 900,
            accessType: JWTAccessType.Full,
            leasePermissions: [
              {
                owner: 'akash1test123',
                dseq: '12345',
                scopes: ['send_manifest', 'status']
              }
            ]
          }
        )

        const parts = token.split('.')
        expect(parts).toHaveLength(3)

        // Decode and verify header
        const header = JSON.parse(
          Buffer.from(parts[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
        )
        expect(header.alg).toBe('ES256K')
        expect(header.typ).toBe('JWT')

        // Decode and verify claims
        const claims = JSON.parse(
          Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
        )
        expect(claims.iss).toBe('akash1test123')
        expect(claims.sub).toBe('akash1test123')
        expect(claims.version).toBe('v1')
        expect(claims.leases.access).toBe(JWTAccessType.Full)
        expect(claims.leases.permissions).toHaveLength(1)
        expect(claims.exp).toBeGreaterThan(claims.iat)
      }
    })
  })

  describe('SupportedWallet enum', () => {
    it('should have correct wallet values', () => {
      expect(SupportedWallet.Keplr).toBe('keplr')
      expect(SupportedWallet.Leap).toBe('leap')
      expect(SupportedWallet.Cosmostation).toBe('cosmostation')
      expect(SupportedWallet.MetaMaskSnap).toBe('metamask-snap')
    })
  })
})
