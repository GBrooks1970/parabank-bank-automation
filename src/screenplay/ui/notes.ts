import { notes } from '@serenity-js/core';

/**
 * Public profile details remembered for newly registered customer (TRIAGE-13 / R-08).
 * Omits passwords to keep Serenity public report artefacts secret-safe.
 */
export interface RegisteredCustomerProfile {
  firstName: string;
  lastName: string;
  username: string;
}

/**
 * Typed scenario memory for Paula in Lane A (Serenity/JS TakeNotes).
 * Replaces the second actor's hand-rolled remember/recall notes (TRIAGE-13 / R-08).
 */
export interface UINotes {
  registration: RegisteredCustomerProfile;
  fundingBaseline: number;
  uiNewAccountId: number;
  uiNewAccountBalance: number;
  payeeName: string;
  billAmount: number;
  [key: `baseline:${number}`]: number;
}

export const theNotes = () => notes<UINotes>();
