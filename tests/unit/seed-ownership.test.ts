import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SEED_OWNER_ENV,
  SMOKE_SAFETY_OWNER,
  assertResetAllowed,
  seedOwnedExternally
} from '../../src/quality/seed-ownership';

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

test('assertResetAllowed throws descriptive error when smoke-safety owns the seed state', () => {
  assert.throws(
    () => assertResetAllowed('Mutating account scenario', { [SEED_OWNER_ENV]: SMOKE_SAFETY_OWNER }),
    {
      name: 'Error',
      message:
        'smoke-safety owns the seed state; scenario "Mutating account scenario" would reset it. @smoke scenarios must not trigger a reset hook.'
    }
  );
});

test('assertResetAllowed passes silently when seed state is not owned externally', () => {
  assert.doesNotThrow(() => assertResetAllowed('Normal scenario', {}));
  assert.doesNotThrow(() => assertResetAllowed('Normal scenario', { [SEED_OWNER_ENV]: '' }));
  assert.doesNotThrow(() => assertResetAllowed('Normal scenario', { [SEED_OWNER_ENV]: 'other' }));
});
