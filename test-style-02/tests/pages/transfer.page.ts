import { expect, Locator, Page } from '@playwright/test';

/**
 * transfer.htm. Both account <select>s are filled by a client-side fetch after the page
 * renders, so selecting immediately races it (PBR-07 precedent). submitTransfer() waits
 * for the concrete <option value> of each account before selecting.
 * The selects show account ids only, never CHECKING/SAVINGS: the caller supplies ids it
 * discovered through the API.
 */
export class TransferPage {
  readonly page: Page;
  readonly amountInput: Locator;
  readonly fromSelect: Locator;
  readonly toSelect: Locator;
  readonly transferButton: Locator;
  readonly resultPanel: Locator;
  readonly resultTitle: Locator;
  readonly amountResult: Locator;
  readonly fromAccountResult: Locator;
  readonly toAccountResult: Locator;

  constructor(page: Page) {
    this.page = page;
    this.amountInput = page.locator('#transferForm #amount');
    this.fromSelect = page.locator('#transferForm #fromAccountId');
    this.toSelect = page.locator('#transferForm #toAccountId');
    this.transferButton = page.locator('#rightPanel').getByRole('button', { name: 'Transfer' });
    this.resultPanel = page.locator('#showResult');
    this.resultTitle = this.resultPanel.locator('.title');
    this.amountResult = page.locator('#amountResult');
    this.fromAccountResult = page.locator('#fromAccountIdResult');
    this.toAccountResult = page.locator('#toAccountIdResult');
  }

  async submitTransfer(amount: string, fromAccountId: number, toAccountId: number): Promise<void> {
    await expect(this.fromSelect.locator(`option[value="${fromAccountId}"]`)).toBeAttached();
    await expect(this.toSelect.locator(`option[value="${toAccountId}"]`)).toBeAttached();
    await this.amountInput.fill(amount);
    await this.fromSelect.selectOption(String(fromAccountId));
    await this.toSelect.selectOption(String(toAccountId));
    await this.transferButton.click();
  }
}
