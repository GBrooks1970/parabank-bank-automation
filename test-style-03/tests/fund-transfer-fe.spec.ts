import { Ensure, equals } from '@serenity-js/assertions';
import { q, Task } from '@serenity-js/core';
import { test } from '@serenity-js/playwright-test';
import { DiscoverTheStandardCustomer, RecordTheBalanceOf } from './screenplay/api/tasks';
import { TheBalanceChangeOf } from './screenplay/api/questions';
import { idOf } from './screenplay/notes';
import { LogIn, OpenTransferFunds, TransferFundsThroughTheUi } from './screenplay/ui/tasks';
import {
  TheTransferDestinationAccount,
  TheTransferredAmount,
  TheTransferResultTitle,
  TheTransferSourceAccount
} from './screenplay/ui/questions';

/**
 * Brief Part 1 (maps to FR-A3). Same test as test-style-02, in Screenplay: the actor
 * (John, the integration's default actor) can browse the web, call the API and take notes.
 * Given/When/Then are named Tasks, reported as steps in both Playwright and Serenity reports.
 */
test.describe('ParaBank fund transfer UI', () => {
  test('transfers $50 from Checking to Savings and the UI confirms it', async ({ actor }) => {
    await actor.attemptsTo(
      Task.where(
        '#actor is using ParaBank as the standard customer',
        DiscoverTheStandardCustomer(),
        RecordTheBalanceOf('checking'),
        RecordTheBalanceOf('savings'),
        LogIn.asTheStandardCustomer()
      ),

      Task.where(
        '#actor completes a transfer of $50 from Checking to Savings',
        OpenTransferFunds(),
        TransferFundsThroughTheUi(50, idOf('checking'), idOf('savings'))
      ),

      Task.where(
        '#actor sees the UI reflect the completed transfer',
        Ensure.that(TheTransferResultTitle(), equals('Transfer Complete!')),
        Ensure.that(TheTransferredAmount(), equals('$50.00')),
        Ensure.that(TheTransferSourceAccount(), equals(q`${idOf('checking')}`)),
        Ensure.that(TheTransferDestinationAccount(), equals(q`${idOf('savings')}`))
      ),

      Task.where(
        '#actor sees the balances move by $50 (REST cross-check)',
        Ensure.that(TheBalanceChangeOf('checking'), equals(-5000)),
        Ensure.that(TheBalanceChangeOf('savings'), equals(5000))
      )
    );
  });
});
