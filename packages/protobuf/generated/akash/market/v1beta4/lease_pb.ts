// Fallback market types
import { proto3, ScalarType } from '@bufbuild/protobuf';

export enum Lease_State {
  invalid = 0,
  active = 1,
  insufficient_funds = 2,
  closed = 3,
}

// Create enum type for Lease_State
export const Lease_StateEnum = proto3.makeEnumType(
  'akash.market.v1beta4.Lease.State',
  [
    { no: 0, name: 'invalid' },
    { no: 1, name: 'active' },
    { no: 2, name: 'insufficient_funds' },
    { no: 3, name: 'closed' },
  ]
);

// LeaseID message type
export const LeaseID = proto3.makeMessageType(
  'akash.market.v1beta4.LeaseID',
  () => [
    { no: 1, name: 'owner', kind: 'scalar', T: ScalarType.STRING },
    { no: 2, name: 'dseq', kind: 'scalar', T: ScalarType.UINT64 },
    { no: 3, name: 'gseq', kind: 'scalar', T: ScalarType.UINT32 },
    { no: 4, name: 'oseq', kind: 'scalar', T: ScalarType.UINT32 },
    { no: 5, name: 'provider', kind: 'scalar', T: ScalarType.STRING },
  ]
);

export type LeaseID = InstanceType<typeof LeaseID>;

// DecCoin message type (Cosmos SDK)
export const DecCoin = proto3.makeMessageType(
  'cosmos.base.v1beta1.DecCoin',
  () => [
    { no: 1, name: 'denom', kind: 'scalar', T: ScalarType.STRING },
    { no: 2, name: 'amount', kind: 'scalar', T: ScalarType.STRING },
  ]
);

export type DecCoin = InstanceType<typeof DecCoin>;

// Lease message type
export const Lease = proto3.makeMessageType(
  'akash.market.v1beta4.Lease',
  () => [
    { no: 1, name: 'lease_id', kind: 'message', T: LeaseID },
    { no: 2, name: 'state', kind: 'enum', T: Lease_StateEnum },
    { no: 3, name: 'price', kind: 'message', T: DecCoin },
    { no: 4, name: 'created_at', kind: 'scalar', T: ScalarType.INT64 },
    { no: 5, name: 'closed_on', kind: 'scalar', T: ScalarType.INT64 },
  ]
);

export type Lease = InstanceType<typeof Lease>;
