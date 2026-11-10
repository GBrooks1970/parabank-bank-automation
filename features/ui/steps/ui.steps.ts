import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled, Wait } from '@serenity-js/core';
import {
  and,
  containAtLeastOneItemThat,
  Ensure,
  equals,
  includes,
  isGreaterThan,
  isPresent,
  matches
} from '@serenity-js/assertions';
import { isVisible } from '@serenity-js/web';
import { PBWorld } from '../../support/world';
import { formatCurrency } from '../../../src/quality/currency';
import { theNotes } from '../../../src/screenplay/ui/notes';
import {
  LogInAs,
  LogOut,
  NewCustomerDetails,
  OpenNewAccount,
  PayBill,
  PinTheLoanEnvironment,
  RegisterCustomer,
  RequestLoanUI,
  StartOnHomePage,
  TransferFundsUI
} from '../../../src/screenplay/ui/tasks';
import { LoanPage, OverviewPage } from '../../../src/screenplay/ui/pages';
import {
  TheBillPayResultAmount,
  TheBillPayResultText,
  TheContentTitle,
  TheLoanStatus,
  TheNewAccountId,
  TheNewLoanAccountId,
  TheOverviewTableText,
  TheRestAccountBalance,
  TheRestAccountCustomerId,
  TheRestTransactionDescriptions,
  TheTransferResultAmount,
  TheTransferResultText,
  TheWelcomeMessage
} from '../../../src/screenplay/ui/questions';

const paula = () => actorCalled('Paula');
const round2 = (n: number): number => Math.round(n * 100) / 100;
const SEEDED_PASSWORD = 'demo';

// ---------- navigation and login ----------

Given('Paula is on the ParaBank home page', async function (this: PBWorld) {
  await paula().attemptsTo(StartOnHomePage());
});

When('she logs in through the UI as {string} using the seeded password', async function (this: PBWorld, username: string) {
  await paula().attemptsTo(LogInAs(username, SEEDED_PASSWORD));
});

Then('the overview greets {string}', async function (this: PBWorld, name: string) {
  await paula().attemptsTo(Ensure.that(TheWelcomeMessage(), includes(name)));
});

Then('the accounts overview lists account {int}', async function (this: PBWorld, accountId: number) {
  // The overview's rows are fetched client-side AFTER the welcome message renders, so the
  // login task's wait does not imply they exist yet. Without this wait the assertion reads the
  // server-rendered empty <tbody> and fails intermittently (PBR-07).
  await paula().attemptsTo(
    Wait.until(OverviewPage.accountRow(accountId), isPresent()),
    Ensure.that(TheOverviewTableText(), includes(String(accountId)))
  );
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
  await paula().attemptsTo(theNotes().set('registration', details), RegisterCustomer(details));
});

Then('the registration confirmation greets the new username', async function (this: PBWorld) {
  const details = await paula().answer(theNotes().get('registration'));
  await paula().attemptsTo(Ensure.that(TheContentTitle(), includes(details.username)));
});

When('she logs out', async function (this: PBWorld) {
  await paula().attemptsTo(LogOut());
});

When('she logs in through the UI with the newly registered credentials', async function (this: PBWorld) {
  const details = await paula().answer(theNotes().get('registration'));
  await paula().attemptsTo(LogInAs(details.username, details.password));
});

Then("the overview greets the new customer's full name", async function (this: PBWorld) {
  const details = await paula().answer(theNotes().get('registration'));
  await paula().attemptsTo(Ensure.that(TheWelcomeMessage(), includes(`${details.firstName} ${details.lastName}`)));
});

// ---------- REST baselines (cross-check preparation) ----------

Given('the REST balance of account {int} is recorded as the funding baseline', async function (this: PBWorld, accountId: number) {
  await paula().attemptsTo(theNotes().set('fundingBaseline', TheRestAccountBalance.of(accountId)));
});

Given('the REST balances of accounts {int} and {int} are recorded', async function (this: PBWorld, a: number, b: number) {
  await paula().attemptsTo(
    theNotes().set(`baseline:${a}`, TheRestAccountBalance.of(a)),
    theNotes().set(`baseline:${b}`, TheRestAccountBalance.of(b))
  );
});

// ---------- FR-A2 open account ----------

When('she opens a new {string} account funded from account {int} through the UI', async function (this: PBWorld, type: string, from: number) {
  await paula().attemptsTo(OpenNewAccount(type as 'CHECKING' | 'SAVINGS', from));
});

Then('the UI confirms the new account and its id is captured', async function (this: PBWorld) {
  const idText = await paula().answer(TheNewAccountId());
  await paula().attemptsTo(
    Ensure.that(TheNewAccountId(), matches(/^\d+$/)),
    theNotes().set('uiNewAccountId', Number(idText.trim()))
  );
});

