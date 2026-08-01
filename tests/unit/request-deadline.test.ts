import assert from 'node:assert/strict';
import test from 'node:test';
import {
  credentialSafePath,
  withRequestDeadline,
  RequestDeadlineError
} from '../../src/api/request-deadline';

test('deadline aborts the request and reports only contextual, credential-safe details', async () => {
  let requestWasAborted = false;
  const stalledFetch = async (_url: string, init: RequestInit): Promise<Response> => {
    const suppliedSignal = init.signal;
    return await new Promise<Response>((_resolve, reject) => {
      suppliedSignal?.addEventListener(
        'abort',
        () => {
          requestWasAborted = suppliedSignal.aborted;
          reject(suppliedSignal.reason);
        },
        { once: true }
      );
    });
  };

  await assert.rejects(
    withRequestDeadline(
      { method: 'GET' },
      {
        operation: 'REST login',
        safePath: '/parabank/services/bank/login/alice/swordfish?token=hidden',
        timeoutMs: 20
      },
      async (signal) => stalledFetch(
        'https://alice:swordfish@example.invalid/parabank/services/bank/login/alice/swordfish?token=hidden',
        { method: 'GET', signal }
      )
    ),
    (error: unknown) => {
      assert.ok(error instanceof RequestDeadlineError);
      assert.equal(error.method, 'GET');
      assert.equal(error.operation, 'REST login');
      assert.equal(error.safePath, '/parabank/services/bank/login/{username}/{password}');
      assert.equal(error.timeoutMs, 20);
      assert.match(error.message, /REST login \[GET \/parabank\/services\/bank\/login\/\{username\}\/\{password\}\] after 20ms/);
      assert.doesNotMatch(error.message, /alice|swordfish|token|example\.invalid/);
      return true;
    }
  );
  assert.equal(requestWasAborted, true);
});

test('caller abort is forwarded without being misreported as a deadline', async () => {
  const caller = new AbortController();
  const callerReason = new Error('scenario stopped');
  const stalledFetch = async (_url: string, init: RequestInit): Promise<Response> =>
    await new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    });

  const request = withRequestDeadline(
    { method: 'POST', signal: caller.signal },
    { operation: 'SOAP getAccount', safePath: '/parabank/services/ParaBank', timeoutMs: 1_000 },
    async (signal) => stalledFetch(
      'http://localhost/parabank/services/ParaBank',
      { method: 'POST', signal }
    )
  );
  caller.abort(callerReason);

  await assert.rejects(request, (error: unknown) => error === callerReason);
});

test('credentialSafePath removes origins, queries, fragments, and login credentials', () => {
  assert.equal(
    credentialSafePath('https://example.invalid/parabank/services/bank/login/john/demo?token=secret#fragment'),
    '/parabank/services/bank/login/{username}/{password}'
  );
});
