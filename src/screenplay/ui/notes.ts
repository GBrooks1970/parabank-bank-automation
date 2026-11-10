import { notes } from '@serenity-js/core';
import { NewCustomerDetails } from './tasks';

/**
 * Typed scenario memory for Paula in Lane A (Serenity/JS TakeNotes).
 * Replaces the second actor's hand-rolled remember/recall notes (TRIAGE-13 / R-08).
 */
export interface UINotes {
  registration: NewCustomerDetails;
  fundingBaseline: number;
  uiNewAccountId: number;
  uiNewAccountBalance: number;
  payeeName: string;
  billAmount: number;
  [key: `baseline:${number}`]: number;
}

export const theNotes = () => notes<UINotes>();
