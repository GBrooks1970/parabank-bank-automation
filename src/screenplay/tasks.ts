import assert from 'node:assert/strict';
import { Actor, Task } from './core';
import { CallParaBankRest } from './abilities';
import { Account, Customer } from '../api/types';

/** GET login/{u}/{p}; remembers the customer as 'customer'. */
export class Login implements Task {
  private constructor(private readonly username: string, private readonly password: string) {}

  static withCredentials(username: string, password: string): Login {
    return new Login(username, password);
  }

  async performAs(actor: Actor): Promise<void> {
    const rest = actor.abilityTo(CallParaBankRest);
    const res = await rest.call((c) => c.login(this.username, this.password));
    assert.equal(res.status, 200, `login(${this.username}) → HTTP ${res.status}: ${res.text}`);
    actor.remember('customer', res.json as Customer);
  }
}

/** POST createAccount; remembers the created account as 'newAccount' (id captured, never hardcoded). */
export class CreateAccount implements Task {
  private constructor(private readonly newAccountType: number, private readonly fromAccountId: number) {}

  static ofType(newAccountType: number): { fundedFrom(fromAccountId: number): CreateAccount } {
    return { fundedFrom: (fromAccountId: number) => new CreateAccount(newAccountType, fromAccountId) };
  }

  async performAs(actor: Actor): Promise<void> {
    const rest = actor.abilityTo(CallParaBankRest);
    const customer = actor.recall<Customer>('customer');
    const res = await rest.call((c) => c.createAccount(customer.id, this.newAccountType, this.fromAccountId));
    assert.equal(res.status, 200, `createAccount → HTTP ${res.status}: ${res.text}`);
    actor.remember('newAccount', res.json as Account);
  }
}

/** POST deposit into an account. */
export class Deposit implements Task {
  private constructor(private readonly amount: number, private readonly accountId: number) {}

  static of(amount: number): { into(accountId: number): Deposit } {
    return { into: (accountId: number) => new Deposit(amount, accountId) };
  }

  async performAs(actor: Actor): Promise<void> {
    const rest = actor.abilityTo(CallParaBankRest);
    const res = await rest.call((c) => c.deposit(this.accountId, this.amount));
    assert.equal(res.status, 200, `deposit → HTTP ${res.status}: ${res.text}`);
  }
}

/** POST transfer between accounts. `amount` loose so FR-B4 can send malformed values. */
export class Transfer implements Task {
  private constructor(
    private readonly amount: number | string,
    private readonly fromAccountId: number,
    private readonly toAccountId: number
  ) {}

  static of(amount: number | string): {
    from(fromAccountId: number): { to(toAccountId: number): Transfer };
  } {
    return {
      from: (fromAccountId: number) => ({
        to: (toAccountId: number) => new Transfer(amount, fromAccountId, toAccountId)
      })
    };
  }

  async performAs(actor: Actor): Promise<void> {
    const rest = actor.abilityTo(CallParaBankRest);
    // No status assertion here: FR-B4 negative scenarios inspect TheLastResponse instead.
    await rest.call((c) => c.transfer(this.fromAccountId, this.toAccountId, this.amount));
  }
}
