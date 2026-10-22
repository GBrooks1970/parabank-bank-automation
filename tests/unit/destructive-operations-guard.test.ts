import assert from 'node:assert/strict';
import test from 'node:test';
import { ParaBankRestClient } from '../../src/api/client';
import { seedDatabase } from '../../src/api/reset';

/**
 * DR-PB-13: the destructive/admin operations themselves refuse any host but the local SUT,
 * whoever calls them and however they got the URL. A stubbed fetch proves no request leaves.
 */
const REMOTE = 'https://parabank.parasoft.com';

async function withFetchSpy(body: (calls: string[]) => Promise<void>): Promise<void> {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input instanceof Request ? input.url : input));
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  try {
    await body(calls);
  } finally {
    globalThis.fetch = original;
  }
}

const isGuardRefusal = (error: unknown) => error instanceof Error && error.message.includes('DR-PB-13');

test('ParaBankRestClient destructive operations refuse a remote host before any request', async () => {
  await withFetchSpy(async (calls) => {
    const client = new ParaBankRestClient(REMOTE);
    await assert.rejects(async () => client.initializeDB(), isGuardRefusal);
    await assert.rejects(async () => client.cleanDB(), isGuardRefusal);
    await assert.rejects(async () => client.setParameter('loanProvider', 'local'), isGuardRefusal);
    assert.deepEqual(calls, [], 'no request may be sent to a remote host');
  });
});

test('ParaBankRestClient destructive operations still reach the local SUT', async () => {
  await withFetchSpy(async (calls) => {
    const client = new ParaBankRestClient('http://localhost:8090');
    assert.equal((await client.initializeDB()).status, 204);
    assert.deepEqual(calls, ['http://localhost:8090/parabank/services/bank/initializeDB']);
  });
});

test('seedDatabase refuses a remote host before any request', async () => {
  await withFetchSpy(async (calls) => {
    await assert.rejects(() => seedDatabase(REMOTE, 1_000), isGuardRefusal);
    assert.deepEqual(calls, []);
  });
});
