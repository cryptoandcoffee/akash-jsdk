import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuditManager } from './audit'
import { AkashProvider } from '../providers/akash'
import { ValidationError, NetworkError } from '../errors'

// Helper function to create proper IndexedTx mock
const createMockTx = (height: number, hash: string = 'mock-hash') => ({
  height,
  hash,
  gasUsed: BigInt(50000),
  gasWanted: BigInt(60000),
  events: [],
  txIndex: 0,
  code: 0,
  rawLog: '',
  tx: new Uint8Array(),
  msgResponses: []
})

describe('AuditManager - Coverage Tests', () => {
  let auditManager: AuditManager
  let mockProvider: AkashProvider

  beforeEach(() => {
    mockProvider = {
      client: {
        searchTx: vi.fn()
      },
      ensureConnected: vi.fn()
    } as unknown as AkashProvider
    
    auditManager = new AuditManager(mockProvider)
  })

  describe('validateAuditCriteria - Complete Coverage', () => {
    it('should validate audit criteria with all requirements met', async () => {
      const mockAudits = [
        {
          auditId: { owner: 'akash1provider', auditor: 'akash1auditor1', aud: '12345' },
          provider: 'akash1provider',
          attributes: [
            { key: 'region', value: 'us-west' },
            { key: 'tier', value: 'datacenter' }
          ],
          score: 95
        },
        {
          auditId: { owner: 'akash1provider', auditor: 'akash1auditor2', aud: '12346' },
          provider: 'akash1provider',
          attributes: [
            { key: 'region', value: 'us-west' },
            { key: 'uptime', value: '99.9' }
          ],
          score: 90
        }
      ]

      vi.spyOn(auditManager, 'getProviderAudits').mockResolvedValue(mockAudits as any)

      const criteria = {
        auditorsRequired: ['akash1auditor1', 'akash1auditor2'],
        requiredAttributes: [
          { key: 'region', value: 'us-west' },
          { key: 'tier', value: 'datacenter' }
        ],
        minReputation: 85
      }

      const result = await auditManager.validateAuditCriteria('akash1provider', criteria)

      expect(result).toMatchObject({
        valid: true,
        score: 92.5,
        meetsReputation: true,
        hasRequiredAttributes: true,
        hasRequiredAuditors: true,
        missingAttributes: [],
        missingAuditors: []
      })
    })

    it('should identify missing auditors correctly', async () => {
      const mockAudits = [
        {
          auditId: { owner: 'akash1provider', auditor: 'akash1auditor1', aud: '12345' },
          provider: 'akash1provider',
          attributes: [{ key: 'region', value: 'us-west' }],
          score: 95
        }
      ]

      vi.spyOn(auditManager, 'getProviderAudits').mockResolvedValue(mockAudits as any)

      const criteria = {
        auditorsRequired: ['akash1auditor1', 'akash1auditor2', 'akash1auditor3'],
        minReputation: 85
      }

      const result = await auditManager.validateAuditCriteria('akash1provider', criteria)

      expect(result.valid).toBe(false)
      expect(result.hasRequiredAuditors).toBe(false)
      expect(result.missingAuditors).toEqual(['akash1auditor2', 'akash1auditor3'])
    })

    it('should identify missing attributes correctly', async () => {
      const mockAudits = [
        {
          auditId: { owner: 'akash1provider', auditor: 'akash1auditor1', aud: '12345' },
          provider: 'akash1provider',
          attributes: [{ key: 'region', value: 'us-west' }],
          score: 95
        }
      ]

      vi.spyOn(auditManager, 'getProviderAudits').mockResolvedValue(mockAudits as any)

      const criteria = {
        requiredAttributes: [
          { key: 'region', value: 'us-west' },
          { key: 'tier', value: 'datacenter' },
          { key: 'uptime', value: '99.9' }
        ],
        minReputation: 85
      }

      const result = await auditManager.validateAuditCriteria('akash1provider', criteria)

      expect(result.valid).toBe(false)
      expect(result.hasRequiredAttributes).toBe(false)
      expect(result.missingAttributes).toEqual([
        { key: 'tier', value: 'datacenter' },
        { key: 'uptime', value: '99.9' }
      ])
    })

    it('should fail when reputation is below minimum', async () => {
      const mockAudits = [
        {
          auditId: { owner: 'akash1provider', auditor: 'akash1auditor1', aud: '12345' },
          provider: 'akash1provider',
          attributes: [{ key: 'region', value: 'us-west' }],
          score: 70
        }
      ]

      vi.spyOn(auditManager, 'getProviderAudits').mockResolvedValue(mockAudits as any)

      const criteria = {
        minReputation: 85
      }

      const result = await auditManager.validateAuditCriteria('akash1provider', criteria)

      expect(result.valid).toBe(false)
      expect(result.meetsReputation).toBe(false)
      expect(result.score).toBe(70)
    })

    it('should handle empty audits list', async () => {
      vi.spyOn(auditManager, 'getProviderAudits').mockResolvedValue([])

      const criteria = {
        auditorsRequired: ['akash1auditor1'],
        minReputation: 85
      }

      const result = await auditManager.validateAuditCriteria('akash1provider', criteria)

      expect(result.valid).toBe(false)
      expect(result.score).toBe(0)
      expect(result.hasRequiredAuditors).toBe(false)
      expect(result.missingAuditors).toEqual(['akash1auditor1'])
    })

    it('should handle network errors', async () => {
      vi.spyOn(auditManager, 'getProviderAudits').mockRejectedValue(new Error('Network error'))

      await expect(auditManager.validateAuditCriteria('akash1provider', {}))
        .rejects.toThrow('Failed to validate audit criteria')
    })

    it('should handle criteria without optional fields', async () => {
      const mockAudits = [
        {
          auditId: { owner: 'akash1provider', auditor: 'akash1auditor1', aud: '12345' },
          provider: 'akash1provider',
          attributes: [{ key: 'region', value: 'us-west' }],
          score: 95
        }
      ]

      vi.spyOn(auditManager, 'getProviderAudits').mockResolvedValue(mockAudits as any)

      const result = await auditManager.validateAuditCriteria('akash1provider', {})

      expect(result.valid).toBe(true)
      expect(result.score).toBe(95)
      expect(result.hasRequiredAuditors).toBe(true)
      expect(result.hasRequiredAttributes).toBe(true)
    })
  })

  describe('validateAudit - Complete Coverage', () => {
    it('should validate audit with valid data', async () => {
      const validAudit = {
        owner: 'akash1provider',
        auditor: 'akash1auditor',
        attributes: [
          { key: 'region', value: 'us-west' },
          { key: 'tier', value: 'datacenter' }
        ]
      }

      const result = await auditManager.validateAudit(validAudit)
      expect(result).toBe(true)
    })

    it('should reject audit with missing owner', async () => {
      const invalidAudit = {
        owner: '',
        auditor: 'akash1auditor',
        attributes: [{ key: 'region', value: 'us-west' }]
      }

      const result = await auditManager.validateAudit(invalidAudit)
      expect(result).toBe(false)
    })

    it('should reject audit with null owner', async () => {
      const invalidAudit = {
        owner: null as any,
        auditor: 'akash1auditor',
        attributes: [{ key: 'region', value: 'us-west' }]
      }

      const result = await auditManager.validateAudit(invalidAudit)
      expect(result).toBe(false)
    })

    it('should reject audit with missing auditor', async () => {
      const invalidAudit = {
        owner: 'akash1provider',
        auditor: '',
        attributes: [{ key: 'region', value: 'us-west' }]
      }

      const result = await auditManager.validateAudit(invalidAudit)
      expect(result).toBe(false)
    })

    it('should reject audit with null auditor', async () => {
      const invalidAudit = {
        owner: 'akash1provider',
        auditor: null as any,
        attributes: [{ key: 'region', value: 'us-west' }]
      }

      const result = await auditManager.validateAudit(invalidAudit)
      expect(result).toBe(false)
    })

    it('should reject audit with no attributes', async () => {
      const invalidAudit = {
        owner: 'akash1provider',
        auditor: 'akash1auditor',
        attributes: []
      }

      const result = await auditManager.validateAudit(invalidAudit)
      expect(result).toBe(false)
    })

    it('should reject audit with undefined attributes', async () => {
      const invalidAudit = {
        owner: 'akash1provider',
        auditor: 'akash1auditor'
      } as any

      const result = await auditManager.validateAudit(invalidAudit)
      expect(result).toBe(false)
    })

    it('should reject audit with null attributes', async () => {
      const invalidAudit = {
        owner: 'akash1provider',
        auditor: 'akash1auditor',
        attributes: null as any
      }

      const result = await auditManager.validateAudit(invalidAudit)
      expect(result).toBe(false)
    })

    it('should reject audit with invalid attribute keys', async () => {
      const invalidAudit = {
        owner: 'akash1provider',
        auditor: 'akash1auditor',
        attributes: [
          { key: '', value: 'us-west' },
          { key: 'tier', value: 'datacenter' }
        ]
      }

      const result = await auditManager.validateAudit(invalidAudit)
      expect(result).toBe(false)
    })

    it('should reject audit with null attribute keys', async () => {
      const invalidAudit = {
        owner: 'akash1provider',
        auditor: 'akash1auditor',
        attributes: [
          { key: null as any, value: 'us-west' },
          { key: 'tier', value: 'datacenter' }
        ]
      }

      const result = await auditManager.validateAudit(invalidAudit)
      expect(result).toBe(false)
    })

    it('should reject audit with invalid attribute values', async () => {
      const invalidAudit = {
        owner: 'akash1provider',
        auditor: 'akash1auditor',
        attributes: [
          { key: 'region', value: '' },
          { key: 'tier', value: 'datacenter' }
        ]
      }

      const result = await auditManager.validateAudit(invalidAudit)
      expect(result).toBe(false)
    })

    it('should reject audit with null attribute values', async () => {
      const invalidAudit = {
        owner: 'akash1provider',
        auditor: 'akash1auditor',
        attributes: [
          { key: 'region', value: null as any },
          { key: 'tier', value: 'datacenter' }
        ]
      }

      const result = await auditManager.validateAudit(invalidAudit)
      expect(result).toBe(false)
    })
  })

  describe('searchAuditedProviders - Complete Coverage', () => {
    it('should search providers with criteria', async () => {
      const searchCriteria = {
        minScore: 90,
        attributes: [{ key: 'region', value: 'us-west' }],
        auditor: 'akash1auditor'
      }

      const mockTxs = [createMockTx(12350, 'search-audit-1')]
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await auditManager.searchAuditedProviders(searchCriteria)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        provider: 'akash1provider',
        audits: expect.arrayContaining([
          {
            auditor: 'akash1auditor',
            score: 95,
            attributes: expect.arrayContaining([
              { key: 'region', value: 'us-west' }
            ])
          }
        ]),
        averageScore: 95,
        totalAudits: 1
      })
    })

    it('should return empty array when no transactions found', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await auditManager.searchAuditedProviders({})

      expect(result).toEqual([])
    })

    it('should handle search criteria without optional fields', async () => {
      const mockTxs = [createMockTx(12350)]
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await auditManager.searchAuditedProviders({})

      expect(result).toHaveLength(1)
      expect(result[0].provider).toBe('akash1provider')
    })

    it('should handle network errors', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))
      
      await expect(auditManager.searchAuditedProviders({}))
        .rejects.toThrow('Failed to search audited providers')
    })
  })

  describe('getAuditStats - Complete Coverage', () => {
    it('should get audit statistics successfully', async () => {
      const mockTotalAudits = [createMockTx(12345), createMockTx(12346)]
      const mockActiveAudits = [createMockTx(12345)]
      const mockAuditors = [createMockTx(12347)]
      const mockProviders = [createMockTx(12348)]

      vi.mocked(mockProvider['client']!.searchTx)
        .mockResolvedValueOnce(mockTotalAudits)
        .mockResolvedValueOnce(mockActiveAudits)
        .mockResolvedValueOnce(mockAuditors)
        .mockResolvedValueOnce(mockProviders)

      const result = await auditManager.getAuditStats()

      expect(result).toMatchObject({
        totalAudits: 2,
        activeAudits: 1,
        uniqueAuditors: 1,
        uniqueProviders: 1,
        averageScore: 92.5,
        scoreDistribution: {
          '90-100': 2,
          '80-89': 0,
          '70-79': 0,
          'below-70': 0
        }
      })
    })

    it('should handle empty results', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await auditManager.getAuditStats()

      expect(result).toMatchObject({
        totalAudits: 0,
        activeAudits: 0,
        uniqueAuditors: 0,
        uniqueProviders: 0,
        averageScore: 92.5
      })
    })

    it('should handle network errors', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))
      
      await expect(auditManager.getAuditStats()).rejects.toThrow('Failed to get audit stats')
    })
  })

  describe('Error Handling - Edge Cases', () => {
    it('should handle createAuditRequest with network error', async () => {
      const auditParams = {
        owner: 'akash1test',
        auditor: 'akash1auditor',
        provider: 'akash1provider',
        attributes: [{ key: 'datacenter', value: 'tier-3' }]
      }

      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(auditManager.createAuditRequest(auditParams))
        .rejects.toThrow('Failed to submit audit')
    })

    it('should handle revokeAudit with network error', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(auditManager.revokeAudit('akash1owner', 'akash1auditor'))
        .rejects.toThrow('Failed to revoke audit')
    })

    it('should handle getProviderAudits with network error', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(auditManager.getProviderAudits('akash1provider'))
        .rejects.toThrow('Failed to get provider audits')
    })

    it('should handle getAuditorProviders with network error', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(auditManager.getAuditorProviders('akash1auditor'))
        .rejects.toThrow('Failed to get auditor providers')
    })

    it('should handle listAllAudits with network error', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(auditManager.listAllAudits())
        .rejects.toThrow('Failed to list audits')
    })

    it('should handle getAuditHistory with network error', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(auditManager.getAuditHistory('akash1owner'))
        .rejects.toThrow('Failed to get audit history')
    })

    it('should handle getAuditors with network error', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))

      await expect(auditManager.getAuditors())
        .rejects.toThrow('Failed to get auditors')
    })
  })

  describe('Validation Edge Cases', () => {
    it('should validate createAuditRequest with missing attributes', async () => {
      const auditParams = {
        owner: 'akash1test',
        auditor: 'akash1auditor',
        provider: 'akash1provider',
        attributes: []
      }

      await expect(auditManager.createAuditRequest(auditParams))
        .rejects.toThrow('Invalid audit parameters')
    })

    it('should validate createAuditRequest with null attributes', async () => {
      const auditParams = {
        owner: 'akash1test',
        auditor: 'akash1auditor',
        provider: 'akash1provider',
        attributes: null as any
      }

      await expect(auditManager.createAuditRequest(auditParams))
        .rejects.toThrow('Invalid audit parameters')
    })

    it('should validate revokeAudit with empty owner', async () => {
      await expect(auditManager.revokeAudit('', 'akash1auditor'))
        .rejects.toThrow('Owner and auditor are required')
    })

    it('should validate revokeAudit with empty auditor', async () => {
      await expect(auditManager.revokeAudit('akash1owner', ''))
        .rejects.toThrow('Owner and auditor are required')
    })

    it('should validate getProviderAudits with empty provider', async () => {
      await expect(auditManager.getProviderAudits(''))
        .rejects.toThrow('Provider address is required')
    })

    it('should validate getAuditorProviders with empty auditor', async () => {
      await expect(auditManager.getAuditorProviders(''))
        .rejects.toThrow('Auditor address is required')
    })

    it('should validate getAuditHistory with empty owner', async () => {
      await expect(auditManager.getAuditHistory(''))
        .rejects.toThrow('Owner is required')
    })
  })

  describe('Success Cases with Different Data', () => {
    it('should handle getAuditHistory with auditor filter', async () => {
      const mockTxs = [createMockTx(12345), createMockTx(12346)]
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await auditManager.getAuditHistory('akash1owner', 'akash1auditor')

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        auditId: {
          owner: 'akash1owner',
          auditor: 'akash1auditor',
          aud: '12345'
        },
        state: 'completed',
        score: 95
      })
    })

    it('should handle listAllAudits with filters', async () => {
      const mockTxs = [createMockTx(12345)]
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const filters = {
        owner: 'akash1owner',
        auditor: 'akash1auditor'
      }

      const result = await auditManager.listAllAudits(filters)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        owner: 'akash1owner',
        auditor: 'akash1auditor'
      })
    })

    it('should handle getAuditors successfully', async () => {
      const mockTxs = [createMockTx(12345), createMockTx(12346)]
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await auditManager.getAuditors()

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        auditor: 'akash1auditor1',
        attributes: expect.arrayContaining([
          { key: 'datacenter', value: 'tier-3' },
          { key: 'region', value: 'us-west' }
        ]),
        state: 'active',
        reputation: 95
      })
    })
  })
})