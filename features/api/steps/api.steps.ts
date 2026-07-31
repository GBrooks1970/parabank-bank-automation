import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import { PBWorld } from '../../support/world';
import { CallParaBankRest, CallParaBankSoap } from '../../../src/screenplay/abilities';
import { Login, CreateAccount, Deposit, Transfer } from '../../../src/screenplay/tasks';
import { ExerciseApprovedRestContracts } from '../../../src/screenplay/contract-tasks';
import { TheAccount, TheSoapAccount, TheTransactions, TheLastResponse } from '../../../src/screenplay/questions';
import { Account, NewAccountType } from '../../../src/api/types';
import { OPERATION_NAMES, OperationName } from '../../../src/api/operation-contracts';
import { OperationCoverageSummary } from '../../../src/api/spec-conformance';

// ---------- shared: login ----------

async function login(world: PBWorld, username: string, password: string): Promise<void> {
  await world.actor.attemptsTo(Login.withCredentials(username, password));
}

Given('John is logged in via REST with username {string} and password {string}', async function (this: PBWorld, u: string, p: string) {
  await login(this, u, p);
});

When('John logs in via REST with username {string} and password {string}', async function (this: PBWorld, u: string, p: string) {
  await login(this, u, p);
});

// ---------- reads ----------

When("customer {int}'s accounts are read via REST", async function (this: PBWorld, customerId: number) {
  await this.actor.abilityTo(CallParaBankRest).call((c) => c.accounts(customerId));
});

When('account {int} is read via REST', async function (this: PBWorld, accountId: number) {
  await this.actor.abilityTo(CallParaBankRest).call((c) => c.account(accountId));
});

When('account {int} is read via REST expecting failure', async function (this: PBWorld, accountId: number) {
  await this.actor.abilityTo(CallParaBankRest).call((c) => c.account(accountId));
});

When("account {int}'s transactions are read via REST", async function (this: PBWorld, accountId: number) {
  await this.actor.abilityTo(CallParaBankRest).call((c) => c.transactions(accountId));
});

// ---------- last-response assertions ----------

Then('the response status is {int}', async function (this: PBWorld, status: number) {
  const last = await this.actor.asks(TheLastResponse.received());
  assert.equal(last.status, status, `expected HTTP ${status}, got ${last.status}: ${last.text}`);
});

Then('the response body is the plain text {string}', async function (this: PBWorld, expected: string) {
  const last = await this.actor.asks(TheLastResponse.received());
  assert.equal(last.text, expected);
});

Then('the response body is empty', async function (this: PBWorld) {
  const last = await this.actor.asks(TheLastResponse.received());
  assert.equal(last.text, '', `expected an empty body, got: ${last.text}`);
});

// ---------- FR-B1: live-spec conformance ----------

Then('the response conforms to approved operation {word}', async function (this: PBWorld, name: string) {
  assert.ok(isOperationName(name), `unknown approved operation '${name}'`);
  const last = await this.actor.asks(TheLastResponse.received());
  PBWorld.spec.assertOperation(name, last);
});

When('the approved REST operation matrix is exercised', async function (this: PBWorld) {
  await this.actor.attemptsTo(ExerciseApprovedRestContracts.against(PBWorld.spec));
});

Then(
  'all {int} approved REST client operations have operation-aware evidence',
  function (this: PBWorld, expectedCount: number) {
    const summary = this.actor.recall<OperationCoverageSummary>('restContractCoverage');
    assert.equal(summary.expected.length, expectedCount, 'approved operation count drifted');
    assert.deepEqual(summary.missing, [], `missing operation evidence: ${summary.missing.join(', ')}`);
    console.log(`\n${PBWorld.spec.formatCoverageSummary()}\n`);
  }
);

// ---------- FR-B2: stateful flow ----------

When('he opens a new {word} account funded from account {int}', async function (this: PBWorld, type: string, fromAccountId: number) {
  const accountType = NewAccountType[type as keyof typeof NewAccountType];
  assert.notEqual(accountType, undefined, `unknown account type ${type}`);
  await this.actor.attemptsTo(CreateAccount.ofType(accountType).fundedFrom(fromAccountId));
});

Then('the new account belongs to customer {int} with type {string}', function (this: PBWorld, customerId: number, type: string) {
  const account = this.actor.recall<Account>('newAccount');
  assert.equal(account.customerId, customerId);
  assert.equal(account.type, type);
});

Then("the new account's opening balance is recorded", async function (this: PBWorld) {
  const account = this.actor.recall<Account>('newAccount');
  const fresh = await this.actor.asks(TheAccount.withId(account.id));
  this.actor.remember('trackedBalance', fresh.balance);
});

