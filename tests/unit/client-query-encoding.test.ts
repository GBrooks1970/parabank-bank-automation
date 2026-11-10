import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ParaBankRestClient, buildQueryUrl } from '../../src/api/client';

async function withFetchSpy(body: (calls: string[]) => Promise<void>): Promise<void> {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input instanceof Request ? input.url : input));
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }) as typeof fetch;
  try {
    await body(calls);
  } finally {
    globalThis.fetch = original;
  }
}

test('buildQueryUrl encodes query parameters with URLSearchParams', () => {
  const url = buildQueryUrl('http://localhost:8090/parabank/services/bank/createAccount', {
    customerId: 12212,
    newAccountType: 0,
    fromAccountId: 12345
  });
  assert.equal(
    url,
    'http://localhost:8090/parabank/services/bank/createAccount?customerId=12212&newAccountType=0&fromAccountId=12345'
  );

  // Omits undefined values and preserves zero
  const withUndefined = buildQueryUrl('http://localhost:8090/test', {
    a: 0,
    b: undefined,
    c: 'present'
  });
  assert.equal(withUndefined, 'http://localhost:8090/test?a=0&c=present');

  // Returns base path unchanged if all parameters are undefined
  assert.equal(buildQueryUrl('http://localhost:8090/test', { a: undefined }), 'http://localhost:8090/test');
});

test('buildQueryUrl encodes injection attempts such as 5&amount=1 preventing parameter pollution', () => {
  const url = buildQueryUrl('http://localhost:8090/parabank/services/bank/transfer', {
    fromAccountId: 12345,
    toAccountId: 54321,
    amount: '5&amount=1'
  });

  // Parameter value is percent-encoded, not concatenated as a second parameter
  assert.equal(
    url,
    'http://localhost:8090/parabank/services/bank/transfer?fromAccountId=12345&toAccountId=54321&amount=5%26amount%3D1'
  );

  // Parsing the generated URL confirms exactly ONE 'amount' parameter exists
  const parsed = new URL(url);
  const amountParams = parsed.searchParams.getAll('amount');
  assert.equal(amountParams.length, 1);
  assert.equal(amountParams[0], '5&amount=1');

  // Contrast against naive concatenation:
  const naiveUrl = `http://localhost:8090/parabank/services/bank/transfer?fromAccountId=12345&toAccountId=54321&amount=${'5&amount=1'}`;
  const naiveParsed = new URL(naiveUrl);
  assert.equal(naiveParsed.searchParams.getAll('amount').length, 2, 'naive concatenation causes parameter pollution');
});

test('buildQueryUrl encodes special characters (+, #, spaces, unicode)', () => {
  const url = buildQueryUrl('http://localhost:8090/parabank/services/bank/deposit', {
    accountId: 12345,
    amount: '100+50#bonus 1'
  });
  assert.equal(
    url,
    'http://localhost:8090/parabank/services/bank/deposit?accountId=12345&amount=100%2B50%23bonus+1'
  );

  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('amount'), '100+50#bonus 1');
});

test('buildQueryUrl honours rawQuery escape hatch verbatim', () => {
  const urlWithoutLeadingQuestion = buildQueryUrl(
    'http://localhost:8090/parabank/services/bank/transfer',
    { fromAccountId: 1, toAccountId: 2, amount: 3 },
    { rawQuery: 'fromAccountId=123&toAccountId=456&amount=5&amount=1' }
  );
  assert.equal(
    urlWithoutLeadingQuestion,
    'http://localhost:8090/parabank/services/bank/transfer?fromAccountId=123&toAccountId=456&amount=5&amount=1'
  );

  // Leading question mark in rawQuery is stripped rather than duplicated as ??
  const urlWithLeadingQuestion = buildQueryUrl(
    'http://localhost:8090/parabank/services/bank/transfer',
    {},
    { rawQuery: '?raw=true&broken=yes' }
  );
  assert.equal(
    urlWithLeadingQuestion,
    'http://localhost:8090/parabank/services/bank/transfer?raw=true&broken=yes'
  );
});

test('ParaBankRestClient query methods construct URLSearchParams-encoded requests', async () => {
  await withFetchSpy(async (calls) => {
    const client = new ParaBankRestClient('http://localhost:8090');

    await client.createAccount(12212, 0, 12345);
    await client.deposit(12345, 100.5);
    await client.withdraw(12345, 25);
    await client.transfer(12345, 12456, '5&amount=1');
    await client.requestLoan(12212, 5000, 1000, 12345);

    // FR-B4 "abc" negative partition
    await client.transfer(12345, 12456, 'abc');

    // rawQuery escape hatch
    await client.transfer(12345, 12456, 0, { rawQuery: 'fromAccountId=999&amount=raw' });

    assert.deepEqual(calls, [
      'http://localhost:8090/parabank/services/bank/createAccount?customerId=12212&newAccountType=0&fromAccountId=12345',
      'http://localhost:8090/parabank/services/bank/deposit?accountId=12345&amount=100.5',
      'http://localhost:8090/parabank/services/bank/withdraw?accountId=12345&amount=25',
      'http://localhost:8090/parabank/services/bank/transfer?fromAccountId=12345&toAccountId=12456&amount=5%26amount%3D1',
      'http://localhost:8090/parabank/services/bank/requestLoan?customerId=12212&amount=5000&downPayment=1000&fromAccountId=12345',
      'http://localhost:8090/parabank/services/bank/transfer?fromAccountId=12345&toAccountId=12456&amount=abc',
      'http://localhost:8090/parabank/services/bank/transfer?fromAccountId=999&amount=raw'
    ]);
  });
});

test('architecture guard: src/api/client.ts contains 0 template-string query concatenations', () => {
  const source = readFileSync(join('src', 'api', 'client.ts'), 'utf8');

  // Detect unencoded query string interpolations of the form `?<param>=${...}` or `?<anything>?${...}`
  const matches = source.match(/\?[a-zA-Z0-9_-]+=\$\{/g) ?? [];
  assert.equal(
    matches.length,
    0,
    `src/api/client.ts must not concatenate query parameters via template literals: found ${JSON.stringify(matches)}`
  );

  // Ensure all 5 query methods call buildQueryUrl
  const expectedMethods = ['createAccount', 'deposit', 'withdraw', 'transfer', 'requestLoan'];
  for (const method of expectedMethods) {
    assert.ok(
      source.includes(`buildQueryUrl(\`\${this.services}/${method}\``),
      `ParaBankRestClient.${method} must use buildQueryUrl`
    );
  }
});
