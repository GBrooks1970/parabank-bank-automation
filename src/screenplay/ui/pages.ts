import { By, PageElement } from '@serenity-js/web';

/**
 * Lane A page targets. Selector norms (orangehrm lessons, design doc §5.1): no `:has()`;
 * content selectors scoped to #rightPanel where the left login panel would collide;
 * async-populated <select>s are waited on via their concrete <option> (isPresent).
 * All ids/names verified against the pinned SUT's JSPs (target-app/…/WEB-INF/jsp).
 */

export const LoginForm = {
  username: PageElement.located(By.css('input[name="username"]')).describedAs('username field'),
  password: PageElement.located(By.css('input[name="password"]')).describedAs('password field'),
  logInButton: PageElement.located(By.css('input[type="submit"][value="Log In"]')).describedAs('Log In button')
};

export const NavPanel = {
  welcome: PageElement.located(By.css('#leftPanel .smallText')).describedAs('welcome message'),
  logOutLink: PageElement.located(By.css('a[href*="logout.htm"]')).describedAs('Log Out link')
};

export const RightPanel = {
  panel: PageElement.located(By.id('rightPanel')).describedAs('content panel'),
  title: PageElement.located(By.css('#rightPanel .title')).describedAs('content title')
};

export const RegisterPage = {
  field: (name: string) =>
    PageElement.located(By.css(`input[name="${name}"]`)).describedAs(`${name} field`),
  registerButton: PageElement.located(By.css('#rightPanel input[type="submit"]')).describedAs('Register button')
};

export const OverviewPage = {
  accountTable: PageElement.located(By.id('accountTable')).describedAs('accounts overview table')
};

export const OpenAccountPage = {
  typeSelect: PageElement.located(By.id('type')).describedAs('account type select'),
  fromAccountSelect: PageElement.located(By.id('fromAccountId')).describedAs('funding account select'),
  fromAccountOption: (accountId: number) =>
    PageElement.located(By.css(`#fromAccountId option[value="${accountId}"]`)).describedAs(`funding option ${accountId}`),
  openButton: PageElement.located(By.css('#rightPanel input.button')).describedAs('Open New Account button'),
  result: PageElement.located(By.id('openAccountResult')).describedAs('open account result'),
  newAccountId: PageElement.located(By.css('#openAccountResult #newAccountId')).describedAs('new account id link')
};

export const TransferPage = {
  amount: PageElement.located(By.id('amount')).describedAs('transfer amount field'),
  fromSelect: PageElement.located(By.css('#transferForm #fromAccountId')).describedAs('from account select'),
  toSelect: PageElement.located(By.css('#transferForm #toAccountId')).describedAs('to account select'),
  fromOption: (accountId: number) =>
    PageElement.located(By.css(`#transferForm #fromAccountId option[value="${accountId}"]`)).describedAs(`from option ${accountId}`),
  transferButton: PageElement.located(By.css('#rightPanel input.button')).describedAs('Transfer button'),
  result: PageElement.located(By.id('showResult')).describedAs('transfer result')
};

export const BillPayPage = {
  payeeField: (name: string) =>
    PageElement.located(By.css(`input[name="${name}"]`)).describedAs(`${name} field`),
  amount: PageElement.located(By.css('input[name="amount"]')).describedAs('bill amount field'),
  fromSelect: PageElement.located(By.css('select[name="fromAccountId"]')).describedAs('from account select'),
  fromOption: (accountId: number) =>
    PageElement.located(By.css(`select[name="fromAccountId"] option[value="${accountId}"]`)).describedAs(`from option ${accountId}`),
  sendButton: PageElement.located(By.css('#rightPanel input.button')).describedAs('Send Payment button'),
  result: PageElement.located(By.id('billpayResult')).describedAs('bill payment result')
};

export const LoanPage = {
  amount: PageElement.located(By.id('amount')).describedAs('loan amount field'),
  downPayment: PageElement.located(By.id('downPayment')).describedAs('down payment field'),
  fromOption: (accountId: number) =>
    PageElement.located(By.css(`#fromAccountId option[value="${accountId}"]`)).describedAs(`from option ${accountId}`),
  fromSelect: PageElement.located(By.id('fromAccountId')).describedAs('from account select'),
  applyButton: PageElement.located(By.css('#rightPanel input.button')).describedAs('Apply Now button'),
  result: PageElement.located(By.id('requestLoanResult')).describedAs('loan result'),
  status: PageElement.located(By.id('loanStatus')).describedAs('loan status'),
  approvedSection: PageElement.located(By.id('loanRequestApproved')).describedAs('approved section'),
  newLoanAccountId: PageElement.located(By.css('#loanRequestApproved #newAccountId')).describedAs('new loan account id')
};
