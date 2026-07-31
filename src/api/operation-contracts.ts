/**
 * DR-PB-08's executable FR-B1 contract matrix.
 *
 * This is the single machine-readable inventory for the full public
 * ParaBankRestClient surface. Response schemas are deliberately NOT copied here:
 * SpecConformance resolves them from each operation in the live SUT document.
 */
export interface OperationContract {
  method: 'GET' | 'POST';
  path: `/${string}`;
  observedStatus: number;
  observedMediaType: 'application/json' | null;
  body: 'operation-schema' | 'empty' | 'openapi-document';
  /** Named, conditional fallback when a JSON string response is emitted as unquoted text. */
  rawTextAsStringRisk?: 'PBR-04';
  /** Narrow live-schema errors already governed by an open backlog risk. */
  allowedValidationErrors?: ReadonlyArray<{ risk: 'PBR-01' | 'PBR-05'; includes: string }>;
}

type ClientOperationName = Exclude<keyof ParaBankRestClient, 'baseUrl'>;

export const OPERATION_CONTRACTS = {
  login: {
    method: 'GET',
    path: '/login/{username}/{password}',
    observedStatus: 200,
    observedMediaType: 'application/json',
    body: 'operation-schema'
  },
  customer: {
    method: 'GET',
    path: '/customers/{customerId}',
    observedStatus: 200,
    observedMediaType: 'application/json',
    body: 'operation-schema'
  },
  accounts: {
    method: 'GET',
    path: '/customers/{customerId}/accounts',
    observedStatus: 200,
    observedMediaType: 'application/json',
    body: 'operation-schema'
  },
  account: {
    method: 'GET',
    path: '/accounts/{accountId}',
    observedStatus: 200,
    observedMediaType: 'application/json',
    body: 'operation-schema'
  },
  transactions: {
    method: 'GET',
    path: '/accounts/{accountId}/transactions',
    observedStatus: 200,
    observedMediaType: 'application/json',
    body: 'operation-schema',
    allowedValidationErrors: [{ risk: 'PBR-01', includes: '/date must be string' }]
  },
  createAccount: {
    method: 'POST',
    path: '/createAccount',
    observedStatus: 200,
    observedMediaType: 'application/json',
    body: 'operation-schema'
  },
  deposit: {
    method: 'POST',
    path: '/deposit',
    observedStatus: 200,
    observedMediaType: 'application/json',
    body: 'operation-schema',
    rawTextAsStringRisk: 'PBR-04'
  },
  withdraw: {
    method: 'POST',
    path: '/withdraw',
    observedStatus: 200,
    observedMediaType: 'application/json',
    body: 'operation-schema',
    rawTextAsStringRisk: 'PBR-04'
  },
  transfer: {
    method: 'POST',
    path: '/transfer',
    observedStatus: 200,
    observedMediaType: 'application/json',
    body: 'operation-schema',
    rawTextAsStringRisk: 'PBR-04'
  },
  requestLoan: {
    method: 'POST',
    path: '/requestLoan',
    observedStatus: 200,
    observedMediaType: 'application/json',
    body: 'operation-schema',
    allowedValidationErrors: [{ risk: 'PBR-05', includes: '/responseDate must be string' }]
  },
  setParameter: {
    method: 'POST',
    path: '/setParameter/{name}/{value}',
    observedStatus: 204,
    observedMediaType: null,
    body: 'empty'
  },
  initializeDB: {
    method: 'POST',
    path: '/initializeDB',
    observedStatus: 204,
    observedMediaType: null,
    body: 'empty'
  },
  cleanDB: {
    method: 'POST',
    path: '/cleanDB',
    observedStatus: 204,
    observedMediaType: null,
    body: 'empty'
  },
  openapi: {
    method: 'GET',
    path: '/openapi.json',
    observedStatus: 200,
    observedMediaType: 'application/json',
    body: 'openapi-document'
  }
} as const satisfies Record<ClientOperationName, OperationContract>;

export type OperationName = keyof typeof OPERATION_CONTRACTS;

// The `satisfies` constraint above prevents missing client methods. This reverse check
// prevents stale matrix-only names if a client method is removed or renamed.
const MATRIX_HAS_NO_EXTRA_NAMES: Exclude<OperationName, ClientOperationName> extends never ? true : never = true;
void MATRIX_HAS_NO_EXTRA_NAMES;

export const OPERATION_NAMES = Object.freeze(Object.keys(OPERATION_CONTRACTS) as OperationName[]);
import type { ParaBankRestClient } from './client';
