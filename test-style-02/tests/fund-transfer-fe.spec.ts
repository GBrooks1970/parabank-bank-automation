import { test, expect } from './support/fixtures';
import { cents } from './support/parabank-api';

/**
 * Brief Part 1 (maps to FR-A3). One test per journey: Given/When/Then are test.step()s
 * inside a single test, because each test() gets a fresh, unauthenticated browser context.
 */
test.describe('ParaBank fund transfer UI', () => {
  test('transfers $50 from Checking to Savings and the UI confirms it', async ({
    api,
    customer,
    loginPage,
    leftNav,
    transferPage
  }) => {
    const { checking, savings } = customer;
    let checkingBefore = 0;
    let savingsBefore = 0;

    await test.step('Given that I am using ParaBank as the standard customer', async () => {
      checkingBefore = (await api.account(checking.id)).balance;
      savingsBefore = (await api.account(savings.id)).balance;
      await loginPage.login();
    });

    await test.step('When I complete a transfer of $50 from Checking to Savings', async () => {
      await leftNav.openTransferFunds();
      await transferPage.submitTransfer('50', checking.id, savings.id);
    });

    await test.step('Then the UI should reflect the completed transfer', async () => {
      await expect(transferPage.resultTitle).toHaveText('Transfer Complete!');
      await expect(transferPage.amountResult).toHaveText('$50.00');
      await expect(transferPage.fromAccountResult).toHaveText(String(checking.id));
      await expect(transferPage.toAccountResult).toHaveText(String(savings.id));
    });

    await test.step('And the balances moved by $50 (REST cross-check)', async () => {
      const checkingAfter = (await api.account(checking.id)).balance;
      const savingsAfter = (await api.account(savings.id)).balance;
      expect(cents(checkingAfter) - cents(checkingBefore), 'checking delta in cents').toBe(-5000);
      expect(cents(savingsAfter) - cents(savingsBefore), 'savings delta in cents').toBe(5000);
    });
  });
});
