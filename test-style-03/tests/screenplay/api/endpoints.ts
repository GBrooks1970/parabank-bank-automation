/**
 * ParaBank REST facts, shared by the style-03 API tasks and questions.
 * - Accept: application/json, otherwise CXF answers in XML.
 * - Mutations take QUERY parameters, not a JSON body (the SUT's observed contract).
 * - /transfer answers in plain text even with a JSON content type: CallAnApi hands it
 *   back as a string body.
 */
export const BANK = '/parabank/services/bank';
export const JSON_HEADERS = { Accept: 'application/json' };

/** Funds the happy-path source must hold, so it is a genuine in-funds transfer, not an overdraft. */
export const MIN_SOURCE_BALANCE = 100;

export type AccountType = 'CHECKING' | 'SAVINGS' | 'LOAN';

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
}

export interface Account {
  id: number;
  customerId: number;
  type: AccountType;
  balance: number;
}

export interface Transaction {
  id: number;
  accountId: number;
  type: 'Debit' | 'Credit';
  date: number;
  amount: number;
  description: string;
}

/** Money compared in integer cents, never as floats. */
export const cents = (amount: number | string): number => Math.round(Number(amount) * 100);
