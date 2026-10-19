import { Answerable, q } from '@serenity-js/core';
import { By, PageElement } from '@serenity-js/web';

/**
 * Serenity/JS page targets. These are style-03's own (DR-PB-12: no code shared between
 * styles), following the project's selector norms: no `:has()`, scope to #rightPanel /
 * #leftPanel where panels collide, and wait for the concrete <option value> of each
 * async-populated <select>.
 */

export const LoginForm = {
  username: PageElement.located(By.css('input[name="username"]')).describedAs('username field'),
  password: PageElement.located(By.css('input[name="password"]')).describedAs('password field'),
  logInButton: PageElement.located(By.css('input[type="submit"][value="Log In"]')).describedAs('Log In button')
};

export const NavPanel = {
  logOutLink: PageElement.located(By.css('#leftPanel a[href*="logout.htm"]')).describedAs('Log Out link'),
  transferFundsLink: PageElement.located(By.css('#leftPanel a[href*="transfer.htm"]')).describedAs('Transfer Funds link')
};

export const TransferForm = {
  amount: PageElement.located(By.css('#transferForm #amount')).describedAs('transfer amount field'),
  fromSelect: PageElement.located(By.css('#transferForm #fromAccountId')).describedAs('from account select'),
  toSelect: PageElement.located(By.css('#transferForm #toAccountId')).describedAs('to account select'),
  fromOption: (accountId: Answerable<number>) =>
    PageElement.located(By.css(q`#transferForm #fromAccountId option[value="${accountId}"]`)).describedAs('from account option'),
  toOption: (accountId: Answerable<number>) =>
    PageElement.located(By.css(q`#transferForm #toAccountId option[value="${accountId}"]`)).describedAs('to account option'),
  transferButton: PageElement.located(By.css('#rightPanel input.button')).describedAs('Transfer button')
};

export const TransferResult = {
  title: PageElement.located(By.css('#showResult .title')).describedAs('transfer result title'),
  amount: PageElement.located(By.id('amountResult')).describedAs('transferred amount'),
  fromAccount: PageElement.located(By.id('fromAccountIdResult')).describedAs('transfer source account'),
  toAccount: PageElement.located(By.id('toAccountIdResult')).describedAs('transfer destination account')
};
