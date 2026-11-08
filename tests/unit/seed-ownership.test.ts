import assert from 'node:assert/strict';
import test from 'node:test';
import { SEED_OWNER_ENV, SMOKE_SAFETY_OWNER, seedOwnedExternally } from '../../src/quality/seed-ownership';

test('seed ownership is taken only by the exact smoke-safety value', () => {
  assert.equal(SEED_OWNER_ENV, 'PARABANK_SEED_OWNER');
  assert.equal(seedOwnedExternally({ [SEED_OWNER_ENV]: SMOKE_SAFETY_OWNER }), true);
});

test('unset, empty or unexpected values leave normal seeding on', () => {
  assert.equal(seedOwnedExternally({}), false);
  assert.equal(seedOwnedExternally({ [SEED_OWNER_ENV]: '' }), false);
  for (const value of ['1', 'true', 'Smoke-Safety', ' smoke-safety', 'smoke-safety ', 'someone-else']) {
    assert.equal(seedOwnedExternally({ [SEED_OWNER_ENV]: value }), false, value);
  }
});

test('the default reads process.env', () => {
  const previous = process.env[SEED_OWNER_ENV];
  try {
    process.env[SEED_OWNER_ENV] = SMOKE_SAFETY_OWNER;
    assert.equal(seedOwnedExternally(), true);
    delete process.env[SEED_OWNER_ENV];
    assert.equal(seedOwnedExternally(), false);
  } finally {
    if (previous === undefined) delete process.env[SEED_OWNER_ENV];
    else process.env[SEED_OWNER_ENV] = previous;
  }
});