When('he deposits ${float} into the new account', async function (this: PBWorld, amount: number) {
  const account = this.actor.recall<Account>('newAccount');
  await this.actor.attemptsTo(Deposit.of(amount).into(account.id));
});

Then("the new account's balance has increased by ${float}", async function (this: PBWorld, amount: number) {
  const account = this.actor.recall<Account>('newAccount');
  const previous = this.actor.recall<number>('trackedBalance');
  const fresh = await this.actor.asks(TheAccount.withId(account.id));
  assert.equal(fresh.balance, round2(previous + amount));
  this.actor.remember('trackedBalance', fresh.balance);
});

When('he transfers ${float} from the new account to account {int}', async function (this: PBWorld, amount: number, toAccountId: number) {
  const account = this.actor.recall<Account>('newAccount');
  await this.actor.attemptsTo(Transfer.of(amount).from(account.id).to(toAccountId));
});

Then("the new account's balance has decreased by ${float}", async function (this: PBWorld, amount: number) {
  const account = this.actor.recall<Account>('newAccount');
  const previous = this.actor.recall<number>('trackedBalance');
  const fresh = await this.actor.asks(TheAccount.withId(account.id));
  assert.equal(fresh.balance, round2(previous - amount));
  this.actor.remember('trackedBalance', fresh.balance);
});

Then("the new account's transactions include a {string} and a {string}", async function (this: PBWorld, first: string, second: string) {
  const account = this.actor.recall<Account>('newAccount');
  const transactions = await this.actor.asks(TheTransactions.forAccount(account.id));
  const descriptions = transactions.map((t) => t.description);
  for (const expected of [first, second]) {
    assert.ok(
      descriptions.some((d) => d.includes(expected)),
      `no transaction description containing '${expected}' in: ${JSON.stringify(descriptions)}`
    );
  }
});

// ---------- transfers (literal accounts) ----------

When('he transfers ${float} from account {int} to account {int}', async function (this: PBWorld, amount: number, from: number, to: number) {
  await this.actor.attemptsTo(Transfer.of(amount).from(from).to(to));
});

When('he transfers {string} from account {int} to account {int}', async function (this: PBWorld, amount: string, from: number, to: number) {
  await this.actor.attemptsTo(Transfer.of(amount).from(from).to(to));
});

Given('the seeded balance of account {int} is recorded', async function (this: PBWorld, accountId: number) {
  const account = await this.actor.asks(TheAccount.withId(accountId));
  this.actor.remember('seededBalance', account.balance);
  this.actor.remember('seededBalanceAccountId', accountId);
});

Then("account {int}'s balance is now negative", async function (this: PBWorld, accountId: number) {
  const account = await this.actor.asks(TheAccount.withId(accountId));
  assert.ok(account.balance < 0, `expected a negative balance, got ${account.balance}`);
});

// ---------- FR-B3: parity ----------

When('account {int} is read via REST and via SOAP', async function (this: PBWorld, accountId: number) {
  this.actor.remember('restRead', await this.actor.asks(TheAccount.withId(accountId)));
  this.actor.remember('soapRead', await this.actor.asks(TheSoapAccount.withId(accountId)));
});

Then('both reads agree on id, customerId, type, and balance', function (this: PBWorld) {
  const rest = this.actor.recall<Account>('restRead');
  const soap = this.actor.recall<Account>('soapRead');
  assert.deepEqual(
    { id: soap.id, customerId: soap.customerId, type: soap.type, balance: soap.balance },
    { id: rest.id, customerId: rest.customerId, type: rest.type, balance: rest.balance }
  );
});

Then('the agreed balance is ${float} higher than the seeded balance', function (this: PBWorld, amount: number) {
  const rest = this.actor.recall<Account>('restRead');
  const seeded = this.actor.recall<number>('seededBalance');
  assert.equal(rest.balance, round2(seeded + amount));
});

// ---------- FR-B4: SOAP fault path ----------

When('a SOAP getAccount call is made for account {int} with unqualified parameters', async function (this: PBWorld, accountId: number) {
  await this.actor.abilityTo(CallParaBankSoap).call('getAccount', { accountId }, { qualifyParams: false });
});

Then('the SOAP response status is {int}', function (this: PBWorld, status: number) {
  assert.equal(this.actor.abilityTo(CallParaBankSoap).last.status, status);
});

Then('the SOAP fault mentions {string}', function (this: PBWorld, text: string) {
  const fault = this.actor.abilityTo(CallParaBankSoap).last.fault ?? '(no fault)';
  assert.ok(fault.includes(text), `fault '${fault}' does not mention '${text}'`);
});

// Money arithmetic on two-decimal amounts (avoids IEEE noise in expected values).
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isOperationName(value: string): value is OperationName {
  return (OPERATION_NAMES as readonly string[]).includes(value);
}
