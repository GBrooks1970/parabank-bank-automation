import { APIRequestContext, APIResponse, expect } from '@playwright/test';

/**
 * Thin ParaBank REST helper over Playwright's APIRequestContext.
 * - Accept: application/json, otherwise CXF answers in XML.
 * - Mutations take QUERY parameters, not a JSON body (the SUT's observed contract).
 * - /transfer answers in plain text even when JSON is requested: callers read .text().
 */
const BANK = '/parabank/services/bank';
const JSON_HEADERS = { Accept: 'application/json' };

export type AccountType = 'CHECKING' | 'SAVINGS' | 'LOAN';

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
}

export interface Account {
  id: number;
  customerId: number;
  type: AccountType;
  balance: number;
}

export interface Transaction {
  id: number;
  accountId: number;
  type: 'Debit' | 'Credit';
  date: number;
  amount: number;
  description: string;
}

/** Money compared in integer cents, never as floats. */
export const cents = (amount: number | string): number => Math.round(Number(amount) * 100);

export class ParaBankApi {
  constructor(private readonly request: APIRequestContext) {}

  async login(username: string, password: string): Promise<Customer> {
    const response = await this.request.get(
      `${BANK}/login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`,
      { headers: JSON_HEADERS }
    );
    return this.json<Customer>(response, 'login');
  }

  async accounts(customerId: number): Promise<Account[]> {
    const response = await this.request.get(`${BANK}/customers/${customerId}/accounts`, { headers: JSON_HEADERS });
    return this.json<Account[]>(response, 'accounts');
  }

  async account(accountId: number): Promise<Account> {
    const response = await this.request.get(`${BANK}/accounts/${accountId}`, { headers: JSON_HEADERS });
    return this.json<Account>(response, 'account');
  }

  async transactions(accountId: number): Promise<Transaction[]> {
    const response = await this.request.get(`${BANK}/accounts/${accountId}/transactions`, { headers: JSON_HEADERS });
    return this.json<Transaction[]>(response, 'transactions');
  }

  async createAccount(customerId: number, type: AccountType, fromAccountId: number): Promise<Account> {
    const newAccountType = { CHECKING: 0, SAVINGS: 1, LOAN: 2 }[type];
    const response = await this.request.post(`${BANK}/createAccount`, {
      headers: JSON_HEADERS,
      params: { customerId, newAccountType, fromAccountId }
    });
    return this.json<Account>(response, 'createAccount');
  }

  /**
   * Raw transfer: returns the response unasserted so negative tests can inspect it.
   * Parameters are typed loosely on purpose (malformed values are a test input).
   */
  transfer(params: Record<string, string | number>): Promise<APIResponse> {
    return this.request.post(`${BANK}/transfer`, { headers: JSON_HEADERS, params });
  }

  private async json<T>(response: APIResponse, operation: string): Promise<T> {
    expect(response.status(), `${operation} should answer 200: ${await response.text()}`).toBe(200);
    return (await response.json()) as T;
  }
}
