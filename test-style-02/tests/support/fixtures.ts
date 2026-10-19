import { test as base } from '@playwright/test';
import { ParaBankApi } from './parabank-api';
import { DiscoveredCustomer, discoverCustomer } from './accounts';
import { LoginPage } from '../pages/login.page';
import { LeftNav } from '../pages/nav.page';
import { TransferPage } from '../pages/transfer.page';

/**
 * Specs receive ready-made helpers instead of repeating setup in beforeEach.
 * Each fixture is per-test, so no state leaks between tests.
 */
interface Fixtures {
  api: ParaBankApi;
  customer: DiscoveredCustomer;
  loginPage: LoginPage;
  leftNav: LeftNav;
  transferPage: TransferPage;
}

export const test = base.extend<Fixtures>({
  api: async ({ request }, use) => {
    await use(new ParaBankApi(request));
  },
  customer: async ({ api }, use) => {
    await use(await discoverCustomer(api));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  leftNav: async ({ page }, use) => {
    await use(new LeftNav(page));
  },
  transferPage: async ({ page }, use) => {
    await use(new TransferPage(page));
  }
});

export { expect } from '@playwright/test';
