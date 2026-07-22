import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled, Wait } from '@serenity-js/core';
import { Ensure, includes, equals } from '@serenity-js/assertions';
import { isVisible } from '@serenity-js/web';
import { PBWorld } from '../../support/world';
import { CallParaBankRest } from '../../../src/screenplay/abilities';
import { TheAccount, TheTransactions } from '../../../src/screenplay/questions';
import { Account } from '../../../src/api/types';
import {
  LogInAs,
  LogOut,
  NewCustomerDetails,
  OpenNewAccount,
  PayBill,
  RegisterCustomer,
  RequestLoanUI,
  StartOnHomePage,
  TransferFundsUI
} from '../../../src/screenplay/ui/tasks';
import { LoanPage } from '../../../src/screenplay/ui/pages';
import {
  TheBillPayResultText,
  TheContentTitle,
  TheLoanStatus,
  TheNewAccountId,
  TheNewLoanAccountId,
  TheOverviewTableText,
  TheTransferResultText,
  TheWelcomeMessage
} from '../../../src/screenplay/ui/questions';

const paula = () => actorCalled('Paula');
const round2 = (n: number): number => Math.round(n * 100) / 100;

// ---------- navigation and login ----------

Given('Paula is on the ParaBank home page', async function (this: PBWorld) {
  await paula().attemptsTo(StartOnHomePage());
});

When('she logs in through the UI as {string} with password {string}', async function (this: PBWorld, u: string, p: string) {
  await paula().attemptsTo(LogInAs(u, p));
});

Then('the overview greets {string}', async function (this: PBWorld, name: string) {
  await paula().attemptsTo(Ensure.that(TheWelcomeMessage(), includes(name)));
});

Then('the accounts overview lists account {int}', async function (this: PBWorld, accountId: number) {
  await paula().attemptsTo(Ensure.that(TheOverviewTableText(), includes(String(accountId))));
});

// ---------- FR-A1 registration ----------

When('she registers a new customer with generated unique details', async function (this: PBWorld) {
  const suffix = Date.now().toString(36);
  const details: NewCustomerDetails = {
    firstName: 'Paula',
    lastName: `Newby-${suffix}`,
    street: '4 Screenplay Street',
    city: 'Testington',
    state: 'CA',
    zipCode: '90210',
    phoneNumber: '310-555-0199',
    ssn: '999-99-9999',
    username: `pb-${suffix}`,
    password: 'S3curePass!'
  };
  this.actor.remember('registration', details);
  await paula().attemptsTo(RegisterCustomer(details));
});

Then('the registration confirmation greets the new username', async function (this: PBWorld) {
  const details = this.actor.recall<NewCustomerDetails>('registration');
  await paula().attemptsTo(Ensure.that(TheContentTitle(), includes(details.username)));
});

When('she logs out', async function (this: PBWorld) {
  await paula().attemptsTo(LogOut());
});

When('she logs in through the UI with the newly registered credentials', async function (this: PBWorld) {
  const details = this.actor.recall<NewCustomerDetails>('registration');
  await paula().attemptsTo(LogInAs(details.username, details.password));
});

Then("the overview greets the new customer's full name", async function (this: PBWorld) {
  const details = this.actor.recall<NewCustomerDetails>('registration');
  await paula().attemptsTo(Ensure.that(TheWelcomeMessage(), includes(`${details.firstName} ${details.lastName}`)));
});

// ---------- REST baselines (cross-check preparation) ----------

Given('the REST balance of account {int} is recorded as the funding baseline', async function (this: PBWorld, accountId: number) {
  const account = await this.actor.asks(TheAccount.withId(accountId));
  this.actor.remember('fundingBaseline', account.balance);
});

Given('the REST balances of accounts {int} and {int} are recorded', async function (this: PBWorld, a: number, b: number) {
  this.actor.remember(`baseline:${a}`, (await this.actor.asks(TheAccount.withId(a))).balance);
  this.actor.remember(`baseline:${b}`, (await this.actor.asks(TheAccount.withId(b))).balance);
});

// ---------- FR-A2 open account ----------

When('she opens a new {string} account funded from account {int} through the UI', async function (this: PBWorld, type: string, from: number) {
  await paula().attemptsTo(OpenNewAccount(type as 'CHECKING' | 'SAVINGS', from));
});

Then('the UI confirms the new account and its id is captured', async function (this: PBWorld) {
  const idText = await paula().answer(TheNewAccountId());
  const newAccountId = Number(idText);
  assert.ok(Number.isInteger(newAccountId) && newAccountId > 0, `new account id not numeric: '${idText}'`);
  this.actor.remember('uiNewAccountId', newAccountId);
});

Then('via REST the new account belongs to customer {int} with a positive opening balance', async function (this: PBWorld, customerId: number) {
  const account = await this.actor.asks(TheAccount.withId(this.actor.recall<number>('uiNewAccountId')));
  assert.equal(account.customerId, customerId);
  assert.ok(account.balance > 0, `opening balance not positive: ${account.balance}`);
  this.actor.remember('uiNewAccountBalance', account.balance);
});

