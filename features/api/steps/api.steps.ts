import { Given, When, Then } from '@cucumber/cucumber';
import { PBWorld } from '../../support/world';
import {
  CallSoapGetAccount,
  CreateAccount,
  Deposit,
  DepositIntoNewAccount,
  Login,
  ReadAccount,
  ReadAccounts,
  ReadAccountViaRestAndSoap,
  ReadTransactions,
  RecordOpeningBalance,
  RecordSeededBalance,
  Transfer,
  TransferBoundaryAmount,
  TransferFromNewAccount,
  VerifyAccountBalance,
  VerifyAgreedBalance,
  VerifyBoundaryTransfer,
  VerifyContractCoverage,
  VerifyNewAccount,
  VerifyOperationConformance,
  VerifyResponse,
  VerifyRestAndSoapParity,
  VerifySoapResponse,
  VerifyTransactions
} from '../../../src/screenplay/tasks';
import { ExerciseApprovedRestContracts } from '../../../src/screenplay/contract-tasks';

// ---------- shared: login ----------

Given('John is logged in via REST with username {string} and password {string}', async function (this: PBWorld, u: string, p: string) {
  await this.actor.attemptsTo(Login.withCredentials(u, p));
});

When('John logs in via REST with username {string} and password {string}', async function (this: PBWorld, u: string, p: string) {
  await this.actor.attemptsTo(Login.withCredentials(u, p));
});

// ---------- reads ----------

When("customer {int}'s accounts are read via REST", async function (this: PBWorld, customerId: number) {
  await this.actor.attemptsTo(ReadAccounts.ofCustomer(customerId));
});

When(/^account (\d+) is read via REST(?: expecting failure)?$/, async function (this: PBWorld, accountId: string) {
  await this.actor.attemptsTo(ReadAccount.withId(Number(accountId)));
});

When("account {int}'s transactions are read via REST", async function (this: PBWorld, accountId: number) {
  await this.actor.attemptsTo(ReadTransactions.ofAccount(accountId));
});

// ---------- last-response assertions ----------

Then('the response status is {int}', async function (this: PBWorld, status: number) {
  await this.actor.attemptsTo(VerifyResponse.hasStatus(status));
});

Then('the response body is the plain text {string}', async function (this: PBWorld, expected: string) {
  await this.actor.attemptsTo(VerifyResponse.hasPlainTextBody(expected));
});

Then('the response body is empty', async function (this: PBWorld) {
  await this.actor.attemptsTo(VerifyResponse.hasEmptyBody());
});

// ---------- FR-B1: live-spec conformance ----------

Then('the response conforms to approved operation {word}', async function (this: PBWorld, name: string) {
  await this.actor.attemptsTo(VerifyOperationConformance.forSpec(PBWorld.spec).conformsTo(name));
});

When('the approved REST operation matrix is exercised', async function (this: PBWorld) {
  await this.actor.attemptsTo(ExerciseApprovedRestContracts.against(PBWorld.spec));
});

Then('all {int} approved REST client operations have operation-aware evidence', async function (this: PBWorld, expectedCount: number) {
  await this.actor.attemptsTo(VerifyContractCoverage.forSpec(PBWorld.spec).hasExpectedCount(expectedCount));
});

// ---------- FR-B2: stateful flow ----------

When('he opens a new {word} account funded from account {int}', async function (this: PBWorld, type: string, fromAccountId: number) {
  await this.actor.attemptsTo(CreateAccount.ofTypeNamed(type).fundedFrom(fromAccountId));
});

Then('the new account belongs to customer {int} with type {string}', async function (this: PBWorld, customerId: number, type: string) {
  await this.actor.attemptsTo(VerifyNewAccount.belongsTo(customerId, type));
});

Then("the new account's opening balance is recorded", async function (this: PBWorld) {
  await this.actor.attemptsTo(RecordOpeningBalance.ofNewAccount());
});

When('he deposits ${float} into the new account', async function (this: PBWorld, amount: number) {
  await this.actor.attemptsTo(DepositIntoNewAccount.of(amount));
});

Then("the new account's balance has increased by ${float}", async function (this: PBWorld, amount: number) {
  await this.actor.attemptsTo(VerifyAccountBalance.hasIncreasedBy(amount));
});

When('he transfers ${float} from the new account to account {int}', async function (this: PBWorld, amount: number, toAccountId: number) {
  await this.actor.attemptsTo(TransferFromNewAccount.of(amount).to(toAccountId));
});

Then("the new account's balance has decreased by ${float}", async function (this: PBWorld, amount: number) {
  await this.actor.attemptsTo(VerifyAccountBalance.hasDecreasedBy(amount));
});

Then("the new account's transactions include a {string} and a {string}", async function (this: PBWorld, first: string, second: string) {
  await this.actor.attemptsTo(VerifyTransactions.forNewAccount().includeDescriptions(first, second));
});

// ---------- transfers (literal accounts) ----------

When('he transfers the {string} amount boundary from account {int} to account {int}', async function (this: PBWorld, boundaryName: string, from: number, to: number) {
  await this.actor.attemptsTo(TransferBoundaryAmount.of(boundaryName).from(from).to(to));
});

Then('the boundary transfer succeeds and both balances change by the resolved amount', async function (this: PBWorld) {
  await this.actor.attemptsTo(VerifyBoundaryTransfer.succeeded());
});

When('he transfers ${float} from account {int} to account {int}', async function (this: PBWorld, amount: number, from: number, to: number) {
  await this.actor.attemptsTo(Transfer.of(amount).from(from).to(to));
});

When('he transfers {string} from account {int} to account {int}', async function (this: PBWorld, amount: string, from: number, to: number) {
  await this.actor.attemptsTo(Transfer.of(amount).from(from).to(to));
});

Given('the seeded balance of account {int} is recorded', async function (this: PBWorld, accountId: number) {
  await this.actor.attemptsTo(RecordSeededBalance.ofAccount(accountId));
});

Then("account {int}'s balance is now negative", async function (this: PBWorld, accountId: number) {
  await this.actor.attemptsTo(VerifyAccountBalance.isNegative(accountId));
});

// ---------- FR-B3: parity ----------

When('account {int} is read via REST and via SOAP', async function (this: PBWorld, accountId: number) {
  await this.actor.attemptsTo(ReadAccountViaRestAndSoap.withId(accountId));
});

Then('both reads agree on id, customerId, type, and balance', async function (this: PBWorld) {
  await this.actor.attemptsTo(VerifyRestAndSoapParity.agreed());
});

Then('the agreed balance is ${float} higher than the seeded balance', async function (this: PBWorld, amount: number) {
  await this.actor.attemptsTo(VerifyAgreedBalance.isHigherThanSeededBy(amount));
});

// ---------- FR-B4: SOAP fault path ----------

When('a SOAP getAccount call is made for account {int} with unqualified parameters', async function (this: PBWorld, accountId: number) {
  await this.actor.attemptsTo(CallSoapGetAccount.withUnqualifiedParameters(accountId));
});

Then('the SOAP response status is {int}', async function (this: PBWorld, status: number) {
  await this.actor.attemptsTo(VerifySoapResponse.hasStatus(status));
});

Then('the SOAP fault mentions {string}', async function (this: PBWorld, text: string) {
  await this.actor.attemptsTo(VerifySoapResponse.faultMentions(text));
});
