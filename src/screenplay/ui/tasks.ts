import { Task, Wait } from '@serenity-js/core';
import { Click, Enter, isVisible, Navigate, Select } from '@serenity-js/web';
import { isPresent } from '@serenity-js/assertions';
import {
  BillPayPage,
  LoanPage,
  LoginForm,
  NavPanel,
  OpenAccountPage,
  RegisterPage,
  TransferPage
} from './pages';

/** Details for FR-A1 registration; generated per run by the steps (test-data policy §5.8). */
export interface NewCustomerDetails {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  ssn: string;
  username: string;
  password: string;
}

export const StartOnHomePage = (): Task =>
  Task.where('#actor starts on the ParaBank home page', Navigate.to('/parabank/index.htm'));

export const LogInAs = (username: string, password: string): Task =>
  Task.where(
    `#actor logs in as ${username}`,
    Enter.theValue(username).into(LoginForm.username),
    Enter.theValue(password).into(LoginForm.password),
    Click.on(LoginForm.logInButton),
    Wait.until(NavPanel.welcome, isVisible())
  );

export const LogOut = (): Task =>
  Task.where(
    '#actor logs out',
    Click.on(NavPanel.logOutLink),
    Wait.until(LoginForm.username, isVisible())
  );

export const RegisterCustomer = (details: NewCustomerDetails): Task =>
  Task.where(
    `#actor registers as ${details.username}`,
    Navigate.to('/parabank/register.htm'),
    Enter.theValue(details.firstName).into(RegisterPage.field('customer.firstName')),
    Enter.theValue(details.lastName).into(RegisterPage.field('customer.lastName')),
    Enter.theValue(details.street).into(RegisterPage.field('customer.address.street')),
    Enter.theValue(details.city).into(RegisterPage.field('customer.address.city')),
    Enter.theValue(details.state).into(RegisterPage.field('customer.address.state')),
    Enter.theValue(details.zipCode).into(RegisterPage.field('customer.address.zipCode')),
    Enter.theValue(details.phoneNumber).into(RegisterPage.field('customer.phoneNumber')),
    Enter.theValue(details.ssn).into(RegisterPage.field('customer.ssn')),
    Enter.theValue(details.username).into(RegisterPage.field('customer.username')),
    Enter.theValue(details.password).into(RegisterPage.field('customer.password')),
    Enter.theValue(details.password).into(RegisterPage.field('repeatedPassword')),
    Click.on(RegisterPage.registerButton),
    Wait.until(NavPanel.welcome, isVisible())
  );

export const OpenNewAccount = (type: 'CHECKING' | 'SAVINGS', fromAccountId: number): Task =>
  Task.where(
    `#actor opens a new ${type} account funded from ${fromAccountId}`,
    Navigate.to('/parabank/openaccount.htm'),
    // The funding select is populated asynchronously — wait for the concrete option
    // (isPresent, not isVisible: <option> elements report as not-visible).
    Wait.until(OpenAccountPage.fromAccountOption(fromAccountId), isPresent()),
    Select.option(type).from(OpenAccountPage.typeSelect),
    Select.value(String(fromAccountId)).from(OpenAccountPage.fromAccountSelect),
    Click.on(OpenAccountPage.openButton),
    Wait.until(OpenAccountPage.result, isVisible())
  );

export const TransferFundsUI = (amount: number, fromAccountId: number, toAccountId: number): Task =>
  Task.where(
    `#actor transfers $${amount} from ${fromAccountId} to ${toAccountId}`,
    Navigate.to('/parabank/transfer.htm'),
    Wait.until(TransferPage.fromOption(fromAccountId), isPresent()),
    Enter.theValue(String(amount)).into(TransferPage.amount),
    Select.value(String(fromAccountId)).from(TransferPage.fromSelect),
    Select.value(String(toAccountId)).from(TransferPage.toSelect),
    Click.on(TransferPage.transferButton),
    Wait.until(TransferPage.result, isVisible())
  );

export const PayBill = (payeeName: string, amount: number, fromAccountId: number): Task =>
  Task.where(
    `#actor pays a $${amount} bill to ${payeeName} from ${fromAccountId}`,
    Navigate.to('/parabank/billpay.htm'),
    Wait.until(BillPayPage.fromOption(fromAccountId), isPresent()),
    Enter.theValue(payeeName).into(BillPayPage.payeeField('payee.name')),
    Enter.theValue('12 Ledger Lane').into(BillPayPage.payeeField('payee.address.street')),
    Enter.theValue('Booksville').into(BillPayPage.payeeField('payee.address.city')),
    Enter.theValue('CA').into(BillPayPage.payeeField('payee.address.state')),
    Enter.theValue('90001').into(BillPayPage.payeeField('payee.address.zipCode')),
    Enter.theValue('310-555-0100').into(BillPayPage.payeeField('payee.phoneNumber')),
    Enter.theValue('12345').into(BillPayPage.payeeField('payee.accountNumber')),
    Enter.theValue('12345').into(BillPayPage.payeeField('verifyAccount')),
    Enter.theValue(String(amount)).into(BillPayPage.amount),
    Select.value(String(fromAccountId)).from(BillPayPage.fromSelect),
    Click.on(BillPayPage.sendButton),
    Wait.until(BillPayPage.result, isVisible())
  );

export const RequestLoanUI = (amount: number, downPayment: number, fromAccountId: number): Task =>
  Task.where(
    `#actor requests a $${amount} loan with $${downPayment} down`,
    Navigate.to('/parabank/requestloan.htm'),
    Wait.until(LoanPage.fromOption(fromAccountId), isPresent()),
    Enter.theValue(String(amount)).into(LoanPage.amount),
    Enter.theValue(String(downPayment)).into(LoanPage.downPayment),
    Select.value(String(fromAccountId)).from(LoanPage.fromSelect),
    Click.on(LoanPage.applyButton),
    Wait.until(LoanPage.result, isVisible())
  );
