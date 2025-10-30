// Core types for Akash Network
export interface Deployment {
  deploymentId: DeploymentID
  state: DeploymentState
  version: Uint8Array | string
  createdAt: number
}

export interface DeploymentID {
  owner: string
  dseq: string
}

export enum DeploymentState {
  INVALID = 0,
  ACTIVE = 1,
  CLOSED = 2,
  DEPLOYMENT_ACTIVE = 1 // Alias for compatibility
}

export interface DeploymentFilters {
  owner?: string
  dseq?: string
  state?: DeploymentState
}

export interface Group {
  groupId: GroupID
  state: GroupState
  groupSpec: GroupSpec
  createdAt: number
}

export interface GroupID {
  owner: string
  dseq: string
  gseq: number
}

export enum GroupState {
  INVALID = 0,
  OPEN = 1,
  PAUSED = 2,
  INSUFFICIENT_FUNDS = 3,
  CLOSED = 4
}

export interface GroupSpec {
  name: string
  requirements: PlacementRequirements
  resources: Resource[]
}

export interface PlacementRequirements {
  signedBy: SignedBy
  attributes: Attribute[]
}

export interface SignedBy {
  allOf: string[]
  anyOf: string[]
}

export interface Attribute {
  key: string
  value: string
}

export interface Resource {
  resources: ResourceUnits
  count: number
  price: DecCoin
}

export interface ResourceUnits {
  cpu: CPU
  memory: Memory
  storage: Storage[]
  endpoints?: Endpoint[]
}

export interface CPU {
  units: ResourceValue
  attributes?: Attribute[]
}

export interface Memory {
  quantity: ResourceValue
  attributes?: Attribute[]
}

export interface Storage {
  name: string
  quantity: ResourceValue
  attributes?: Attribute[]
}

export interface ResourceValue {
  val: Uint8Array
}

export interface Endpoint {
  kind: number
  sequenceNumber: number
}

export interface DecCoin {
  denom: string
  amount: string
}

export interface Coin {
  denom: string
  amount: string
}

// Market types
export interface Order {
  orderId: OrderID
  state: OrderState | string
  spec: GroupSpec
  createdAt: number
}

export interface OrderID {
  owner: string
  dseq: string
  gseq: number
  oseq: number
}

export enum OrderState {
  INVALID = 0,
  OPEN = 1,
  ACTIVE = 2,
  CLOSED = 3
}

export interface Bid {
  bidId: BidID
  state: BidState | string
  price: DecCoin
  createdAt: number
}

export interface BidID {
  owner: string
  dseq: string
  gseq: number
  oseq: number
  provider: string
}

export enum BidState {
  INVALID = 0,
  OPEN = 1,
  ACTIVE = 2,
  LOST = 3,
  CLOSED = 4
}

export interface Lease {
  leaseId: LeaseID
  state: LeaseState | string
  price: DecCoin
  createdAt: number
  closedOn: number
  /** Lease close reason (AEP-39) */
  closeReason?: LeaseCloseReason
}

/**
 * Lease close reasons (AEP-39: Lease Termination Tracking)
 */
export enum LeaseCloseReason {
  UNSPECIFIED = 0,
  MANIFEST_TIMEOUT = 1,
  UNSTABLE = 2,
  INSUFFICIENT_FUNDS = 3,
  USER_REQUESTED = 4
}

export interface LeaseID {
  owner: string
  dseq: string
  gseq: number
  oseq: number
  provider: string
}

export enum LeaseState {
  INVALID = 0,
  ACTIVE = 1,
  INSUFFICIENT_FUNDS = 2,
  CLOSED = 3
}

// Provider types
export interface Provider {
  owner: string
  hostUri: string
  attributes: Attribute[]
  info: ProviderInfo
}

export interface ProviderInfo {
  email: string
  website: string
}

// Certificate types
export interface Certificate {
  certificateId: CertificateID
  state: CertificateState
  cert: Uint8Array
  pubkey: Uint8Array
}

export interface CertificateID {
  owner: string
  serial: string
}

export enum CertificateState {
  INVALID = 0,
  VALID = 1,
  REVOKED = 2
}

// Escrow types
export interface Account {
  id: AccountID
  owner: string
  state: AccountState | string
  balance: DecCoin
  transferred: DecCoin
  settledAt: number
  depositor: string
  funds: DecCoin
}

export interface AccountID {
  scope: string
  xid: string
}

export enum AccountState {
  INVALID = 0,
  OPEN = 1,
  CLOSED = 2,
  OVERDRAWN = 3
}

export interface Payment {
  accountId: AccountID
  paymentId: string
  owner: string
  state: PaymentState
  rate: DecCoin
  balance: DecCoin
  withdrawn: DecCoin
}

export enum PaymentState {
  INVALID = 0,
  OPEN = 1,
  CLOSED = 2,
  OVERDRAWN = 3
}

// Audit types
export interface AuditedAttributes {
  auditId?: { owner: string; auditor: string; aud: string }
  owner: string
  auditor: string
  provider?: string
  attributes: Attribute[]
  state?: string
  score?: number
  createdAt?: number
}

// Governance types
export interface Proposal {
  id: string
  proposalId?: string
  title?: string
  description?: string
  content: ProposalContent
  status: ProposalStatus | string
  submitTime: Date | string
  depositEndTime: Date | string
  totalDeposit: Coin[]
  votingStartTime: Date | string
  votingEndTime: Date | string
  finalTallyResult?: TallyResult
}

