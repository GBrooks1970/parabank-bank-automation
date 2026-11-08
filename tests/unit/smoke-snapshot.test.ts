import assert from 'node:assert/strict';
import test from 'node:test';
import { canonical, diffSnapshots, type SeedSnapshot } from '../../src/quality/smoke-snapshot';

const seeded = (): SeedSnapshot => ({
  accounts: [
    { id: 12345, customerId: 12212, type: 'CHECKING', balance: -2300.0 },
    { id: 12456, customerId: 12212, type: 'CHECKING', balance: 10.45 }
  ],
  transactions: {
    '12345': [{ id: 1, accountId: 12345, type: 'Debit', amount: 100.0, description: 'Funds Transfer Sent' }],
    '12456': []
  }
});

test('identical snapshots have no differences, whatever the key order', () => {
  const reordered: SeedSnapshot = {
    transactions: {
      '12456': [],
      '12345': [{ description: 'Funds Transfer Sent', amount: 100.0, type: 'Debit', accountId: 12345, id: 1 }]
    },
    accounts: [
      { balance: -2300.0, type: 'CHECKING', customerId: 12212, id: 12345 },
      { balance: 10.45, type: 'CHECKING', customerId: 12212, id: 12456 }
    ]
  };
  assert.deepEqual(diffSnapshots(seeded(), seeded()), []);
  assert.deepEqual(diffSnapshots(seeded(), reordered), []);
  assert.equal(canonical({ b: 1, a: { d: 2, c: 3 } }), '{"a":{"c":3,"d":2},"b":1}');
});

test('a balance change names the account, the field and both values', () => {
  const after = seeded();
  (after.accounts[0] as { balance: number }).balance = -2299.99;
  assert.deepEqual(diffSnapshots(seeded(), after), ['account 12345 balance changed from -2300 to -2299.99']);
});

test('an extra transaction names the account and the new entry', () => {
  const after = seeded();
  after.transactions['12456'] = [{ id: 2, accountId: 12456, type: 'Credit', amount: 0.01, description: 'Deposit via Web Service' }];
  const differences = diffSnapshots(seeded(), after);
  assert.equal(differences.length, 1);
  assert.match(differences[0], /^account 12456 transactions changed from 0 to 1 entries; first difference at #0: /);
  assert.match(differences[0], /"amount":0\.01/);
});

test('added and removed accounts are both named', () => {
  const after = seeded();
  after.accounts = [after.accounts[0], { id: 99999, customerId: 12212, type: 'SAVINGS', balance: 0 }];
  assert.deepEqual(diffSnapshots(seeded(), after), ['account 12456 was removed', 'account 99999 was added']);
});
