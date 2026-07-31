/** Shapes of ParaBank REST/SOAP entities as observed from the pinned SUT (design doc §5.4). */

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  address?: { street: string; city: string; state: string; zipCode: string };
  phoneNumber?: string;
  ssn?: string;
}

export type AccountType = 'CHECKING' | 'SAVINGS' | 'LOAN';

export interface Account {
  id: number;
  customerId: number;
  type: AccountType;
  balance: number;
}

export interface Transaction {
  id: number;
  accountId: number;
  type: string;
  date: number | string;
  amount: number;
  description: string;
}

/** Raw response envelope: the client normalises nothing (assert-as-observed, design doc §5.7). */
export interface ApiResponse {
  status: number;
  text: string;
  /** Normalised response media type without parameters; absent when the response has no Content-Type. */
  contentType?: string;
  /** Present only when the body parsed as JSON. */
  json?: unknown;
}

/** Numeric enum the createAccount endpoint expects for newAccountType. */
export const NewAccountType = { CHECKING: 0, SAVINGS: 1 } as const;
