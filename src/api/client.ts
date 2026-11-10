import { ApiResponse } from './types';
import { OPERATION_CONTRACTS, OperationName } from './operation-contracts';
import { withRequestDeadline } from './request-deadline';
import { assertLocalSut } from '../quality/target-guard';

export interface RequestOptions {
  /**
   * Explicit escape hatch for sending an unencoded/raw query string on purpose
   * (e.g. testing malformed query strings or raw injection attempts).
   * When provided, this query string is appended verbatim (`?${rawQuery}`)
   * instead of building and encoding parameters with URLSearchParams.
   */
  rawQuery?: string;
}

/**
 * Constructs a service URL with query parameters encoded via URLSearchParams.
 * If `options?.rawQuery` is provided, it is appended verbatim as an explicit escape hatch.
 */
export function buildQueryUrl(
  basePath: string,
  params: Record<string, string | number | undefined>,
  options?: RequestOptions
): string {
  if (options?.rawQuery !== undefined) {
    const raw = options.rawQuery.startsWith('?') ? options.rawQuery.slice(1) : options.rawQuery;
    return `${basePath}?${raw}`;
  }
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
}

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

  createAccount(customerId: number, newAccountType: number, fromAccountId: number, options?: RequestOptions): Promise<ApiResponse> {
    return this.exec(
      'createAccount',
      'POST',
      buildQueryUrl(`${this.services}/createAccount`, { customerId, newAccountType, fromAccountId }, options)
    );
  }

  deposit(accountId: number, amount: number | string, options?: RequestOptions): Promise<ApiResponse> {
    return this.exec('deposit', 'POST', buildQueryUrl(`${this.services}/deposit`, { accountId, amount }, options));
  }

  withdraw(accountId: number, amount: number | string, options?: RequestOptions): Promise<ApiResponse> {
    return this.exec('withdraw', 'POST', buildQueryUrl(`${this.services}/withdraw`, { accountId, amount }, options));
  }

  /** `amount` is typed loosely so FR-B4 can send malformed values on purpose. */
  transfer(fromAccountId: number, toAccountId: number, amount: number | string, options?: RequestOptions): Promise<ApiResponse> {
    return this.exec(
      'transfer',
      'POST',
      buildQueryUrl(`${this.services}/transfer`, { fromAccountId, toAccountId, amount }, options)
    );
  }

  requestLoan(customerId: number, amount: number, downPayment: number, fromAccountId: number, options?: RequestOptions): Promise<ApiResponse> {
    return this.exec(
      'requestLoan',
      'POST',
      buildQueryUrl(`${this.services}/requestLoan`, { customerId, amount, downPayment, fromAccountId }, options)
    );
  }

  /** Admin parameter tuning — used only by the FR-A5 loan-pinning hook (design doc §5.6). */
  setParameter(name: string, value: string): Promise<ApiResponse> {
    // DR-PB-13: destructive/admin operations refuse any host but the local SUT, whoever calls them.
    assertLocalSut(this.baseUrl, 'ParaBankRestClient.setParameter');
    return this.exec('setParameter', 'POST', `${this.services}/setParameter/${encodeURIComponent(name)}/${encodeURIComponent(value)}`);
  }

  initializeDB(): Promise<ApiResponse> {
    assertLocalSut(this.baseUrl, 'ParaBankRestClient.initializeDB');
    return this.exec('initializeDB', 'POST', `${this.services}/initializeDB`);
  }

  cleanDB(): Promise<ApiResponse> {
    assertLocalSut(this.baseUrl, 'ParaBankRestClient.cleanDB');
    return this.exec('cleanDB', 'POST', `${this.services}/cleanDB`);
  }

  openapi(): Promise<ApiResponse> {
    return this.exec('openapi', 'GET', `${this.services}/openapi.json`);
  }
}
