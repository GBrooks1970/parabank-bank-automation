import assert from 'node:assert/strict';
import { Actor, Task } from './core';
import { CallParaBankRest, CallParaBankSoap } from './abilities';
import { TheAccount, TheSoapAccount, TheTransactions, TheLastResponse, TheSoapResponse } from './questions';
import { Account, Customer, NewAccountType } from '../api/types';
import { isOperationName } from '../api/operation-contracts';
import { SpecConformance, OperationCoverageSummary } from '../api/spec-conformance';

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

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

  static ofTypeNamed(typeName: string): { fundedFrom(fromAccountId: number): CreateAccount } {
    const accountType = NewAccountType[typeName as keyof typeof NewAccountType];
    assert.notEqual(accountType, undefined, `unknown account type ${typeName}`);
    return { fundedFrom: (fromAccountId: number) => new CreateAccount(accountType, fromAccountId) };
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

/** GET account/{id} without asserting status so negative flows can observe error responses. */
export class ReadAccount implements Task {
  private constructor(private readonly accountId: number) {}

  static withId(accountId: number): ReadAccount {
    return new ReadAccount(accountId);
  }

  async performAs(actor: Actor): Promise<void> {
    const rest = actor.abilityTo(CallParaBankRest);
    await rest.call((c) => c.account(this.accountId));
  }
}

/** GET customers/{id}/accounts without asserting status. */
export class ReadAccounts implements Task {
  private constructor(private readonly customerId: number) {}

  static ofCustomer(customerId: number): ReadAccounts {
    return new ReadAccounts(customerId);
  }

  async performAs(actor: Actor): Promise<void> {
    const rest = actor.abilityTo(CallParaBankRest);
    await rest.call((c) => c.accounts(this.customerId));
  }
}

/** GET accounts/{id}/transactions without asserting status. */
export class ReadTransactions implements Task {
  private constructor(private readonly accountId: number) {}

  static ofAccount(accountId: number): ReadTransactions {
    return new ReadTransactions(accountId);
  }

  async performAs(actor: Actor): Promise<void> {
    const rest = actor.abilityTo(CallParaBankRest);
    await rest.call((c) => c.transactions(this.accountId));
  }
}

/** SOAP getAccount call with unqualified parameters (fault-path exercise). */
export class CallSoapGetAccount implements Task {
  private constructor(private readonly accountId: number, private readonly qualifyParams: boolean) {}

  static withUnqualifiedParameters(accountId: number): CallSoapGetAccount {
    return new CallSoapGetAccount(accountId, false);
  }

  async performAs(actor: Actor): Promise<void> {
    const soap = actor.abilityTo(CallParaBankSoap);
    await soap.call('getAccount', { accountId: this.accountId }, { qualifyParams: this.qualifyParams });
  }
}

export type AmountBoundary = 'zero' | 'minimum-positive' | 'exact-available';

export interface BoundaryTransferObservation {
  boundary: AmountBoundary;
  amount: number;
  from: number;
  to: number;
  sourceBefore: number;
  targetBefore: number;
}

function isAmountBoundary(value: string): value is AmountBoundary {
  return value === 'zero' || value === 'minimum-positive' || value === 'exact-available';
}

function boundaryAmount(boundary: AmountBoundary, availableBalance: number): number {
  if (boundary === 'zero') return 0;
  if (boundary === 'minimum-positive') return 0.01;
  return availableBalance;
}

/** Resolves an amount boundary against live source balance and performs the transfer. */
export class TransferBoundaryAmount implements Task {
  private constructor(
    private readonly boundaryName: string,
    private readonly fromAccountId: number,
    private readonly toAccountId: number
  ) {}

  static of(boundaryName: string): {
    from(fromAccountId: number): { to(toAccountId: number): TransferBoundaryAmount };
  } {
    return {
      from: (fromAccountId: number) => ({
        to: (toAccountId: number) => new TransferBoundaryAmount(boundaryName, fromAccountId, toAccountId)
      })
    };
  }

  async performAs(actor: Actor): Promise<void> {
    assert.ok(isAmountBoundary(this.boundaryName), `unknown amount boundary '${this.boundaryName}'`);
    const source = await actor.asks(TheAccount.withId(this.fromAccountId));
    const target = await actor.asks(TheAccount.withId(this.toAccountId));
    const amount = boundaryAmount(this.boundaryName, source.balance);
    if (this.boundaryName === 'exact-available') {
      assert.ok(source.balance > 0, `exact-available source account ${this.fromAccountId} is not positive: ${source.balance}`);
    }
    const observation: BoundaryTransferObservation = {
      boundary: this.boundaryName,
      amount,
      from: this.fromAccountId,
      to: this.toAccountId,
      sourceBefore: source.balance,
      targetBefore: target.balance
    };
    actor.remember('boundaryTransfer', observation);
    await actor.attemptsTo(Transfer.of(amount).from(this.fromAccountId).to(this.toAccountId));
  }
}

/** Verifies that the previously executed boundary transfer succeeded and updated balances accordingly. */
export class VerifyBoundaryTransfer implements Task {
  static succeeded(): VerifyBoundaryTransfer {
    return new VerifyBoundaryTransfer();
  }

  async performAs(actor: Actor): Promise<void> {
    const observed = actor.recall<BoundaryTransferObservation>('boundaryTransfer');
    const response = await actor.asks(TheLastResponse.received());
    assert.equal(response.status, 200, `${observed.boundary} transfer → HTTP ${response.status}: ${response.text}`);
    assert.equal(response.contentType, 'application/json');
    assert.equal(
      response.text,
      `Successfully transferred $${observed.amount} from account #${observed.from} to account #${observed.to}`
    );

    const source = await actor.asks(TheAccount.withId(observed.from));
    const target = await actor.asks(TheAccount.withId(observed.to));
    assert.equal(source.balance, round2(observed.sourceBefore - observed.amount));
    assert.equal(target.balance, round2(observed.targetBefore + observed.amount));
    if (observed.boundary === 'exact-available') assert.equal(source.balance, 0);
  }
}

/** Verifies that the newly created account matches expected customer and type. */
export class VerifyNewAccount implements Task {
  private constructor(private readonly customerId: number, private readonly type: string) {}

  static belongsTo(customerId: number, type: string): VerifyNewAccount {
    return new VerifyNewAccount(customerId, type);
  }

  async performAs(actor: Actor): Promise<void> {
    const account = actor.recall<Account>('newAccount');
    assert.equal(account.customerId, this.customerId);
    assert.equal(account.type, this.type);
  }
}

/** Records opening balance of the newly created account. */
export class RecordOpeningBalance implements Task {
  static ofNewAccount(): RecordOpeningBalance {
    return new RecordOpeningBalance();
  }

  async performAs(actor: Actor): Promise<void> {
    const account = actor.recall<Account>('newAccount');
    const fresh = await actor.asks(TheAccount.withId(account.id));
    actor.remember('trackedBalance', fresh.balance);
  }
}

/** Verifies that account balance increased, decreased, or reached a negative state. */
export class VerifyAccountBalance implements Task {
  private constructor(
    private readonly action: 'increased' | 'decreased' | 'negative',
    private readonly amount?: number,
    private readonly accountId?: number
  ) {}

  static hasIncreasedBy(amount: number): VerifyAccountBalance {
    return new VerifyAccountBalance('increased', amount);
  }

  static hasDecreasedBy(amount: number): VerifyAccountBalance {
    return new VerifyAccountBalance('decreased', amount);
  }

  static isNegative(accountId: number): VerifyAccountBalance {
    return new VerifyAccountBalance('negative', undefined, accountId);
  }

  async performAs(actor: Actor): Promise<void> {
    if (this.action === 'negative') {
      const account = await actor.asks(TheAccount.withId(this.accountId!));
      assert.ok(account.balance < 0, `expected a negative balance, got ${account.balance}`);
      return;
    }
    const account = actor.recall<Account>('newAccount');
    const previous = actor.recall<number>('trackedBalance');
    const fresh = await actor.asks(TheAccount.withId(account.id));
    const expected = this.action === 'increased'
      ? round2(previous + this.amount!)
      : round2(previous - this.amount!);
    assert.equal(fresh.balance, expected);
    actor.remember('trackedBalance', fresh.balance);
  }
}

/** Records seeded balance of a specified account. */
export class RecordSeededBalance implements Task {
  private constructor(private readonly accountId: number) {}

  static ofAccount(accountId: number): RecordSeededBalance {
    return new RecordSeededBalance(accountId);
  }

  async performAs(actor: Actor): Promise<void> {
    const account = await actor.asks(TheAccount.withId(this.accountId));
    actor.remember('seededBalance', account.balance);
    actor.remember('seededBalanceAccountId', this.accountId);
  }
}

/** Verifies that the new account's transaction list includes the given descriptions. */
export class VerifyTransactions implements Task {
  private constructor(private readonly expectedDescriptions: string[]) {}

  static forNewAccount(): { includeDescriptions(first: string, second: string): VerifyTransactions } {
    return {
      includeDescriptions: (first: string, second: string) => new VerifyTransactions([first, second])
    };
  }

  async performAs(actor: Actor): Promise<void> {
    const account = actor.recall<Account>('newAccount');
    const transactions = await actor.asks(TheTransactions.forAccount(account.id));
    const descriptions = transactions.map((t) => t.description);
    for (const expected of this.expectedDescriptions) {
      assert.ok(
        descriptions.some((d) => d.includes(expected)),
        `no transaction description containing '${expected}' in: ${JSON.stringify(descriptions)}`
      );
    }
  }
}

/** Deposits into the newly created account. */
export class DepositIntoNewAccount implements Task {
  private constructor(private readonly amount: number) {}

  static of(amount: number): DepositIntoNewAccount {
    return new DepositIntoNewAccount(amount);
  }

  async performAs(actor: Actor): Promise<void> {
    const account = actor.recall<Account>('newAccount');
    await actor.attemptsTo(Deposit.of(this.amount).into(account.id));
  }
}

/** Transfers from the newly created account to a specified account. */
export class TransferFromNewAccount implements Task {
  private constructor(private readonly amount: number, private readonly toAccountId: number) {}

  static of(amount: number): { to(toAccountId: number): TransferFromNewAccount } {
    return {
      to: (toAccountId: number) => new TransferFromNewAccount(amount, toAccountId)
    };
  }

  async performAs(actor: Actor): Promise<void> {
    const account = actor.recall<Account>('newAccount');
    await actor.attemptsTo(Transfer.of(this.amount).from(account.id).to(this.toAccountId));
  }
}

/** Reads an account via both REST and SOAP for parity comparisons. */
export class ReadAccountViaRestAndSoap implements Task {
  private constructor(private readonly accountId: number) {}

  static withId(accountId: number): ReadAccountViaRestAndSoap {
    return new ReadAccountViaRestAndSoap(accountId);
  }

  async performAs(actor: Actor): Promise<void> {
    actor.remember('restRead', await actor.asks(TheAccount.withId(this.accountId)));
    actor.remember('soapRead', await actor.asks(TheSoapAccount.withId(this.accountId)));
  }
}

/** Verifies that REST and SOAP reads agree on id, customerId, type, and balance. */
export class VerifyRestAndSoapParity implements Task {
  static agreed(): VerifyRestAndSoapParity {
    return new VerifyRestAndSoapParity();
  }

  async performAs(actor: Actor): Promise<void> {
    const rest = actor.recall<Account>('restRead');
    const soap = actor.recall<Account>('soapRead');
    assert.deepEqual(
      { id: soap.id, customerId: soap.customerId, type: soap.type, balance: soap.balance },
      { id: rest.id, customerId: rest.customerId, type: rest.type, balance: rest.balance }
    );
  }
}

/** Verifies that the agreed REST/SOAP balance is higher than the seeded balance by the given amount. */
export class VerifyAgreedBalance implements Task {
  private constructor(private readonly higherAmount: number) {}

  static isHigherThanSeededBy(amount: number): VerifyAgreedBalance {
    return new VerifyAgreedBalance(amount);
  }

  async performAs(actor: Actor): Promise<void> {
    const rest = actor.recall<Account>('restRead');
    const seeded = actor.recall<number>('seededBalance');
    assert.equal(rest.balance, round2(seeded + this.higherAmount));
  }
}

/** Verifies status code or body of the last REST response. */
export class VerifyResponse implements Task {
  private constructor(
    private readonly kind: 'status' | 'text' | 'empty',
    private readonly expectedStatus?: number,
    private readonly expectedText?: string
  ) {}

  static hasStatus(status: number): VerifyResponse {
    return new VerifyResponse('status', status);
  }

  static hasPlainTextBody(text: string): VerifyResponse {
    return new VerifyResponse('text', undefined, text);
  }

  static hasEmptyBody(): VerifyResponse {
    return new VerifyResponse('empty');
  }

  async performAs(actor: Actor): Promise<void> {
    const last = await actor.asks(TheLastResponse.received());
    if (this.kind === 'status') {
      assert.equal(last.status, this.expectedStatus, `expected HTTP ${this.expectedStatus}, got ${last.status}: ${last.text}`);
    } else if (this.kind === 'text') {
      assert.equal(last.text, this.expectedText);
    } else if (this.kind === 'empty') {
      assert.equal(last.text, '', `expected an empty body, got: ${last.text}`);
    }
  }
}

/** Verifies that the last REST response conforms to an approved operation specification. */
export class VerifyOperationConformance implements Task {
  private constructor(private readonly operationName: string, private readonly spec: SpecConformance) {}

  static forSpec(spec: SpecConformance): { conformsTo(operationName: string): VerifyOperationConformance } {
    return {
      conformsTo: (operationName: string) => new VerifyOperationConformance(operationName, spec)
    };
  }

  async performAs(actor: Actor): Promise<void> {
    assert.ok(isOperationName(this.operationName), `unknown approved operation '${this.operationName}'`);
    const last = await actor.asks(TheLastResponse.received());
    this.spec.assertOperation(this.operationName, last);
  }
}

/** Verifies approved REST operations contract coverage. */
export class VerifyContractCoverage implements Task {
  private constructor(private readonly expectedCount: number, private readonly spec: SpecConformance) {}

  static forSpec(spec: SpecConformance): { hasExpectedCount(count: number): VerifyContractCoverage } {
    return {
      hasExpectedCount: (count: number) => new VerifyContractCoverage(count, spec)
    };
  }

  async performAs(actor: Actor): Promise<void> {
    const summary = actor.recall<OperationCoverageSummary>('restContractCoverage');
    assert.equal(summary.expected.length, this.expectedCount, 'approved operation count drifted');
    assert.deepEqual(summary.missing, [], `missing operation evidence: ${summary.missing.join(', ')}`);
    console.log(`\n${this.spec.formatCoverageSummary()}\n`);
  }
}

/** Verifies SOAP response status or fault mention. */
export class VerifySoapResponse implements Task {
  private constructor(
    private readonly kind: 'status' | 'fault',
    private readonly expectedStatus?: number,
    private readonly expectedMention?: string
  ) {}

  static hasStatus(status: number): VerifySoapResponse {
    return new VerifySoapResponse('status', status);
  }

  static faultMentions(text: string): VerifySoapResponse {
    return new VerifySoapResponse('fault', undefined, text);
  }

  async performAs(actor: Actor): Promise<void> {
    if (this.kind === 'status') {
      const status = await actor.asks(TheSoapResponse.status());
      assert.equal(status, this.expectedStatus);
    } else {
      const fault = (await actor.asks(TheSoapResponse.fault())) ?? '(no fault)';
      assert.ok(fault.includes(this.expectedMention!), `fault '${fault}' does not mention '${this.expectedMention}'`);
    }
  }
}
