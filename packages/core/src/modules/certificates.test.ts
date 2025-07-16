import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CertificateManager } from './certificates'
import { AkashProvider } from '../providers/akash'

// Mock the provider
const mockProvider = {
  client: {
    searchTx: vi.fn()
  },
  ensureConnected: vi.fn()
} as unknown as AkashProvider

describe('CertificateManager', () => {
  let certificateManager: CertificateManager

  beforeEach(() => {
    certificateManager = new CertificateManager(mockProvider)
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should create certificate successfully', async () => {
      const certParams = {
        owner: 'akash1test',
        cert: 'cert-pem-data',
        pubkey: 'pubkey-data'
      }

      const mockTx = {
        height: 12345,
        hash: 'cert-tx-hash',
        gasUsed: 50000n,
        gasWanted: 60000n,
        events: [],
        txIndex: 0,
        code: 0,
        rawLog: '',
        tx: new Uint8Array(),
        msgResponses: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await certificateManager.create(certParams)

      expect(result).toMatchObject({
        certificateId: {
          owner: certParams.owner,
          serial: '12345'
        },
        state: 'valid',
        cert: certParams.cert,
        pubkey: certParams.pubkey
      })
    })

    it('should throw error for invalid certificate data', async () => {
      const invalidCertParams = {
        owner: '',
        cert: '',
        pubkey: ''
      }

      await expect(certificateManager.create(invalidCertParams)).rejects.toThrow('Invalid certificate parameters')
    })

    it('should handle network errors during certificate creation', async () => {
      const certParams = {
        owner: 'akash1test',
        cert: 'cert-pem-data',
        pubkey: 'pubkey-data'
      }

      const networkError = new Error('Network connection failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(certificateManager.create(certParams)).rejects.toThrow('Failed to create certificate')
    })
  })

  describe('revoke', () => {
    it('should revoke certificate successfully', async () => {
      const certificateId = {
        owner: 'akash1test',
        serial: '12345'
      }

      const mockTx = {
        height: 12346,
        hash: 'revoke-tx-hash',
        gasUsed: 50000n,
        gasWanted: 60000n,
        events: [],
        txIndex: 0,
        code: 0,
        rawLog: '',
        tx: new Uint8Array(),
        msgResponses: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      await certificateManager.revoke(certificateId)

      expect(mockProvider['client']!.searchTx).toHaveBeenCalled()
    })

    it('should throw error for invalid certificate ID on revocation', async () => {
      const invalidCertificateId = {
        owner: '',
        serial: ''
      }

      await expect(certificateManager.revoke(invalidCertificateId)).rejects.toThrow('Certificate owner and serial are required')
    })

    it('should handle network errors during certificate revocation', async () => {
      const certificateId = {
        owner: 'akash1test',
        serial: '12345'
      }

      const networkError = new Error('Network connection failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(certificateManager.revoke(certificateId)).rejects.toThrow('Failed to revoke certificate')
    })
  })

  describe('list', () => {
    it('should list certificates for owner', async () => {
      const owner = 'akash1test'
      const mockTxs = [
        {
          height: 12345,
          hash: 'cert-tx-1',
          gasUsed: 50000n,
          gasWanted: 60000n,
          events: [],
          txIndex: 0,
          code: 0,
          rawLog: '',
          tx: new Uint8Array(),
          msgResponses: []
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await certificateManager.list({ owner })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        certificateId: {
          owner,
          serial: expect.stringMatching(/^cert-\d+-\d+$/)
        },
        state: 1 // CertificateState.VALID
      })
    })

    it('should return empty array when no certificates found', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await certificateManager.list({ owner: 'akash1test' })

      expect(result).toEqual([])
    })
  })

  describe('get', () => {
    it('should get certificate by ID successfully', async () => {
      const certificateId = {
        owner: 'akash1test',
        serial: 'cert-12345-0'
      }

      const mockTxs = [
        {
          height: 12345,
          hash: 'cert-tx-1',
          gasUsed: 50000n,
          gasWanted: 60000n,
          events: [],
          txIndex: 0,
          code: 0,
          rawLog: '',
          tx: new Uint8Array(),
          msgResponses: []
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await certificateManager.get(certificateId)

      expect(result).not.toBeNull()
      expect(result!.certificateId.owner).toBe(certificateId.owner)
      expect(result!.certificateId.serial).toBe(certificateId.serial)
      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'cert' },
        { key: 'message.sender', value: certificateId.owner }
      ])
    })

    it('should return null when certificate not found', async () => {
      const certificateId = {
        owner: 'akash1test',
        serial: 'nonexistent-cert'
      }

      const mockTxs = [
        {
          height: 12345,
          hash: 'cert-tx-1',
          gasUsed: 50000n,
          gasWanted: 60000n,
          events: [],
          txIndex: 0,
          code: 0,
          rawLog: '',
          tx: new Uint8Array(),
          msgResponses: []
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await certificateManager.get(certificateId)

      expect(result).toBeNull()
    })

    it('should return null when no certificates exist for owner', async () => {
      const certificateId = {
        owner: 'akash1test',
        serial: 'cert-12345-0'
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await certificateManager.get(certificateId)

      expect(result).toBeNull()
    })

    it('should handle network errors when getting certificate', async () => {
      const certificateId = {
        owner: 'akash1test',
        serial: 'cert-12345-0'
      }

      const networkError = new Error('Network connection failed')
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(networkError)

      await expect(certificateManager.get(certificateId)).rejects.toThrow('Failed to get certificate')
    })

    it('should find certificate with matching serial from multiple certificates', async () => {
      const certificateId = {
        owner: 'akash1test',
        serial: 'cert-12346-1'
      }

      const mockTxs = [
        {
          height: 12345,
          hash: 'cert-tx-1',
          gasUsed: 50000n,
          gasWanted: 60000n,
          events: [],
          txIndex: 0,
          code: 0,
          rawLog: '',
          tx: new Uint8Array(),
          msgResponses: []
        },
        {
          height: 12346,
          hash: 'cert-tx-2',
          gasUsed: 50000n,
          gasWanted: 60000n,
          events: [],
          txIndex: 1,
          code: 0,
          rawLog: '',
          tx: new Uint8Array(),
          msgResponses: []
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await certificateManager.get(certificateId)

      expect(result).not.toBeNull()
      expect(result!.certificateId.owner).toBe(certificateId.owner)
      expect(result!.certificateId.serial).toBe('cert-12346-1')
    })
  })

  describe('generateKeyPair', () => {
    it('should generate valid key pair', async () => {
      const keyPair = await certificateManager.generateKeyPair()

      expect(keyPair).toHaveProperty('cert')
      expect(keyPair).toHaveProperty('pubkey')
      expect(keyPair).toHaveProperty('privkey')
      expect(typeof keyPair.cert).toBe('string')
      expect(typeof keyPair.pubkey).toBe('string')
      expect(typeof keyPair.privkey).toBe('string')
    })
  })

  describe('validateCertificate', () => {
    it('should validate valid certificate', () => {
      const validCert = '-----BEGIN CERTIFICATE-----\nMIIBkTCCATegAwIBAgIJAKr...\n-----END CERTIFICATE-----'
      
      const result = certificateManager.validateCertificate(validCert)

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should reject invalid certificate format', () => {
      const invalidCert = 'not-a-certificate'
      
      const result = certificateManager.validateCertificate(invalidCert)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid certificate format')
    })

    it('should reject empty certificate', () => {
      const result = certificateManager.validateCertificate('')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Certificate cannot be empty')
    })
  })
})