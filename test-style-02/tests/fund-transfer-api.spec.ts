import { test, expect } from './support/fixtures';
import { cents } from './support/parabank-api';

/**
 * Brief Parts 2 and 3 (map to FR-B4 and the FR-B2 ledger checks).
 * Expected statuses and bodies were observed live against the pinned SUT d1bf006 on
 * 2026-10-19 (PB-STYLE-01 Step 0) and are asserted AS OBSERVED (design doc §5.7).
 */
const UNKNOWN_ACCOUNT = 99999;

interface InvalidCase {
  name: string;
  params: (from: number, to: number) => Record<string, string | number>;
  status: number;
  body?: string | RegExp;
}

// Every case here was observed to be rejected (non-2xx). Only the parameters vary.
const INVALID_CASES: InvalidCase[] = [
  {
    name: 'an unknown source account',
    params: (_from, to) => ({ fromAccountId: UNKNOWN_ACCOUNT, toAccountId: to, amount: 5 }),
    status: 400,
    body: /^Could not find account number 99999 and\/or \d+$/
  },
  {
    name: 'an unknown destination account',
    params: (from) => ({ fromAccountId: from, toAccountId: UNKNOWN_ACCOUNT, amount: 5 }),
    status: 400,
    body: /^Could not find account number \d+ and\/or 99999$/
  },
  {
    name: 'a missing source account',
    params: (_from, to) => ({ toAccountId: to, amount: 5 }),
    status: 400,
    body: /^Could not find account number 0 and\/or \d+$/
  },
  {
    name: 'a non-numeric source account',
    params: (_from, to) => ({ fromAccountId: 'abc', toAccountId: to, amount: 5 }),
    status: 404,
    body: ''
  },
  {
    name: 'a non-numeric amount',
    params: (from, to) => ({ fromAccountId: from, toAccountId: to, amount: 'abc' }),
    status: 404,
    body: ''
  },
  {
    // Observed: an unhandled server error page, not a validation response.
    name: 'a missing amount',
    params: (from, to) => ({ fromAccountId: from, toAccountId: to }),
    status: 500
  }
];

test.describe('ParaBank fund transfer API', () => {
  test.describe('Direct API transfer requests', () => {
    test('handles a successful transfer request', async ({ api, customer }) => {
      const { checking, savings } = customer;

      const response = await api.transfer({ fromAccountId: checking.id, toAccountId: savings.id, amount: '25.00' });

      expect(response.status()).toBe(200);
      // Plain-text confirmation, echoing the amount as sent (despite a JSON content type).
      expect(await response.text()).toBe(
        `Successfully transferred $25.00 from account #${checking.id} to account #${savings.id}`
      );
    });

    test.describe('rejects invalid transfer requests', () => {
      for (const invalid of INVALID_CASES) {
        test(`rejects ${invalid.name}`, async ({ api, customer }) => {
          const { checking, savings } = customer;
          const balanceBefore = (await api.account(checking.id)).balance;

          const response = await api.transfer(invalid.params(checking.id, savings.id));

          expect(response.ok(), 'the request must be rejected').toBe(false);
          expect(response.status()).toBe(invalid.status);
          if (invalid.body !== undefined) {
            const body = await response.text();
            if (typeof invalid.body === 'string') expect(body).toBe(invalid.body);
            else expect(body).toMatch(invalid.body);
          }
          // A rejected request must not move money.
          expect((await api.account(checking.id)).balance).toBe(balanceBefore);
        });
      }
    });

    /**
     * Decision D3: requests a careful reader would expect to be rejected but which the SUT
     * accepts. Asserted as observed and annotated, so the report surfaces them as findings.
     */
    test.describe('observed acceptance (assert-as-observed)', () => {
      test('accepts a negative amount, moving money in reverse', async ({ api, customer }) => {
        test.info().annotations.push({ type: 'sut-quirk', description: 'Negative transfer amounts are accepted (HTTP 200).' });
        const { checking, savings } = customer;
        const before = (await api.account(checking.id)).balance;

        const response = await api.transfer({ fromAccountId: checking.id, toAccountId: savings.id, amount: -50 });

        expect(response.status()).toBe(200);
        expect(await response.text()).toBe(
          `Successfully transferred $-50 from account #${checking.id} to account #${savings.id}`
        );
        expect(cents((await api.account(checking.id)).balance) - cents(before)).toBe(5000);
      });

      test('accepts a transfer to the same account', async ({ api, customer }) => {
        test.info().annotations.push({ type: 'sut-quirk', description: 'Same-account transfers are accepted (HTTP 200).' });
        const { checking } = customer;

        const response = await api.transfer({ fromAccountId: checking.id, toAccountId: checking.id, amount: 5 });

        expect(response.status()).toBe(200);
        expect(await response.text()).toBe(`Successfully transferred $5 from account #${checking.id} to account #${checking.id}`);
      });

      test('accepts an overdraft beyond the available balance', async ({ api, customer }) => {
        test.info().annotations.push({ type: 'sut-quirk', description: 'Overdrafts are permitted (seed holds negative balances).' });
        const { checking, savings } = customer;
        const before = (await api.account(checking.id)).balance;
        const overdraft = Math.ceil(before) + 1000;

        const response = await api.transfer({ fromAccountId: checking.id, toAccountId: savings.id, amount: overdraft });

        expect(response.status()).toBe(200);
        expect((await api.account(checking.id)).balance).toBeLessThan(0);
      });
    });
  });

  test.describe('Transaction history validation', () => {
    test('contains a debit entry for the source account after a transfer', async ({ api, customer }) => {
      const { checking, savings } = customer;
      // A distinctive amount, plus a before/after id diff, isolates THIS transfer's debit
      // from any history the account already holds.
      const amount = 13.57;
      const knownIds = new Set((await api.transactions(checking.id)).map((transaction) => transaction.id));

      const transfer = await api.transfer({ fromAccountId: checking.id, toAccountId: savings.id, amount });
      expect(transfer.status()).toBe(200);

      const newEntries = (await api.transactions(checking.id)).filter((transaction) => !knownIds.has(transaction.id));
      expect(newEntries, 'exactly one new ledger entry on the source account').toHaveLength(1);
      const [debit] = newEntries;
      expect(debit).toMatchObject({ accountId: checking.id, type: 'Debit', description: 'Funds Transfer Sent' });
      expect(cents(debit.amount)).toBe(cents(amount));
    });
  });
});
