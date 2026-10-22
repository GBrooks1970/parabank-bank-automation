import assert from 'node:assert/strict';
import test from 'node:test';
import { assertLocalSut, isLoopbackUrl } from '../../src/quality/target-guard';

test('isLoopbackUrl accepts only loopback http(s) hosts', () => {
  for (const url of ['http://localhost:8090', 'http://127.0.0.1:8090', 'http://[::1]:8090', 'https://LOCALHOST:8090/parabank']) {
    assert.equal(isLoopbackUrl(url), true, url);
  }
  for (const url of [
    'https://parabank.parasoft.com',
    'http://host.docker.internal:8090',
    'http://192.168.1.10:8090',
    'http://localhost.example.com:8090',
    'ftp://localhost',
    'not a url'
  ]) {
    assert.equal(isLoopbackUrl(url), false, url);
  }
});

test('assertLocalSut passes the local SUT and refuses a remote host with an explanatory message', () => {
  assert.doesNotThrow(() => assertLocalSut('http://localhost:8090', 'The API lane'));
  assert.throws(
    () => assertLocalSut('https://parabank.parasoft.com', 'The API lane'),
    (error: unknown) =>
      error instanceof Error &&
      error.message.startsWith('The API lane refuses PARABANK_URL=https://parabank.parasoft.com') &&
      error.message.includes('initializeDB') &&
      error.message.includes('DR-PB-13')
  );
});
