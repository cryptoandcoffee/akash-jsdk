// Fallback deployment types
import { proto3, ScalarType } from '@bufbuild/protobuf';

export enum Deployment_State {
  invalid = 0,
  active = 1,
  closed = 2,
}

// Create enum type for Deployment_State
export const Deployment_StateEnum = proto3.makeEnumType(
  'akash.deployment.v1beta3.Deployment.State',
  [
    { no: 0, name: 'invalid' },
    { no: 1, name: 'active' },
    { no: 2, name: 'closed' },
  ]
);

// DeploymentID message type
export const DeploymentID = proto3.makeMessageType(
  'akash.deployment.v1beta3.DeploymentID',
  () => [
    { no: 1, name: 'owner', kind: 'scalar', T: ScalarType.STRING },
    { no: 2, name: 'dseq', kind: 'scalar', T: ScalarType.UINT64 },
  ]
);

export type DeploymentID = InstanceType<typeof DeploymentID>;

// Deployment message type  
export const Deployment = proto3.makeMessageType(
  'akash.deployment.v1beta3.Deployment',
  () => [
    { no: 1, name: 'deployment_id', kind: 'message', T: DeploymentID },
    { no: 2, name: 'state', kind: 'enum', T: Deployment_StateEnum },
    { no: 3, name: 'version', kind: 'scalar', T: ScalarType.BYTES },
    { no: 4, name: 'created_at', kind: 'scalar', T: ScalarType.INT64 },
  ]
);

export type Deployment = InstanceType<typeof Deployment>;
