import assert from 'node:assert/strict';
import { Actor, Question } from './core';
import { CallParaBankRest, CallParaBankSoap } from './abilities';
import { getAccountSoap } from '../api/soap';
import { Account, ApiResponse, Transaction } from '../api/types';

/** REST read of one account (asserts 200 — reads of known accounts must succeed). */
export class TheAccount implements Question<Account> {
  private constructor(private readonly accountId: number) {}

  static withId(accountId: number): TheAccount {
    return new TheAccount(accountId);
  }

  async answeredBy(actor: Actor): Promise<Account> {
    const rest = actor.abilityTo(CallParaBankRest);
    const res = await rest.call((c) => c.account(this.accountId));
    assert.equal(res.status, 200, `GET account ${this.accountId} → HTTP ${res.status}: ${res.text}`);
    return res.json as Account;
  }
}

/** REST read of an account's transactions. */
export class TheTransactions implements Question<Transaction[]> {
  private constructor(private readonly accountId: number) {}

  static forAccount(accountId: number): TheTransactions {
    return new TheTransactions(accountId);
  }

  async answeredBy(actor: Actor): Promise<Transaction[]> {
    const rest = actor.abilityTo(CallParaBankRest);
    const res = await rest.call((c) => c.transactions(this.accountId));
    assert.equal(res.status, 200, `GET transactions ${this.accountId} → HTTP ${res.status}: ${res.text}`);
    return res.json as Transaction[];
  }
}

/** SOAP read of one account (DR-PB-07 parity read). */
export class TheSoapAccount implements Question<Account> {
  private constructor(private readonly accountId: number) {}

  static withId(accountId: number): TheSoapAccount {
    return new TheSoapAccount(accountId);
  }

  answeredBy(actor: Actor): Promise<Account> {
    const soap = actor.abilityTo(CallParaBankSoap);
    return getAccountSoap(soap.baseUrl, this.accountId);
  }
}

/** The last raw REST response — FR-B4 asserts observed statuses/plain-text bodies from it. */
export class TheLastResponse implements Question<ApiResponse> {
  static received(): TheLastResponse {
    return new TheLastResponse();
  }

  async answeredBy(actor: Actor): Promise<ApiResponse> {
    return actor.abilityTo(CallParaBankRest).last;
  }
}