Then('via REST the new account belongs to customer {int} with a positive opening balance', async function (this: PBWorld, customerId: number) {
  const newAccountId = await paula().answer(theNotes().get('uiNewAccountId'));
  const balance = await paula().answer(TheRestAccountBalance.of(newAccountId));
  await paula().attemptsTo(
    Ensure.that(TheRestAccountCustomerId.of(newAccountId), equals(customerId)),
    Ensure.that(TheRestAccountBalance.of(newAccountId), isGreaterThan(0)),
    theNotes().set('uiNewAccountBalance', balance)
  );
});

Then("via REST the funding account {int} decreased by exactly the new account's opening balance", async function (this: PBWorld, fundingId: number) {
  const baseline = await paula().answer(theNotes().get('fundingBaseline'));
  const openingBalance = await paula().answer(theNotes().get('uiNewAccountBalance'));
  await paula().attemptsTo(
    Ensure.that(TheRestAccountBalance.of(fundingId), equals(round2(baseline - openingBalance)))
  );
});

// ---------- FR-A3 transfer ----------

When('she transfers ${float} from account {int} to account {int} through the UI', async function (this: PBWorld, amount: number, from: number, to: number) {
  await paula().attemptsTo(TransferFundsUI(amount, from, to));
});

Then('the UI confirms the transfer of ${float}', async function (this: PBWorld, amount: number) {
  await paula().attemptsTo(
    Ensure.that(TheTransferResultText(), includes('Transfer Complete')),
    Ensure.that(TheTransferResultAmount(), equals(formatCurrency(amount)))
  );
});

Then('via REST account {int} decreased by ${float} and account {int} increased by ${float}', async function (this: PBWorld, a: number, dec: number, b: number, inc: number) {
  const baselineA = await paula().answer(theNotes().get(`baseline:${a}`));
  const baselineB = await paula().answer(theNotes().get(`baseline:${b}`));
  await paula().attemptsTo(
    Ensure.that(TheRestAccountBalance.of(a), equals(round2(baselineA - dec))),
    Ensure.that(TheRestAccountBalance.of(b), equals(round2(baselineB + inc)))
  );
});

Then('via REST account {int} has a {string} transaction and account {int} a {string} one', async function (this: PBWorld, a: number, descA: string, b: number, descB: string) {
  await paula().attemptsTo(
    Ensure.that(TheRestTransactionDescriptions.forAccount(a), containAtLeastOneItemThat(includes(descA))),
    Ensure.that(TheRestTransactionDescriptions.forAccount(b), containAtLeastOneItemThat(includes(descB)))
  );
});

// ---------- FR-A4 bill pay ----------

When('she pays a bill of ${float} to a generated payee from account {int} through the UI', async function (this: PBWorld, amount: number, from: number) {
  const payeeName = `Payee-${Date.now().toString(36)}`;
  await paula().attemptsTo(
    theNotes().set('payeeName', payeeName),
    theNotes().set('billAmount', amount),
    PayBill(payeeName, amount, from)
  );
});

Then('the UI confirms the bill payment completed for ${float}', async function (this: PBWorld, amount: number) {
  await paula().attemptsTo(
    Ensure.that(TheBillPayResultText(), includes('Bill Payment Complete')),
    Ensure.that(TheBillPayResultAmount(), equals(formatCurrency(amount)))
  );
});

Then('via REST the funding account {int} decreased by exactly ${float}', async function (this: PBWorld, fundingId: number, amount: number) {
  const baseline = await paula().answer(theNotes().get('fundingBaseline'));
  await paula().attemptsTo(
    Ensure.that(TheRestAccountBalance.of(fundingId), equals(round2(baseline - amount)))
  );
});

Then('via REST account {int} has a {string} transaction naming that payee', async function (this: PBWorld, accountId: number, description: string) {
  const payeeName = await paula().answer(theNotes().get('payeeName'));
  await paula().attemptsTo(
    Ensure.that(
      TheRestTransactionDescriptions.forAccount(accountId),
      containAtLeastOneItemThat(and(includes(description), includes(payeeName)))
    )
  );
});

// ---------- FR-A5 loan ----------

Given('the loan decision environment is pinned to the local down-payment processor at 20 percent', async function (this: PBWorld) {
  await paula().attemptsTo(PinTheLoanEnvironment());
});

When('she requests a loan of ${float} with a down payment of ${float} from account {int} through the UI', async function (this: PBWorld, amount: number, down: number, from: number) {
  await paula().attemptsTo(RequestLoanUI(amount, down, from));
});

Then('the UI shows the loan decision {string}', async function (this: PBWorld, decision: string) {
  await paula().attemptsTo(Ensure.that(TheLoanStatus(), equals(decision)));
});

Then('the UI shows a new loan account id', async function (this: PBWorld) {
  await paula().attemptsTo(
    Wait.until(LoanPage.approvedSection, isVisible()),
    Ensure.that(TheNewLoanAccountId(), matches(/^\d+$/))
  );
});
