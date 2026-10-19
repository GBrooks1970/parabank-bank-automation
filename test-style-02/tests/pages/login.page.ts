import { expect, Locator, Page } from '@playwright/test';

/**
 * ParaBank's login form has no <label for> associations, so getByLabel() cannot find
 * the inputs; target them by name instead. The left panel login form is present on
 * every logged-out page, so it is not scoped further.
 */
export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly logOutLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton = page.getByRole('button', { name: 'Log In' });
    this.logOutLink = page.getByRole('link', { name: 'Log Out' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/parabank/index.htm');
  }

  async login(
    username = process.env.PARABANK_USERNAME ?? 'john',
    password = process.env.PARABANK_PASSWORD ?? 'demo'
  ): Promise<void> {
    await this.goto();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    // Authenticated state: the Log Out link only renders for a signed-in customer.
    await expect(this.logOutLink).toBeVisible();
  }
}
