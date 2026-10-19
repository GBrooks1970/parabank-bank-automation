import { Ensure, equals, isGreaterThan, isLessThan, matches } from '@serenity-js/assertions';
import { Answerable, Log, q, Task } from '@serenity-js/core';
import { test } from '@serenity-js/playwright-test';
import { LastResponse } from '@serenity-js/rest';
import { cents } from './screenplay/api/endpoints';
import {
  AnOverdraftAmount,
  TheBalanceChangeOf,
  TheNewLedgerEntriesOf,
  TheOnlyNewLedgerEntryOf
} from './screenplay/api/questions';
import { DiscoverTheStandardCustomer, RecordTheBalanceOf, RecordTheTransactionIdsOf, TransferViaTheApi } from './screenplay/api/tasks';
import { idOf } from './screenplay/notes';
import { IS_LOCAL_TARGET } from '../playwright.config';

/**
 * Brief Parts 2 and 3 (map to FR-B4 and the FR-B2 ledger checks). The same 11 tests and
 * expectations as test-style-02: observed live against the pinned SUT d1bf006 on
 * 2026-10-19 (PB-STYLE-01 Step 0) and asserted AS OBSERVED (design doc §5.7).
 */
const UNKNOWN_ACCOUNT = 99999;

type Params = Record<string, Answerable<string | number>>;

interface InvalidCase {
  name: string;
  params: () => Params;
  status: number;
  body?: string | RegExp;
}

// Every case here was observed to be rejected (non-2xx). Only the parameters vary.
const INVALID_CASES: InvalidCase[] = [
  {
    name: 'an unknown source account',
    params: () => ({ fromAccountId: UNKNOWN_ACCOUNT, toAccountId: idOf('savings'), amount: 5 }),
    status: 400,
    body: /^Could not find account number 99999 and\/or \d+$/
  },
  {
    name: 'an unknown destination account',
    params: () => ({ fromAccountId: idOf('checking'), toAccountId: UNKNOWN_ACCOUNT, amount: 5 }),
    status: 400,
    body: /^Could not find account number \d+ and\/or 99999$/
  },
  {
    name: 'a missing source account',
    params: () => ({ toAccountId: idOf('savings'), amount: 5 }),
    status: 400,
    body: /^Could not find account number 0 and\/or \d+$/
  },
  {
    name: 'a non-numeric source account',
    params: () => ({ fromAccountId: 'abc', toAccountId: idOf('savings'), amount: 5 }),
    status: 404,
    body: ''
  },
  {
    name: 'a non-numeric amount',
    params: () => ({ fromAccountId: idOf('checking'), toAccountId: idOf('savings'), amount: 'abc' }),
    status: 404,
    body: ''
  },
  {
    // Observed: an unhandled server error page, not a validation response.
    name: 'a missing amount',
    params: () => ({ fromAccountId: idOf('checking'), toAccountId: idOf('savings') }),
    status: 500
  }
];

/** A quirk is flagged in both reports: a Playwright annotation and a Serenity log entry. */
const flagSutQuirk = (description: string) => {
  test.info().annotations.push({ type: 'sut-quirk', description });
  return Log.the(`SUT quirk: ${description}`);
};

