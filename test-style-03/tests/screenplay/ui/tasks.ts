import { isPresent } from '@serenity-js/assertions';
import { Answerable, Masked, q, Task, Wait } from '@serenity-js/core';
import { Click, Enter, isVisible, Navigate, Select } from '@serenity-js/web';
import { LoginForm, NavPanel, TransferForm, TransferResult } from './targets';

/** Lane tasks: imperative verb phrases (docs/naming-conventions.md). */

export const LogIn = {
  asTheStandardCustomer: (
    username = process.env.PARABANK_USERNAME ?? 'john',
    password = process.env.PARABANK_PASSWORD ?? 'demo'
  ): Task =>
    Task.where(
      `#actor logs in through the UI as ${username}`,
      Navigate.to('/parabank/index.htm'),
      Enter.theValue(username).into(LoginForm.username),
      Enter.theValue(Masked.valueOf(password)).into(LoginForm.password),
      Click.on(LoginForm.logInButton),
      // Authenticated state: the Log Out link only renders for a signed-in customer.
      Wait.until(NavPanel.logOutLink, isVisible())
    )
};

export const OpenTransferFunds = (): Task =>
  Task.where(
    '#actor opens Transfer Funds',
    Click.on(NavPanel.transferFundsLink),
    Wait.until(TransferForm.amount, isVisible())
  );

/**
 * Both <select>s are filled by a client-side fetch after the page renders, so wait for the
 * concrete option of each account before selecting (PBR-07 precedent).
 */
export const TransferFundsThroughTheUi = (
  amount: number,
  fromAccountId: Answerable<number>,
  toAccountId: Answerable<number>
): Task =>
  Task.where(
    `#actor transfers $${amount} through the UI`,
    Wait.until(TransferForm.fromOption(fromAccountId), isPresent()),
    Wait.until(TransferForm.toOption(toAccountId), isPresent()),
    Enter.theValue(String(amount)).into(TransferForm.amount),
    Select.value(q`${fromAccountId}`).from(TransferForm.fromSelect),
    Select.value(q`${toAccountId}`).from(TransferForm.toSelect),
    Click.on(TransferForm.transferButton),
    Wait.until(TransferResult.title, isVisible())
  );