export interface ProposalContent {
  title: string
  description: string
}

export enum ProposalStatus {
  UNSPECIFIED = 0,
  DEPOSIT_PERIOD = 1,
  VOTING_PERIOD = 2,
  PASSED = 3,
  REJECTED = 4,
  FAILED = 5,
  // Compatibility aliases
  PROPOSAL_STATUS_VOTING_PERIOD = 2,
  PROPOSAL_STATUS_PASSED = 3
}

export interface Vote {
  proposalId: string
  voter: string
  option: VoteOption
}

export enum VoteOption {
  UNSPECIFIED = 0,
  YES = 1,
  ABSTAIN = 2,
  NO = 3,
  NO_WITH_VETO = 4,
  // Compatibility aliases
  VOTE_OPTION_YES = 1
}

export interface TallyResult {
  yes: string
  abstain: string
  no: string
  noWithVeto: string
}

// SDL types
export interface ServiceDefinition {
  version: string
  services: { [key: string]: Service }
  profiles?: {
    compute?: { [key: string]: ComputeProfile }
    placement?: { [key: string]: PlacementProfile }
  }
  deployment: DeploymentConfig
}

export interface Service {
  image: string
  command?: string[]
  args?: string[]
  env?: string[]
  expose?: ServiceExpose[]
  dependencies?: string[]
  credentials?: ServiceCredentials
}

export interface ServiceExpose {
  port: number
  as?: number
  proto?: string
  to?: ServiceExposeTo[]
}

export interface ServiceExposeTo {
  service?: string
  global?: boolean
}

export interface ServiceCredentials {
  host?: string
  username?: string
  password?: string
}

export interface ComputeProfile {
  resources: {
    cpu: { units: string }
    memory: { size: string }
    storage: { size: string }[]
  }
}

export interface PlacementProfile {
  attributes?: { [key: string]: string }
  signedBy?: {
    allOf?: string[]
    anyOf?: string[]
  }
  pricing?: { [key: string]: { denom: string; amount: string } }
}

export interface DeploymentConfig {
  [serviceName: string]: {
    [profileName: string]: {
      profile: string
      count: number
    }
  }
}

// Transaction types
export interface MsgCreateDeployment {
  id: DeploymentID
  groups: GroupSpec[]
  version: Uint8Array
  deposit: Coin
  depositor: string
}

export interface MsgDepositDeployment {
  id: DeploymentID
  amount: Coin
  depositor: string
}

export interface MsgUpdateDeployment {
  id: DeploymentID
  version: Uint8Array
}

export interface MsgCloseDeployment {
  id: DeploymentID
}

/**
 * Deposit sources (AEP-75: Multi-Depositor Escrow)
 */
export enum DepositSource {
  BALANCE = 0,
  GRANT = 1,
  DELEGATED = 2
}

/**
 * Deposit configuration (AEP-75)
 */
export interface Deposit {
  amount: Coin
  sources: DepositSource[]
  depositors?: string[]
}

export interface MsgCreateBid {
  order: OrderID
  provider: string
  price: DecCoin
  /** Legacy single deposit */
  deposit?: Coin
  /** New multi-source deposit (AEP-75) */
  depositConfig?: Deposit
}

export interface MsgCloseBid {
  bidId: BidID
  /** Close reason (AEP-39) */
  reason?: LeaseCloseReason
}

export interface MsgCreateLease {
  bidId: BidID
}

export interface MsgCloseLease {
  leaseId: LeaseID
  /** Close reason (AEP-39) */
  reason?: LeaseCloseReason
}

export interface MsgWithdrawLease {
  leaseId: LeaseID
}

export interface MsgCreateCertificate {
  owner: string
  cert: Uint8Array
  pubkey: Uint8Array
}

export interface MsgRevokeCertificate {
  id: CertificateID
}

export interface MsgCreateProvider {
  owner: string
  hostUri: string
  attributes: Attribute[]
  info: ProviderInfo
}

export interface MsgUpdateProvider {
  owner: string
  hostUri: string
  attributes: Attribute[]
  info: ProviderInfo
}

export interface MsgDeleteProvider {
  owner: string
}

// Wallet types
export interface Balance {
  denom: string
  amount: string
}

export interface Delegation {
  delegatorAddress: string
  validatorAddress: string
  shares: string
}

export interface UnbondingDelegation {
  delegatorAddress: string
  validatorAddress: string
  entries: UnbondingDelegationEntry[]
}

export interface UnbondingDelegationEntry {
  creationHeight: string
  completionTime: Date
  initialBalance: string
  balance: string
}

export interface Validator {
  operatorAddress: string
  consensusPubkey: any
  jailed: boolean
  status: number
  tokens: string
  delegatorShares: string
  description: ValidatorDescription
  unbondingHeight: string
  unbondingTime: Date
  commission: ValidatorCommission
  minSelfDelegation: string
}

export interface ValidatorDescription {
  moniker: string
  identity: string
  website: string
  securityContact: string
  details: string
}

export interface ValidatorCommission {
  commissionRates: {
    rate: string
    maxRate: string
    maxChangeRate: string
  }
  updateTime: Date
}

// Export utility types
export type CreateDeploymentRequest = Omit<Deployment, 'deploymentId' | 'state' | 'createdAt'> & {
  groups: GroupSpec[]
  deposit: Coin
}

export type UpdateDeploymentRequest = {
  deploymentId: DeploymentID
  version: Uint8Array
}

export type CloseDeploymentRequest = {
  deploymentId: DeploymentID
}