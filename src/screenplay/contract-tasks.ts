import assert from 'node:assert/strict';
import { SpecConformance } from '../api/spec-conformance';
import { Account, ApiResponse, Customer } from '../api/types';
import { ParaBankRestClient } from '../api/client';
import { Actor, Task } from './core';
import { CallParaBankRest } from './abilities';
import { OperationName } from '../api/operation-contracts';

/** Exercise DR-PB-08's complete client surface and retain the generated coverage summary. */
export class ExerciseApprovedRestContracts implements Task {
  private constructor(private readonly spec: SpecConformance) {}

  static against(spec: SpecConformance): ExerciseApprovedRestContracts {
    return new ExerciseApprovedRestContracts(spec);
  }

  async performAs(actor: Actor): Promise<void> {
    const rest = actor.abilityTo(CallParaBankRest);
    const exercise = async (
      name: OperationName,
      invoke: (client: ParaBankRestClient) => Promise<ApiResponse>
    ): Promise<ApiResponse> => {
      const response = await rest.call(invoke);
      this.spec.assertOperation(name, response);
      return response;
    };

    const login = await exercise('login', (client) => client.login('john', 'demo'));
    const customer = login.json as Customer;
    assert.equal(customer.id, 12212, 'seeded login did not return customer 12212');

    await exercise('customer', (client) => client.customer(customer.id));
    await exercise('accounts', (client) => client.accounts(customer.id));
    await exercise('account', (client) => client.account(12345));
    await exercise('transactions', (client) => client.transactions(12345));

    const created = await exercise('createAccount', (client) => client.createAccount(customer.id, 0, 12345));
    const newAccount = created.json as Account;
    assert.ok(Number.isInteger(newAccount.id), 'createAccount did not return a captured integer id');

    await exercise('deposit', (client) => client.deposit(newAccount.id, 1));
    await exercise('withdraw', (client) => client.withdraw(newAccount.id, 0.01));
    await exercise('transfer', (client) => client.transfer(12345, newAccount.id, 1));

    for (const [name, value] of [
      ['loanProvider', 'local'],
      ['loanProcessor', 'down'],
      ['loanProcessorThreshold', '20']
    ] as const) {
      await exercise('setParameter', (client) => client.setParameter(name, value));
    }
    await exercise('requestLoan', (client) => client.requestLoan(customer.id, 5_000, 1_200, 12345));

    // cleanDB is destructive by definition. Always restore the seed, including when its
    // own contract assertion fails, and let the scenario After hook provide a second guard.
    try {
      await exercise('cleanDB', (client) => client.cleanDB());
    } finally {
      await exercise('initializeDB', (client) => client.initializeDB());
    }

    await exercise('openapi', (client) => client.openapi());
    actor.remember('restContractCoverage', this.spec.coverageSummary());
  }
}
