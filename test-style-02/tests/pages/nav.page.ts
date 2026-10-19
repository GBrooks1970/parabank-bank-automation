import { Locator, Page } from '@playwright/test';

/** The signed-in "Account Services" menu in the left panel. */
export class LeftNav {
  readonly page: Page;
  readonly transferFundsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.transferFundsLink = page.locator('#leftPanel').getByRole('link', { name: 'Transfer Funds' });
  }

  async openTransferFunds(): Promise<void> {
    await this.transferFundsLink.click();
  }
}
