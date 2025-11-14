// Fallback market types for @bufbuild/protobuf v2
/**
 * Lease State enum
 * @generated from enum akash.market.v1beta4.Lease.State
 */
export enum Lease_State {
  /**
   * @generated from enum value: invalid = 0;
   */
  invalid = 0,

  /**
   * @generated from enum value: active = 1;
   */
  active = 1,

  /**
   * @generated from enum value: insufficient_funds = 2;
   */
  insufficient_funds = 2,

  /**
   * @generated from enum value: closed = 3;
   */
  closed = 3,
}

/**
 * LeaseID stores bid details
 * @generated from message akash.market.v1beta4.LeaseID
 */
export type LeaseID = {
  /**
   * @generated from field: string owner = 1;
   */
  owner: string;

  /**
   * @generated from field: uint64 dseq = 2;
   */
  dseq: bigint;

  /**
   * @generated from field: uint32 gseq = 3;
   */
  gseq: number;

  /**
   * @generated from field: uint32 oseq = 4;
   */
  oseq: number;

  /**
   * @generated from field: string provider = 5;
   */
  provider: string;
};

/**
 * DecCoin defines a token with a denomination and a decimal amount
 * @generated from message cosmos.base.v1beta1.DecCoin
 */
export type DecCoin = {
  /**
   * @generated from field: string denom = 1;
   */
  denom: string;

  /**
   * @generated from field: string amount = 2;
   */
  amount: string;
};

/**
 * Lease stores lease details
 * @generated from message akash.market.v1beta4.Lease
 */
export type Lease = {
  /**
   * @generated from field: akash.market.v1beta4.LeaseID lease_id = 1;
   */
  leaseId?: LeaseID;

  /**
   * @generated from field: akash.market.v1beta4.Lease.State state = 2;
   */
  state: Lease_State;

  /**
   * @generated from field: cosmos.base.v1beta1.DecCoin price = 3;
   */
  price?: DecCoin;

  /**
   * @generated from field: int64 created_at = 4;
   */
  createdAt: bigint;

  /**
   * @generated from field: int64 closed_on = 5;
   */
  closedOn: bigint;
};
