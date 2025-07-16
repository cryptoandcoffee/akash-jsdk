import { describe, it, expect } from 'vitest'
import {
  Deployment,
  DeploymentID,
  DeploymentState,
  Lease,
  LeaseID,
  LeaseState,
  Provider,
  ProviderInfo,
  Order,
  OrderID,
  OrderState,
  Bid,
  BidID,
  BidState,
  Certificate,
  CertificateID,
  CertificateState,
  Account,
  AccountID,
  AccountState,
  Payment,
  PaymentState,
  AuditedAttributes,
  Proposal,
  ProposalStatus,
  Vote,
  VoteOption,
  TallyResult,
  ServiceDefinition,
  ComputeProfile,
  PlacementProfile,
  DeploymentConfig,
  MsgCreateDeployment,
  MsgCloseDeployment,
  MsgCreateBid,
  MsgCloseBid,
  MsgCreateLease,
  MsgCloseLease,
  MsgCreateCertificate,
  MsgRevokeCertificate,
  MsgCreateProvider,
  MsgUpdateProvider,
  MsgDeleteProvider,
  Balance,
  Delegation,
  UnbondingDelegation,
  Validator,
  ValidatorDescription,
  ValidatorCommission,
  CreateDeploymentRequest,
  UpdateDeploymentRequest,
  CloseDeploymentRequest
} from './official-types.js'

