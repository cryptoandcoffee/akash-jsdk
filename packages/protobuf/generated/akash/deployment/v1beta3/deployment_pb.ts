// Fallback deployment types for @bufbuild/protobuf v2
/**
 * Deployment State enum
 * @generated from enum akash.deployment.v1beta3.Deployment.State
 */
export enum Deployment_State {
  /**
   * @generated from enum value: invalid = 0;
   */
  invalid = 0,

  /**
   * @generated from enum value: active = 1;
   */
  active = 1,

  /**
   * @generated from enum value: closed = 2;
   */
  closed = 2,
}

/**
 * DeploymentID stores owner and sequence number
 * @generated from message akash.deployment.v1beta3.DeploymentID
 */
export type DeploymentID = {
  /**
   * @generated from field: string owner = 1;
   */
  owner: string;

  /**
   * @generated from field: uint64 dseq = 2;
   */
  dseq: bigint;
};

/**
 * Deployment stores deployment state
 * @generated from message akash.deployment.v1beta3.Deployment
 */
export type Deployment = {
  /**
   * @generated from field: akash.deployment.v1beta3.DeploymentID deployment_id = 1;
   */
  deploymentId?: DeploymentID;

  /**
   * @generated from field: akash.deployment.v1beta3.Deployment.State state = 2;
   */
  state: Deployment_State;

  /**
   * @generated from field: bytes version = 3;
   */
  version: Uint8Array;

  /**
   * @generated from field: int64 created_at = 4;
   */
  createdAt: bigint;
};
