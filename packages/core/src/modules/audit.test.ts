import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuditManager } from './audit'
import { AkashProvider } from '../providers/akash'

describe('AuditManager', () => {
  let auditManager: AuditManager
  let mockProvider: AkashProvider

  beforeEach(() => {
    // Create fresh mock provider for each test
    mockProvider = {
      client: {
        searchTx: vi.fn()
      },
      ensureConnected: vi.fn()
    } as unknown as AkashProvider
    
    auditManager = new AuditManager(mockProvider)
  })

  describe('createAuditRequest', () => {
    it('should create audit request successfully', async () => {
      const auditParams = {
        owner: 'akash1test',
        auditor: 'akash1auditor',
        provider: 'akash1provider',
        attributes: [
          { key: 'datacenter', value: 'tier-3' },
          { key: 'region', value: 'us-west' }
        ]
      }

      const mockTx = {
        height: 12345,
        hash: 'audit-request-hash',
        gasUsed: BigInt(50000),
        gasWanted: BigInt(60000),
        events: [],
        txIndex: 0,
        code: 0,
        rawLog: '',
        tx: new Uint8Array(),
        msgResponses: []
      }

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([mockTx])

      const result = await auditManager.createAuditRequest(auditParams)

      expect(result).toMatchObject({
        auditId: {
          owner: auditParams.owner,
          auditor: auditParams.auditor,
          aud: '12345'
        },
        state: 'open',
        provider: auditParams.provider,
        attributes: auditParams.attributes,
        createdAt: expect.any(Number)
      })
    })

    it('should throw error for invalid audit parameters', async () => {
      const invalidParams = {
        owner: '',
        auditor: '',
        provider: '',
        attributes: []
      }

      await expect(auditManager.createAuditRequest(invalidParams)).rejects.toThrow('Invalid audit parameters')
    })

    it('should handle network errors', async () => {
      const auditParams = {
        owner: 'akash1test',
        auditor: 'akash1auditor',
        provider: 'akash1provider',
        attributes: [{ key: 'region', value: 'us-west' }]
      }
      
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))
      
      await expect(auditManager.createAuditRequest(auditParams)).rejects.toThrow('Failed to submit audit')
    })
  })

  describe('getAuditors', () => {
    it('should list all available auditors', async () => {
      const mockTxs = [
        {
          height: 12300,
          hash: 'auditor-tx-1',
          gasUsed: 50000,
          gasWanted: 60000,
          events: []
        },
        {
          height: 12301,
          hash: 'auditor-tx-2',
          gasUsed: 50000,
          gasWanted: 60000,
          events: []
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await auditManager.getAuditors()

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        auditor: 'akash1auditor1',
        attributes: [
          { key: 'datacenter', value: 'tier-3' },
          { key: 'region', value: 'us-west' }
        ],
        state: 'active',
        reputation: 95
      })
    })

    it('should handle network errors', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))
      
      await expect(auditManager.getAuditors()).rejects.toThrow('Failed to get auditors')
    })
  })

  describe('getProviderAudits', () => {
    it('should get audit records for provider', async () => {
      const provider = 'akash1provider'
      const mockTxs = [
        {
          height: 12350,
          hash: 'audit-tx-1',
          gasUsed: 50000,
          gasWanted: 60000,
          events: []
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await auditManager.getProviderAudits(provider)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        auditId: {
          owner: 'akash1owner',
          auditor: 'akash1auditor',
          aud: '12350'
        },
        provider,
        attributes: expect.any(Array),
        state: 'active',
        createdAt: expect.any(Number)
      })
    })

    it('should return empty array for provider with no audits', async () => {
      const provider = 'akash1unaudited'

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])

      const result = await auditManager.getProviderAudits(provider)

      expect(result).toEqual([])
    })

    it('should throw error for missing provider', async () => {
      await expect(auditManager.getProviderAudits('')).rejects.toThrow('Provider address is required')
    })

    it('should handle network errors', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))
      
      await expect(auditManager.getProviderAudits('akash1provider')).rejects.toThrow('Failed to get provider audits')
    })
  })

  describe('revokeAudit', () => {
    it('should revoke audit successfully', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue([])
      
      await auditManager.revokeAudit('akash1owner', 'akash1auditor')
      
      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'audit' },
        { key: 'message.action', value: 'delete-provider-attributes' },
        { key: 'audit.owner', value: 'akash1owner' },
        { key: 'audit.auditor', value: 'akash1auditor' }
      ])
    })

    it('should throw error for missing parameters', async () => {
      await expect(auditManager.revokeAudit('', '')).rejects.toThrow('Owner and auditor are required')
      await expect(auditManager.revokeAudit('akash1owner', '')).rejects.toThrow('Owner and auditor are required')
      await expect(auditManager.revokeAudit('', 'akash1auditor')).rejects.toThrow('Owner and auditor are required')
    })

    it('should handle network errors', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))
      
      await expect(auditManager.revokeAudit('akash1owner', 'akash1auditor')).rejects.toThrow('Failed to revoke audit')
    })
  })

  describe('validateAuditCriteria', () => {
    it('should validate provider against audit criteria', async () => {
      const provider = 'akash1provider'
      const criteria = {
        minReputation: 90,
        requiredAttributes: [
          { key: 'datacenter', value: 'tier-3' }
        ],
        auditorsRequired: ['akash1auditor1']
      }

      // Mock audit results
      const mockAudits = [
        {
          auditId: {
            owner: 'akash1owner',
            auditor: 'akash1auditor1',
            aud: '123'
          },
          provider,
          attributes: [
            { key: 'datacenter', value: 'tier-3' },
            { key: 'region', value: 'us-west' }
          ],
          state: 'active',
          score: 95
        }
      ]

      vi.spyOn(auditManager, 'getProviderAudits').mockResolvedValue(mockAudits)

      const result = await auditManager.validateAuditCriteria(provider, criteria)

      expect(result).toMatchObject({
        valid: true,
        score: 95,
        meetsReputation: true,
        hasRequiredAttributes: true,
        hasRequiredAuditors: true,
        missingAttributes: [],
        missingAuditors: []
      })
    })

    it('should handle network errors', async () => {
      vi.spyOn(auditManager, 'getProviderAudits').mockRejectedValue(new Error('Network error'))
      
      await expect(auditManager.validateAuditCriteria('akash1provider', {})).rejects.toThrow('Failed to validate audit criteria')
    })
  })

  describe('getAuditHistory', () => {
    it('should get audit history for owner', async () => {
      const owner = 'akash1owner'
      const mockTxs = [
        {
          height: 12345,
          hash: 'audit-history-1',
          gasUsed: 50000,
          gasWanted: 60000,
          events: []
        }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)

      const result = await auditManager.getAuditHistory(owner)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        auditId: {
          owner,
          auditor: 'akash1auditor',
          aud: '12345'
        },
        provider: 'akash1provider',
        state: 'completed',
        score: 95,
        createdAt: expect.any(Number),
        completedAt: expect.any(Number)
      })
    })

    it('should throw error for missing owner', async () => {
      await expect(auditManager.getAuditHistory('')).rejects.toThrow('Owner is required')
    })

    it('should handle network errors', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))
      
      await expect(auditManager.getAuditHistory('akash1owner')).rejects.toThrow('Failed to get audit history')
    })
  })

  describe('listAllAudits', () => {
    it('should list all audits with no filters', async () => {
      const mockTxs = [{ height: 12345, hash: 'tx1', gasUsed: 50000, gasWanted: 60000, events: [] }]
      
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)
      
      const result = await auditManager.listAllAudits()
      
      expect(result).toHaveLength(1)
      expect(mockProvider['client']!.searchTx).toHaveBeenCalledWith([
        { key: 'message.module', value: 'audit' }
      ])
    })

    it('should handle network errors', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))
      
      await expect(auditManager.listAllAudits()).rejects.toThrow('Failed to list audits')
    })
  })

  describe('validateAudit', () => {
    it('should validate valid audit', async () => {
      const validAudit = {
        owner: 'akash1owner',
        auditor: 'akash1auditor',
        attributes: [
          { key: 'region', value: 'us-west' },
          { key: 'tier', value: 'community' }
        ]
      }
      
      const result = await auditManager.validateAudit(validAudit)
      expect(result).toBe(true)
    })

    it('should reject audit with missing data', async () => {
      const invalidAudit = {
        owner: '',
        auditor: 'akash1auditor',
        attributes: [{ key: 'region', value: 'us-west' }]
      }
      
      const result = await auditManager.validateAudit(invalidAudit)
      expect(result).toBe(false)
    })
  })

  describe('getAuditorProviders', () => {
    it('should get providers audited by auditor', async () => {
      const mockTxs = [
        { height: 12345, hash: 'tx1', gasUsed: 50000, gasWanted: 60000, events: [] }
      ]
      
      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)
      
      const result = await auditManager.getAuditorProviders('akash1auditor')
      
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        owner: 'akash1provider0',
        auditor: 'akash1auditor',
        attributes: expect.any(Array)
      })
    })

    it('should throw error for missing auditor', async () => {
      await expect(auditManager.getAuditorProviders('')).rejects.toThrow('Auditor address is required')
    })

    it('should handle network errors', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))
      
      await expect(auditManager.getAuditorProviders('akash1auditor')).rejects.toThrow('Failed to get auditor providers')
    })
  })

  describe('getAuditStats', () => {
    it('should get audit statistics', async () => {
      // Mock multiple searches for different stats
      vi.mocked(mockProvider['client']!.searchTx)
        .mockResolvedValueOnce([{ height: 1 }, { height: 2 }, { height: 3 }]) // total audits
        .mockResolvedValueOnce([{ height: 1 }, { height: 2 }]) // active audits
        .mockResolvedValueOnce([{ height: 1 }]) // unique auditors
        .mockResolvedValueOnce([{ height: 1 }, { height: 2 }, { height: 3 }, { height: 4 }]) // unique providers

      const result = await auditManager.getAuditStats()

      expect(result).toMatchObject({
        totalAudits: 3,
        activeAudits: 2,
        uniqueAuditors: 1,
        uniqueProviders: 4,
        averageScore: 92.5,
        scoreDistribution: {
          '90-100': 3,
          '80-89': 0,
          '70-79': 0,
          'below-70': 0
        }
      })
    })

    it('should handle network errors', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValueOnce(new Error('Network error'))
      
      await expect(auditManager.getAuditStats()).rejects.toThrow('Failed to get audit stats')
    })
  })

  describe('searchAuditedProviders', () => {
    it('should search providers by audit criteria', async () => {
      const searchCriteria = {
        minScore: 90,
        attributes: [
          { key: 'region', value: 'us-west' }
        ],
        auditor: 'akash1auditor'
      }

      const mockTxs = [
        {
          height: 12350,
          hash: 'search-audit-1',
          gasUsed: 50000,
          gasWanted: 60000,
          events: []
        }
      ]

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

    it('should handle network errors', async () => {
      vi.mocked(mockProvider['client']!.searchTx).mockRejectedValue(new Error('Network error'))
      
      await expect(auditManager.searchAuditedProviders({})).rejects.toThrow('Failed to search audited providers')
    })
  })

  describe('validateAuditCriteria', () => {
    it('should validate audit criteria successfully', async () => {
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

      const mockTxs = [
        { height: 12345, hash: 'audit-1', gasUsed: 50000, gasWanted: 60000, events: [] },
        { height: 12346, hash: 'audit-2', gasUsed: 50000, gasWanted: 60000, events: [] }
      ]

      vi.mocked(mockProvider['client']!.searchTx).mockResolvedValue(mockTxs)
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

    it('should identify missing auditors', async () => {
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

    it('should identify missing attributes', async () => {
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

    it('should fail when reputation is too low', async () => {
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
  })

  describe('validateAudit', () => {
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

    it('should reject audit with missing auditor', async () => {
      const invalidAudit = {
        owner: 'akash1provider',
        auditor: '',
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
  })
})