describe('Official Types', () => {
  describe('Deployment Types', () => {
    it('should define DeploymentState enum correctly', () => {
      expect(DeploymentState.INVALID).toBe(0)
      expect(DeploymentState.ACTIVE).toBe(1)
      expect(DeploymentState.CLOSED).toBe(2)
      expect(DeploymentState.DEPLOYMENT_ACTIVE).toBe(1)
    })

    it('should validate DeploymentID interface', () => {
      const deploymentId: DeploymentID = {
        owner: 'akash1test',
        dseq: '123'
      }
      expect(deploymentId.owner).toBe('akash1test')
      expect(deploymentId.dseq).toBe('123')
    })

    it('should validate Deployment interface', () => {
      const deployment: Deployment = {
        deploymentId: {
          owner: 'akash1test',
          dseq: '123'
        },
        state: DeploymentState.ACTIVE,
        version: new Uint8Array([1, 2, 3]),
        createdAt: Date.now()
      }
      expect(deployment.deploymentId.owner).toBe('akash1test')
      expect(deployment.state).toBe(DeploymentState.ACTIVE)
      expect(deployment.version).toBeInstanceOf(Uint8Array)
      expect(typeof deployment.createdAt).toBe('number')
    })
  })

  describe('Market Types', () => {
    it('should define OrderState enum correctly', () => {
      expect(OrderState.INVALID).toBe(0)
      expect(OrderState.OPEN).toBe(1)
      expect(OrderState.ACTIVE).toBe(2)
      expect(OrderState.CLOSED).toBe(3)
    })

    it('should define BidState enum correctly', () => {
      expect(BidState.INVALID).toBe(0)
      expect(BidState.OPEN).toBe(1)
      expect(BidState.ACTIVE).toBe(2)
      expect(BidState.LOST).toBe(3)
      expect(BidState.CLOSED).toBe(4)
    })

    it('should define LeaseState enum correctly', () => {
      expect(LeaseState.INVALID).toBe(0)
      expect(LeaseState.ACTIVE).toBe(1)
      expect(LeaseState.INSUFFICIENT_FUNDS).toBe(2)
      expect(LeaseState.CLOSED).toBe(3)
    })

    it('should validate OrderID interface', () => {
      const orderId: OrderID = {
        owner: 'akash1test',
        dseq: '123',
        gseq: 1,
        oseq: 1
      }
      expect(orderId.owner).toBe('akash1test')
      expect(orderId.dseq).toBe('123')
      expect(orderId.gseq).toBe(1)
      expect(orderId.oseq).toBe(1)
    })

    it('should validate BidID interface', () => {
      const bidId: BidID = {
        owner: 'akash1test',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }
      expect(bidId.owner).toBe('akash1test')
      expect(bidId.provider).toBe('akash1provider')
    })

    it('should validate LeaseID interface', () => {
      const leaseId: LeaseID = {
        owner: 'akash1test',
        dseq: '123',
        gseq: 1,
        oseq: 1,
        provider: 'akash1provider'
      }
      expect(leaseId.owner).toBe('akash1test')
      expect(leaseId.provider).toBe('akash1provider')
    })

    it('should validate Lease interface', () => {
      const lease: Lease = {
        leaseId: {
          owner: 'akash1test',
          dseq: '123',
          gseq: 1,
          oseq: 1,
          provider: 'akash1provider'
        },
        state: LeaseState.ACTIVE,
        price: {
          denom: 'uakt',
          amount: '1000'
        },
        createdAt: Date.now(),
        closedOn: 0
      }
      expect(lease.leaseId.owner).toBe('akash1test')
      expect(lease.state).toBe(LeaseState.ACTIVE)
      expect(lease.price.denom).toBe('uakt')
    })
  })

  describe('Provider Types', () => {
    it('should validate ProviderInfo interface', () => {
      const providerInfo: ProviderInfo = {
        email: 'test@example.com',
        website: 'https://example.com'
      }
      expect(providerInfo.email).toBe('test@example.com')
      expect(providerInfo.website).toBe('https://example.com')
    })

    it('should validate Provider interface', () => {
      const provider: Provider = {
        owner: 'akash1provider',
        hostUri: 'https://provider.akash.network',
        attributes: [
          { key: 'region', value: 'us-west' }
        ],
        info: {
          email: 'test@example.com',
          website: 'https://example.com'
        }
      }
      expect(provider.owner).toBe('akash1provider')
      expect(provider.hostUri).toBe('https://provider.akash.network')
      expect(provider.attributes).toHaveLength(1)
      expect(provider.info.email).toBe('test@example.com')
    })
  })

  describe('Certificate Types', () => {
    it('should define CertificateState enum correctly', () => {
      expect(CertificateState.INVALID).toBe(0)
      expect(CertificateState.VALID).toBe(1)
      expect(CertificateState.REVOKED).toBe(2)
    })

    it('should validate CertificateID interface', () => {
      const certId: CertificateID = {
        owner: 'akash1test',
        serial: 'cert-123'
      }
      expect(certId.owner).toBe('akash1test')
      expect(certId.serial).toBe('cert-123')
    })

    it('should validate Certificate interface', () => {
      const certificate: Certificate = {
        certificateId: {
          owner: 'akash1test',
          serial: 'cert-123'
        },
        state: CertificateState.VALID,
        cert: new Uint8Array([1, 2, 3]),
        pubkey: new Uint8Array([4, 5, 6])
      }
      expect(certificate.certificateId.owner).toBe('akash1test')
      expect(certificate.state).toBe(CertificateState.VALID)
      expect(certificate.cert).toBeInstanceOf(Uint8Array)
      expect(certificate.pubkey).toBeInstanceOf(Uint8Array)
    })
  })

  describe('Escrow Types', () => {
    it('should define AccountState enum correctly', () => {
      expect(AccountState.INVALID).toBe(0)
      expect(AccountState.OPEN).toBe(1)
      expect(AccountState.CLOSED).toBe(2)
      expect(AccountState.OVERDRAWN).toBe(3)
    })

    it('should define PaymentState enum correctly', () => {
      expect(PaymentState.INVALID).toBe(0)
      expect(PaymentState.OPEN).toBe(1)
      expect(PaymentState.CLOSED).toBe(2)
      expect(PaymentState.OVERDRAWN).toBe(3)
    })

    it('should validate AccountID interface', () => {
      const accountId: AccountID = {
        scope: 'deployment',
        xid: 'test-123'
      }
      expect(accountId.scope).toBe('deployment')
      expect(accountId.xid).toBe('test-123')
    })

    it('should validate Account interface', () => {
      const account: Account = {
        id: {
          scope: 'deployment',
          xid: 'test-123'
        },
        owner: 'akash1test',
        state: AccountState.OPEN,
        balance: { denom: 'uakt', amount: '1000' },
        transferred: { denom: 'uakt', amount: '500' },
        settledAt: Date.now(),
        depositor: 'akash1depositor',
        funds: { denom: 'uakt', amount: '1500' }
      }
      expect(account.id.scope).toBe('deployment')
      expect(account.owner).toBe('akash1test')
      expect(account.state).toBe(AccountState.OPEN)
    })
  })

  describe('Audit Types', () => {
    it('should validate AuditedAttributes interface', () => {
      const auditedAttrs: AuditedAttributes = {
        auditId: {
          owner: 'akash1test',
          auditor: 'akash1auditor',
          aud: 'audit-123'
        },
        owner: 'akash1test',
        auditor: 'akash1auditor',
        provider: 'akash1provider',
        attributes: [
          { key: 'region', value: 'us-west' }
        ],
        state: 'active',
        score: 95,
        createdAt: Date.now()
      }
      expect(auditedAttrs.owner).toBe('akash1test')
      expect(auditedAttrs.auditor).toBe('akash1auditor')
      expect(auditedAttrs.score).toBe(95)
    })
  })

  describe('Governance Types', () => {
    it('should define ProposalStatus enum correctly', () => {
      expect(ProposalStatus.UNSPECIFIED).toBe(0)
      expect(ProposalStatus.DEPOSIT_PERIOD).toBe(1)
      expect(ProposalStatus.VOTING_PERIOD).toBe(2)
      expect(ProposalStatus.PASSED).toBe(3)
      expect(ProposalStatus.REJECTED).toBe(4)
      expect(ProposalStatus.FAILED).toBe(5)
      expect(ProposalStatus.PROPOSAL_STATUS_VOTING_PERIOD).toBe(2)
      expect(ProposalStatus.PROPOSAL_STATUS_PASSED).toBe(3)
    })

    it('should define VoteOption enum correctly', () => {
      expect(VoteOption.UNSPECIFIED).toBe(0)
      expect(VoteOption.YES).toBe(1)
      expect(VoteOption.ABSTAIN).toBe(2)
      expect(VoteOption.NO).toBe(3)
      expect(VoteOption.NO_WITH_VETO).toBe(4)
      expect(VoteOption.VOTE_OPTION_YES).toBe(1)
    })

    it('should validate Proposal interface', () => {
      const proposal: Proposal = {
        id: 'prop-123',
        proposalId: '123',
        title: 'Test Proposal',
        description: 'A test proposal',
        content: {
          title: 'Test Proposal',
          description: 'A test proposal'
        },
        status: ProposalStatus.VOTING_PERIOD,
        submitTime: new Date(),
        depositEndTime: new Date(),
        totalDeposit: [{ denom: 'uakt', amount: '1000' }],
        votingStartTime: new Date(),
        votingEndTime: new Date(),
        finalTallyResult: {
          yes: '100',
          abstain: '50',
          no: '25',
          noWithVeto: '10'
        }
      }
      expect(proposal.id).toBe('prop-123')
      expect(proposal.status).toBe(ProposalStatus.VOTING_PERIOD)
      expect(proposal.content.title).toBe('Test Proposal')
    })

    it('should validate Vote interface', () => {
      const vote: Vote = {
        proposalId: '123',
        voter: 'akash1voter',
        option: VoteOption.YES
      }
      expect(vote.proposalId).toBe('123')
      expect(vote.voter).toBe('akash1voter')
      expect(vote.option).toBe(VoteOption.YES)
    })

    it('should validate TallyResult interface', () => {
      const tally: TallyResult = {
        yes: '100',
        abstain: '50',
        no: '25',
        noWithVeto: '10'
      }
      expect(tally.yes).toBe('100')
      expect(tally.abstain).toBe('50')
      expect(tally.no).toBe('25')
      expect(tally.noWithVeto).toBe('10')
    })
  })

  describe('SDL Types', () => {
    it('should validate ServiceDefinition interface', () => {
      const sdl: ServiceDefinition = {
        version: '2.0',
        services: {
          web: {
            image: 'nginx:latest',
            expose: [
              {
                port: 80,
                as: 80,
                to: [{ global: true }]
              }
            ]
          }
        },
        profiles: {
          compute: {
            web: {
              resources: {
                cpu: { units: '100m' },
                memory: { size: '128Mi' },
                storage: [{ size: '1Gi' }]
              }
            }
          },
          placement: {
            westcoast: {
              attributes: { region: 'us-west' },
              pricing: {
                web: { denom: 'uakt', amount: '1000' }
              }
            }
          }
        },
        deployment: {
          web: {
            westcoast: {
              profile: 'web',
              count: 1
            }
          }
        }
      }
      expect(sdl.version).toBe('2.0')
      expect(sdl.services.web.image).toBe('nginx:latest')
      expect(sdl.profiles?.compute?.web.resources.cpu.units).toBe('100m')
    })

    it('should validate ComputeProfile interface', () => {
      const profile: ComputeProfile = {
        resources: {
          cpu: { units: '100m' },
          memory: { size: '128Mi' },
          storage: [{ size: '1Gi' }]
        }
      }
      expect(profile.resources.cpu.units).toBe('100m')
      expect(profile.resources.memory.size).toBe('128Mi')
      expect(profile.resources.storage).toHaveLength(1)
    })

    it('should validate PlacementProfile interface', () => {
      const profile: PlacementProfile = {
        attributes: { region: 'us-west' },
        signedBy: {
          allOf: ['auditor1'],
          anyOf: ['auditor2', 'auditor3']
        },
        pricing: {
          web: { denom: 'uakt', amount: '1000' }
        }
      }
      expect(profile.attributes?.region).toBe('us-west')
      expect(profile.signedBy?.allOf).toContain('auditor1')
      expect(profile.pricing?.web.denom).toBe('uakt')
    })
  })

  describe('Message Types', () => {
    it('should validate MsgCreateDeployment interface', () => {
      const msg: MsgCreateDeployment = {
        id: {
          owner: 'akash1test',
          dseq: '123'
        },
        groups: [
          {
            name: 'web',
            requirements: {
              signedBy: { allOf: [], anyOf: [] },
              attributes: []
            },
            resources: []
          }
        ],
        version: new Uint8Array([1, 2, 3]),
        deposit: { denom: 'uakt', amount: '5000000' },
        depositor: 'akash1test'
      }
      expect(msg.id.owner).toBe('akash1test')
      expect(msg.groups).toHaveLength(1)
      expect(msg.deposit.denom).toBe('uakt')
    })

    it('should validate MsgCloseDeployment interface', () => {
      const msg: MsgCloseDeployment = {
        id: {
          owner: 'akash1test',
          dseq: '123'
        }
      }
      expect(msg.id.owner).toBe('akash1test')
      expect(msg.id.dseq).toBe('123')
    })

    it('should validate MsgCreateBid interface', () => {
      const msg: MsgCreateBid = {
        order: {
          owner: 'akash1test',
          dseq: '123',
          gseq: 1,
          oseq: 1
        },
        provider: 'akash1provider',
        price: { denom: 'uakt', amount: '1000' },
        deposit: { denom: 'uakt', amount: '5000000' }
      }
      expect(msg.order.owner).toBe('akash1test')
      expect(msg.provider).toBe('akash1provider')
      expect(msg.price.denom).toBe('uakt')
    })

    it('should validate MsgCreateProvider interface', () => {
      const msg: MsgCreateProvider = {
        owner: 'akash1provider',
        hostUri: 'https://provider.akash.network',
        attributes: [
          { key: 'region', value: 'us-west' }
        ],
        info: {
          email: 'test@example.com',
          website: 'https://example.com'
        }
      }
      expect(msg.owner).toBe('akash1provider')
      expect(msg.hostUri).toBe('https://provider.akash.network')
      expect(msg.info.email).toBe('test@example.com')
    })
  })

  describe('Wallet Types', () => {
    it('should validate Balance interface', () => {
      const balance: Balance = {
        denom: 'uakt',
        amount: '1000000'
      }
      expect(balance.denom).toBe('uakt')
      expect(balance.amount).toBe('1000000')
    })

    it('should validate Delegation interface', () => {
      const delegation: Delegation = {
        delegatorAddress: 'akash1delegator',
        validatorAddress: 'akashvaloper1validator',
        shares: '1000.000000000000000000'
      }
      expect(delegation.delegatorAddress).toBe('akash1delegator')
      expect(delegation.validatorAddress).toBe('akashvaloper1validator')
      expect(delegation.shares).toBe('1000.000000000000000000')
    })

    it('should validate Validator interface', () => {
      const validator: Validator = {
        operatorAddress: 'akashvaloper1validator',
        consensusPubkey: { '@type': '/cosmos.crypto.ed25519.PubKey', key: 'test' },
        jailed: false,
        status: 3,
        tokens: '1000000',
        delegatorShares: '1000000.000000000000000000',
        description: {
          moniker: 'Test Validator',
          identity: '',
          website: 'https://validator.com',
          securityContact: 'security@validator.com',
          details: 'A test validator'
        },
        unbondingHeight: '0',
        unbondingTime: new Date(),
        commission: {
          commissionRates: {
            rate: '0.100000000000000000',
            maxRate: '0.200000000000000000',
            maxChangeRate: '0.010000000000000000'
          },
          updateTime: new Date()
        },
        minSelfDelegation: '1'
      }
      expect(validator.operatorAddress).toBe('akashvaloper1validator')
      expect(validator.jailed).toBe(false)
      expect(validator.description.moniker).toBe('Test Validator')
    })
  })

  describe('Utility Types', () => {
    it('should validate CreateDeploymentRequest type', () => {
      const request: CreateDeploymentRequest = {
        version: new Uint8Array([1, 2, 3]),
        groups: [
          {
            name: 'web',
            requirements: {
              signedBy: { allOf: [], anyOf: [] },
              attributes: []
            },
            resources: []
          }
        ],
        deposit: { denom: 'uakt', amount: '5000000' }
      }
      expect(request.version).toBeInstanceOf(Uint8Array)
      expect(request.groups).toHaveLength(1)
      expect(request.deposit.denom).toBe('uakt')
    })

    it('should validate UpdateDeploymentRequest type', () => {
      const request: UpdateDeploymentRequest = {
        deploymentId: {
          owner: 'akash1test',
          dseq: '123'
        },
        version: new Uint8Array([1, 2, 3])
      }
      expect(request.deploymentId.owner).toBe('akash1test')
      expect(request.version).toBeInstanceOf(Uint8Array)
    })

    it('should validate CloseDeploymentRequest type', () => {
      const request: CloseDeploymentRequest = {
        deploymentId: {
          owner: 'akash1test',
          dseq: '123'
        }
      }
      expect(request.deploymentId.owner).toBe('akash1test')
      expect(request.deploymentId.dseq).toBe('123')
    })
  })

  describe('Type Compatibility', () => {
    it('should allow string or enum values for states', () => {
      // Test that state fields can accept both enum values and strings
      const orderWithEnum: Order = {
        orderId: {
          owner: 'akash1test',
          dseq: '123',
          gseq: 1,
          oseq: 1
        },
        state: OrderState.OPEN,
        spec: {
          name: 'web',
          requirements: {
            signedBy: { allOf: [], anyOf: [] },
            attributes: []
          },
          resources: []
        },
        createdAt: Date.now()
      }

      const orderWithString: Order = {
        orderId: {
          owner: 'akash1test',
          dseq: '123',
          gseq: 1,
          oseq: 1
        },
        state: 'open',
        spec: {
          name: 'web',
          requirements: {
            signedBy: { allOf: [], anyOf: [] },
            attributes: []
          },
          resources: []
        },
        createdAt: Date.now()
      }

      expect(orderWithEnum.state).toBe(OrderState.OPEN)
      expect(orderWithString.state).toBe('open')
    })

    it('should handle optional fields correctly', () => {
      const minimalAuditedAttrs: AuditedAttributes = {
        owner: 'akash1test',
        auditor: 'akash1auditor',
        attributes: []
      }
      expect(minimalAuditedAttrs.owner).toBe('akash1test')
      expect(minimalAuditedAttrs.auditId).toBeUndefined()
      expect(minimalAuditedAttrs.score).toBeUndefined()
    })

    it('should handle version field as both Uint8Array and string', () => {
      const deploymentWithUint8Array: Deployment = {
        deploymentId: {
          owner: 'akash1test',
          dseq: '123'
        },
        state: DeploymentState.ACTIVE,
        version: new Uint8Array([1, 2, 3]),
        createdAt: Date.now()
      }

      const deploymentWithString: Deployment = {
        deploymentId: {
          owner: 'akash1test',
          dseq: '123'
        },
        state: DeploymentState.ACTIVE,
        version: 'v1.0.0',
        createdAt: Date.now()
      }

      expect(deploymentWithUint8Array.version).toBeInstanceOf(Uint8Array)
      expect(deploymentWithString.version).toBe('v1.0.0')
    })
  })
})