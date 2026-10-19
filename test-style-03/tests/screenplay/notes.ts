import { notes } from '@serenity-js/core';
import { Account } from './api/endpoints';

/**
 * What an actor remembers between interactions, in Screenplay terms: their notepad
 * (TakeNotes). Discovery writes the ids here; later tasks and questions read them.
 */
export interface ParaBankNotes {
  customerId: number;
  accounts: Account[];
  checkingId: number;
  savingsId: number;
  checkingBalanceBefore: number;
  savingsBalanceBefore: number;
  knownTransactionIds: number[];
}

export const theNotes = () => notes<ParaBankNotes>();

export type NotedAccount = 'checking' | 'savings';

export const idOf = (account: NotedAccount) => theNotes().get(account === 'checking' ? 'checkingId' : 'savingsId');

export const balanceBeforeOf = (account: NotedAccount) =>
  theNotes().get(account === 'checking' ? 'checkingBalanceBefore' : 'savingsBalanceBefore');
