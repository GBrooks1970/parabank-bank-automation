import { Account, Customer, ParaBankApi } from './parabank-api';

export interface DiscoveredCustomer {
  customer: Customer;
  accounts: Account[];
  checking: Account;
  savings: Account;
}

/**
 * Funds the source CHECKING account must hold so a happy-path transfer is a genuine
 * in-funds transfer. ParaBank permits overdrafts and the seed holds negative balances, so
 * "first CHECKING account" alone could silently turn a happy path into an overdraft.
 */
export const MIN_SOURCE_BALANCE = 100;

/**
 * Account ids are never hard-coded (brief: "discover the appropriate accounts").
 * Logs in through the API, lists the customer's accounts, and picks the first CHECKING
 * account holding at least MIN_SOURCE_BALANCE and the first SAVINGS account. If no
 * SAVINGS account exists (possible on a shared demo environment), opens one funded from
 * the checking account.
 */
export async function discoverCustomer(
  api: ParaBankApi,
  username = process.env.PARABANK_USERNAME ?? 'john',
  password = process.env.PARABANK_PASSWORD ?? 'demo'
): Promise<DiscoveredCustomer> {
  const customer = await api.login(username, password);
  let accounts = await api.accounts(customer.id);

  const checking = accounts.find((account) => account.type === 'CHECKING' && account.balance >= MIN_SOURCE_BALANCE);
  if (!checking) {
    throw new Error(`Customer ${customer.id} has no CHECKING account holding at least $${MIN_SOURCE_BALANCE}`);
  }

  let savings = accounts.find((account) => account.type === 'SAVINGS');
  if (!savings) {
    savings = await api.createAccount(customer.id, 'SAVINGS', checking.id);
    accounts = await api.accounts(customer.id);
  }

  return { customer, accounts, checking, savings };
}
