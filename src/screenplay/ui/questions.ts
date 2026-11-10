import { Answerable, Question } from '@serenity-js/core';
import { Text } from '@serenity-js/web';
import { CallParaBankRest } from '../abilities';
import { Account, Transaction } from '../../api/types';
import { LoanPage, NavPanel, OpenAccountPage, OverviewPage, RightPanel, TransferPage, BillPayPage } from './pages';

/** Lane A questions — noun phrases (docs/naming-conventions.md). */

export const TheWelcomeMessage = () => Text.of(NavPanel.welcome).describedAs('the welcome message');

export const TheOverviewTableText = () => Text.of(OverviewPage.accountTable).describedAs('the accounts overview');

export const TheContentTitle = () => Text.of(RightPanel.title).describedAs('the content title');

export const TheNewAccountId = () => Text.of(OpenAccountPage.newAccountId).describedAs('the new account id');

export const TheTransferResultText = () => Text.of(TransferPage.result).describedAs('the transfer result');

export const TheTransferResultAmount = () => Text.of(TransferPage.amountResult).describedAs('the transferred amount');

export const TheBillPayResultText = () => Text.of(BillPayPage.result).describedAs('the bill payment result');

export const TheBillPayResultAmount = () => Text.of(BillPayPage.amountResult).describedAs('the bill payment amount');

export const TheLoanStatus = () => Text.of(LoanPage.status).describedAs('the loan status');

export const TheNewLoanAccountId = () => Text.of(LoanPage.newLoanAccountId).describedAs('the new loan account id');

// ---------- REST cross-check questions (TRIAGE-13 / R-08) ----------

export const TheRestAccount = {
  withId: (accountId: Answerable<number>) =>
    Question.about(`the REST account details of account ${accountId}`, async (actor) => {
      const id = await actor.answer(accountId);
      const rest = CallParaBankRest.as(actor);
      const res = await rest.call((c) => c.account(id));
      if (res.status !== 200) {
        throw new Error(`GET account ${id} answered HTTP ${res.status}: ${res.text}`);
      }
      return res.json as Account;
    })
};

export const TheRestAccountBalance = {
  of: (accountId: Answerable<number>) =>
    Question.about(`the REST balance of account ${accountId}`, async (actor) => {
      const account = await actor.answer(TheRestAccount.withId(accountId));
      return account.balance;
    })
};

export const TheRestAccountCustomerId = {
  of: (accountId: Answerable<number>) =>
    Question.about(`the REST customer id of account ${accountId}`, async (actor) => {
      const account = await actor.answer(TheRestAccount.withId(accountId));
      return account.customerId;
    })
};

export const TheRestTransactions = {
  forAccount: (accountId: Answerable<number>) =>
    Question.about(`the REST transactions of account ${accountId}`, async (actor) => {
      const id = await actor.answer(accountId);
      const rest = CallParaBankRest.as(actor);
      const res = await rest.call((c) => c.transactions(id));
      if (res.status !== 200) {
        throw new Error(`GET transactions ${id} answered HTTP ${res.status}: ${res.text}`);
      }
      return res.json as Transaction[];
    })
};

export const TheRestTransactionDescriptions = {
  forAccount: (accountId: Answerable<number>) =>
    Question.about(`the REST transaction descriptions of account ${accountId}`, async (actor) => {
      const transactions = await actor.answer(TheRestTransactions.forAccount(accountId));
      return transactions.map((t) => t.description);
    })
};