Then("via REST the funding account {int} decreased by exactly the new account's opening balance", async function (this: PBWorld, fundingId: number) {
  const funding = await this.actor.asks(TheAccount.withId(fundingId));
  const baseline = this.actor.recall<number>('fundingBaseline');
  const openingBalance = this.actor.recall<number>('uiNewAccountBalance');
  assert.equal(funding.balance, round2(baseline - openingBalance));
});

// ---------- FR-A3 transfer ----------

When('she transfers ${float} from account {int} to account {int} through the UI', async function (this: PBWorld, amount: number, from: number, to: number) {
  await paula().attemptsTo(TransferFundsUI(amount, from, to));
});

Then('the UI confirms the transfer of ${float}', async function (this: PBWorld, amount: number) {
  await paula().attemptsTo(
    Ensure.that(TheTransferResultText(), includes('Transfer Complete')),
    Ensure.that(TheTransferResultText(), includes(String(Math.trunc(amount))))
  );
});

Then('via REST account {int} decreased by ${float} and account {int} increased by ${float}', async function (this: PBWorld, a: number, dec: number, b: number, inc: number) {
  const accountA = await this.actor.asks(TheAccount.withId(a));
  const accountB = await this.actor.asks(TheAccount.withId(b));
  assert.equal(accountA.balance, round2(this.actor.recall<number>(`baseline:${a}`) - dec));
  assert.equal(accountB.balance, round2(this.actor.recall<number>(`baseline:${b}`) + inc));
});

Then('via REST account {int} has a {string} transaction and account {int} a {string} one', async function (this: PBWorld, a: number, descA: string, b: number, descB: string) {
  const hasDescription = (transactions: { description: string }[], expected: string) =>
    transactions.some((t) => t.description.includes(expected));
  assert.ok(hasDescription(await this.actor.asks(TheTransactions.forAccount(a)), descA), `account ${a}: no '${descA}' transaction`);
  assert.ok(hasDescription(await this.actor.asks(TheTransactions.forAccount(b)), descB), `account ${b}: no '${descB}' transaction`);
});

// ---------- FR-A4 bill pay ----------

When('she pays a bill of ${float} to a generated payee from account {int} through the UI', async function (this: PBWorld, amount: number, from: number) {
  const payeeName = `Payee-${Date.now().toString(36)}`;
  this.actor.remember('payeeName', payeeName);
  this.actor.remember('billAmount', amount);
  await paula().attemptsTo(PayBill(payeeName, amount, from));
});

Then('the UI confirms the bill payment of ${float} to that payee', async function (this: PBWorld, amount: number) {
  const payeeName = this.actor.recall<string>('payeeName');
  await paula().attemptsTo(
    Ensure.that(TheBillPayResultText(), includes('Bill Payment Complete')),
    Ensure.that(TheBillPayResultText(), includes(String(Math.trunc(amount))))
  );
});

Then('via REST the funding account {int} decreased by exactly ${float}', async function (this: PBWorld, fundingId: number, amount: number) {
  const funding = await this.actor.asks(TheAccount.withId(fundingId));
  assert.equal(funding.balance, round2(this.actor.recall<number>('fundingBaseline') - amount));
});

Then('via REST account {int} has a {string} transaction naming that payee', async function (this: PBWorld, accountId: number, description: string) {
  const payeeName = this.actor.recall<string>('payeeName');
  const transactions = await this.actor.asks(TheTransactions.forAccount(accountId));
  assert.ok(
    transactions.some((t) => t.description.includes(description) && t.description.includes(payeeName)),
    `account ${accountId}: no '${description} … ${payeeName}' transaction in ${JSON.stringify(transactions.map((t) => t.description))}`
  );
});

// ---------- FR-A5 loan ----------

Given('the loan decision environment is pinned to the local down-payment processor at 20 percent', async function (this: PBWorld) {
  const rest = this.actor.abilityTo(CallParaBankRest);
  for (const [name, value] of [
    ['loanProvider', 'local'],
    ['loanProcessor', 'down'],
    ['loanProcessorThreshold', '20']
  ] as const) {
    const res = await rest.call((c) => c.setParameter(name, value));
    assert.ok(res.status === 200 || res.status === 204, `setParameter ${name}=${value} → HTTP ${res.status}: ${res.text}`);
  }
});

When('she requests a loan of ${float} with a down payment of ${float} from account {int} through the UI', async function (this: PBWorld, amount: number, down: number, from: number) {
  await paula().attemptsTo(RequestLoanUI(amount, down, from));
});

Then('the UI shows the loan decision {string}', async function (this: PBWorld, decision: string) {
  await paula().attemptsTo(Ensure.that(TheLoanStatus(), equals(decision)));
});

Then('the UI shows a new loan account id', async function (this: PBWorld) {
  await paula().attemptsTo(Wait.until(LoanPage.approvedSection, isVisible()));
  const idText = await paula().answer(TheNewLoanAccountId());
  assert.ok(/^\d+$/.test(idText.trim()), `new loan account id not numeric: '${idText}'`);
});