test.describe('ParaBank fund transfer API', () => {
  test.describe('Direct API transfer requests', () => {
    test('handles a successful transfer request', async ({ actor }) => {
      await actor.attemptsTo(
        DiscoverTheStandardCustomer(),
        TransferViaTheApi({ fromAccountId: idOf('checking'), toAccountId: idOf('savings'), amount: '25.00' }),
        Ensure.that(LastResponse.status(), equals(200)),
        // Plain-text confirmation, echoing the amount as sent (despite a JSON content type).
        Ensure.that(
          LastResponse.body<string>(),
          equals(q`Successfully transferred $25.00 from account #${idOf('checking')} to account #${idOf('savings')}`)
        )
      );
    });

    test.describe('rejects invalid transfer requests', () => {
      for (const invalid of INVALID_CASES) {
        test(`rejects ${invalid.name}`, async ({ actor }) => {
          await actor.attemptsTo(
            DiscoverTheStandardCustomer(),
            RecordTheBalanceOf('checking'),
            TransferViaTheApi(invalid.params()),
            Task.where(
              '#actor sees the request rejected',
              Ensure.that(LastResponse.status(), isGreaterThan(299)),
              Ensure.that(LastResponse.status(), equals(invalid.status)),
              ...(invalid.body === undefined
                ? []
                : [
                    typeof invalid.body === 'string'
                      ? Ensure.that(LastResponse.body<string>(), equals(invalid.body))
                      : Ensure.that(LastResponse.body<string>(), matches(invalid.body))
                  ])
            ),
            // A rejected request must not move money (asked after LastResponse is asserted).
            Ensure.that(TheBalanceChangeOf('checking'), equals(0))
          );
        });
      }
    });

    /**
     * Decision D3 of PB-STYLE-01: requests a careful reader would expect to be rejected but
     * which the SUT accepts. Asserted as observed and flagged, so both reports surface them.
     */
    test.describe('observed acceptance (assert-as-observed)', () => {
      test('accepts a negative amount, moving money in reverse', async ({ actor }) => {
        await actor.attemptsTo(
          flagSutQuirk('Negative transfer amounts are accepted (HTTP 200).'),
          DiscoverTheStandardCustomer(),
          RecordTheBalanceOf('checking'),
          TransferViaTheApi({ fromAccountId: idOf('checking'), toAccountId: idOf('savings'), amount: -50 }),
          Ensure.that(LastResponse.status(), equals(200)),
          Ensure.that(
            LastResponse.body<string>(),
            equals(q`Successfully transferred $-50 from account #${idOf('checking')} to account #${idOf('savings')}`)
          ),
          Ensure.that(TheBalanceChangeOf('checking'), equals(5000))
        );
      });

      test('accepts a transfer to the same account', async ({ actor }) => {
        await actor.attemptsTo(
          flagSutQuirk('Same-account transfers are accepted (HTTP 200).'),
          DiscoverTheStandardCustomer(),
          TransferViaTheApi({ fromAccountId: idOf('checking'), toAccountId: idOf('checking'), amount: 5 }),
          Ensure.that(LastResponse.status(), equals(200)),
          Ensure.that(
            LastResponse.body<string>(),
            equals(q`Successfully transferred $5 from account #${idOf('checking')} to account #${idOf('checking')}`)
          )
        );
      });

      test('accepts an overdraft beyond the available balance', async ({ actor }) => {
        test.skip(!IS_LOCAL_TARGET, 'live-skip: drains a funded demo account on every run');
        await actor.attemptsTo(
          flagSutQuirk('Overdrafts are permitted (seed holds negative balances).'),
          DiscoverTheStandardCustomer(),
          RecordTheBalanceOf('checking'),
          TransferViaTheApi({ fromAccountId: idOf('checking'), toAccountId: idOf('savings'), amount: AnOverdraftAmount() }),
          Ensure.that(LastResponse.status(), equals(200)),
          Ensure.that(TheBalanceChangeOf('checking'), isLessThan(0))
        );
      });
    });
  });

  test.describe('Transaction history validation', () => {
    test('contains a debit entry for the source account after a transfer', async ({ actor }) => {
      // A distinctive amount, plus a before/after id diff, isolates THIS transfer's debit
      // from any history the account already holds.
      const amount = 13.57;
      await actor.attemptsTo(
        DiscoverTheStandardCustomer(),
        RecordTheTransactionIdsOf('checking'),
        TransferViaTheApi({ fromAccountId: idOf('checking'), toAccountId: idOf('savings'), amount }),
        Ensure.that(LastResponse.status(), equals(200)),
        Ensure.that(TheNewLedgerEntriesOf(idOf('checking'), amount).length, equals(1)),
        Ensure.that(TheOnlyNewLedgerEntryOf(idOf('checking'), amount).accountId, equals(idOf('checking'))),
        Ensure.that(TheOnlyNewLedgerEntryOf(idOf('checking'), amount).type, equals('Debit')),
        Ensure.that(TheOnlyNewLedgerEntryOf(idOf('checking'), amount).description, equals('Funds Transfer Sent')),
        Ensure.that(TheOnlyNewLedgerEntryOf(idOf('checking'), amount).amount.as(cents), equals(cents(amount)))
      );
    });
  });
});
