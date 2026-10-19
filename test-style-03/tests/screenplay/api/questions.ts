import { Answerable, Question } from '@serenity-js/core';
import { CallAnApi } from '@serenity-js/rest';
import { Account, BANK, cents, JSON_HEADERS, MIN_SOURCE_BALANCE, Transaction } from './endpoints';
import { balanceBeforeOf, idOf, NotedAccount, theNotes } from '../notes';

/**
 * API questions: noun phrases (docs/naming-conventions.md).
 * Questions that fetch fresh state call CallAnApi directly. That also replaces
 * LastResponse, so a test asserts LastResponse BEFORE asking one of these.
 */

const getJson = async <T>(actor: Parameters<typeof CallAnApi.as>[0], url: string): Promise<T> => {
  const response = await CallAnApi.as(actor).request({ method: 'GET', url, headers: JSON_HEADERS });
  if (response.status !== 200) throw new Error(`GET ${url} answered ${response.status}`);
  return response.data as T;
};

export const TheFirstFundedCheckingAccountId = () =>
  Question.about(`the first CHECKING account holding at least $${MIN_SOURCE_BALANCE}`, async (actor) => {
    const accounts = await actor.answer(theNotes().get('accounts'));
    const checking = accounts.find((account) => account.type === 'CHECKING' && account.balance >= MIN_SOURCE_BALANCE);
    if (!checking) throw new Error(`No CHECKING account holds at least $${MIN_SOURCE_BALANCE}`);
    return checking.id;
  });

/** May be undefined: used to decide whether a SAVINGS account has to be opened. */
export const TheFirstSavingsAccount = () =>
  Question.about('the first SAVINGS account', async (actor) =>
    (await actor.answer(theNotes().get('accounts'))).find((account) => account.type === 'SAVINGS')
  );

export const TheFirstSavingsAccountId = () =>
  Question.about('the id of the first SAVINGS account', async (actor) => {
    const savings = await actor.answer(TheFirstSavingsAccount());
    if (!savings) throw new Error('No SAVINGS account found');
    return savings.id;
  });

export const TheBalanceOf = (accountId: Answerable<number>) =>
  Question.about('the current balance of the account', async (actor) => {
    const id = await actor.answer(accountId);
    return (await getJson<Account>(actor, `${BANK}/accounts/${id}`)).balance;
  });

/** Signed change since the balance was recorded, in cents. */
export const TheBalanceChangeOf = (account: NotedAccount) =>
  Question.about(`the change in the ${account} balance, in cents`, async (actor) => {
    const now = await actor.answer(TheBalanceOf(idOf(account)));
    const before = await actor.answer(balanceBeforeOf(account));
    return cents(now) - cents(before);
  });

export const TheTransactionIdsOf = (accountId: Answerable<number>) =>
  Question.about('the ids of the account transactions', async (actor) => {
    const id = await actor.answer(accountId);
    return (await getJson<Transaction[]>(actor, `${BANK}/accounts/${id}/transactions`)).map((transaction) => transaction.id);
  });

/**
 * Ledger entries added since the ids were noted, for one amount. Filtering by amount as well
 * as by id keeps a concurrent transfer on a shared environment from interfering.
 */
export const TheNewLedgerEntriesOf = (accountId: Answerable<number>, amount: number) =>
  Question.about(`the new $${amount} ledger entries on the account`, async (actor) => {
    const id = await actor.answer(accountId);
    const known = new Set(await actor.answer(theNotes().get('knownTransactionIds')));
    const transactions = await getJson<Transaction[]>(actor, `${BANK}/accounts/${id}/transactions`);
    return transactions.filter((transaction) => !known.has(transaction.id) && cents(transaction.amount) === cents(amount));
  });

export const TheOnlyNewLedgerEntryOf = (accountId: Answerable<number>, amount: number) =>
  Question.about(`the only new $${amount} ledger entry on the account`, async (actor) => {
    const entries = await actor.answer(TheNewLedgerEntriesOf(accountId, amount));
    if (entries.length !== 1) throw new Error(`Expected exactly one new $${amount} entry, found ${entries.length}`);
    return entries[0];
  });

/** An amount $1000 above the recorded checking balance: a guaranteed overdraft. */
export const AnOverdraftAmount = () =>
  Question.about('an amount $1000 above the recorded checking balance', async (actor) =>
    Math.ceil(await actor.answer(balanceBeforeOf('checking'))) + 1000
  );
