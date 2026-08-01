import { ApiResponse } from './types';
import { OPERATION_CONTRACTS, OperationName } from './operation-contracts';
import { withRequestDeadline } from './request-deadline';

/**
 * Shared ParaBank REST client (design doc §5.4) — used by Lane B Abilities and, from
 * PB-P3, by Lane A verification steps. Mutations use QUERY PARAMETERS and several
 * responses are plain text: that is the SUT's observed contract (design doc §5.7),
 * so the client returns the raw envelope and lets callers assert reality.
 */
export class ParaBankRestClient {
  private readonly services: string;

  constructor(public readonly baseUrl: string) {
    this.services = `${baseUrl}/parabank/services/bank`;
  }

  private async exec(operation: OperationName, method: 'GET' | 'POST', url: string, body?: unknown): Promise<ApiResponse> {
    const init: RequestInit = { method, headers: { Accept: 'application/json' } };
    if (body !== undefined) {
      init.headers = { ...init.headers, 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }
    return withRequestDeadline(init, {
      operation: `REST ${operation}`,
      safePath: `/parabank/services/bank${OPERATION_CONTRACTS[operation].path}`
    }, async (signal) => {
      const res = await fetch(url, { ...init, signal });
      const text = await res.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        /* plain-text body — expected for several endpoints */
      }
      const contentType = res.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
      return { status: res.status, text, contentType: contentType || undefined, json };
    });
  }

  login(username: string, password: string): Promise<ApiResponse> {
    return this.exec('login', 'GET', `${this.services}/login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`);
  }

  customer(customerId: number): Promise<ApiResponse> {
    return this.exec('customer', 'GET', `${this.services}/customers/${customerId}`);
  }

  accounts(customerId: number): Promise<ApiResponse> {
    return this.exec('accounts', 'GET', `${this.services}/customers/${customerId}/accounts`);
  }

  account(accountId: number): Promise<ApiResponse> {
    return this.exec('account', 'GET', `${this.services}/accounts/${accountId}`);
  }

  transactions(accountId: number): Promise<ApiResponse> {
    return this.exec('transactions', 'GET', `${this.services}/accounts/${accountId}/transactions`);
  }

  createAccount(customerId: number, newAccountType: number, fromAccountId: number): Promise<ApiResponse> {
    return this.exec(
      'createAccount',
      'POST',
      `${this.services}/createAccount?customerId=${customerId}&newAccountType=${newAccountType}&fromAccountId=${fromAccountId}`
    );
  }

  deposit(accountId: number, amount: number | string): Promise<ApiResponse> {
    return this.exec('deposit', 'POST', `${this.services}/deposit?accountId=${accountId}&amount=${amount}`);
  }

  withdraw(accountId: number, amount: number | string): Promise<ApiResponse> {
    return this.exec('withdraw', 'POST', `${this.services}/withdraw?accountId=${accountId}&amount=${amount}`);
  }

  /** `amount` is typed loosely so FR-B4 can send malformed values on purpose. */
  transfer(fromAccountId: number, toAccountId: number, amount: number | string): Promise<ApiResponse> {
    return this.exec(
      'transfer',
      'POST',
      `${this.services}/transfer?fromAccountId=${fromAccountId}&toAccountId=${toAccountId}&amount=${amount}`
    );
  }

  requestLoan(customerId: number, amount: number, downPayment: number, fromAccountId: number): Promise<ApiResponse> {
    return this.exec(
      'requestLoan',
      'POST',
      `${this.services}/requestLoan?customerId=${customerId}&amount=${amount}&downPayment=${downPayment}&fromAccountId=${fromAccountId}`
    );
  }

  /** Admin parameter tuning — used only by the FR-A5 loan-pinning hook (design doc §5.6). */
  setParameter(name: string, value: string): Promise<ApiResponse> {
    return this.exec('setParameter', 'POST', `${this.services}/setParameter/${encodeURIComponent(name)}/${encodeURIComponent(value)}`);
  }

  initializeDB(): Promise<ApiResponse> {
    return this.exec('initializeDB', 'POST', `${this.services}/initializeDB`);
  }

  cleanDB(): Promise<ApiResponse> {
    return this.exec('cleanDB', 'POST', `${this.services}/cleanDB`);
  }

  openapi(): Promise<ApiResponse> {
    return this.exec('openapi', 'GET', `${this.services}/openapi.json`);
  }
}
