import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertExactCurrency,
  formatCurrency,
  isExactCurrencyMatch,
  parseCurrencyToMinorUnits,
  toMinorUnits
} from '../../src/quality/currency';

test('formatCurrency produces exact two-decimal dollar representations', () => {
  assert.equal(formatCurrency(100), '$100.00');
  assert.equal(formatCurrency(75), '$75.00');
  assert.equal(formatCurrency(75.5), '$75.50');
  assert.equal(formatCurrency(0.01), '$0.01');
  assert.equal(formatCurrency(1234.56), '$1234.56');
});

test('toMinorUnits converts floating-point dollar amounts to integer cents', () => {
  assert.equal(toMinorUnits(75), 7500);
  assert.equal(toMinorUnits(100), 10000);
  assert.equal(toMinorUnits(75.01), 7501);
  assert.equal(toMinorUnits(75.99), 7599);
  assert.equal(toMinorUnits(0.01), 1);
});

test('parseCurrencyToMinorUnits parses valid delimited currency values', () => {
  assert.equal(parseCurrencyToMinorUnits('$75.00'), 7500);
  assert.equal(parseCurrencyToMinorUnits('75.00'), 7500);
  assert.equal(parseCurrencyToMinorUnits('$100.00'), 10000);
  assert.equal(parseCurrencyToMinorUnits('$1,250.50'), 125050);
  assert.equal(parseCurrencyToMinorUnits('  $50.00  '), 5000);
});

test('parseCurrencyToMinorUnits rejects unanchored, malformed, or missing-cents strings', () => {
  const invalidInputs = [
    '$75', // missing cents
    '75', // missing cents
    '$75.0', // single decimal
    'Account 12375', // unanchored text
    'The transfer of $75.00 was successful', // unanchored sentence
    '$175.00.00',
    'abc',
    ''
  ];

  for (const input of invalidInputs) {
    assert.throws(
      () => parseCurrencyToMinorUnits(input),
      RangeError,
      `Expected RangeError for invalid input "${input}"`
    );
  }
});

test('MUST-FAIL / ACCEPTANCE: isExactCurrencyMatch strictly rejects false positives for expected $75.00', () => {
  const expectedAmount = 75.0;

  // Exact match passes
  assert.equal(isExactCurrencyMatch('$75.00', expectedAmount), true);
  assert.equal(isExactCurrencyMatch('75.00', expectedAmount), true);

  // TRIAGE-04 acceptance criteria: expected 75 rejects 175/750 and incorrect cents
  const falsePositives = [
    '$175.00', // substring "75" present in 175
    '$750.00', // substring "75" present in 750
    '$75.01', // wrong cents (off by 1 cent)
    '$75.99', // wrong cents
    '$7.50', // wrong magnitude
    '$75', // missing cents
    'Account 12375', // unanchored account number containing 75
    'Bill Payment to John for $75.00' // unanchored sentence
  ];

  for (const candidate of falsePositives) {
    assert.equal(
      isExactCurrencyMatch(candidate, expectedAmount),
      false,
      `Expected "${candidate}" to be rejected for expected $75.00`
    );
  }
});

test('assertExactCurrency passes on exact match and throws on mismatch or malformed text', () => {
  assert.doesNotThrow(() => assertExactCurrency('$75.00', 75));
  assert.doesNotThrow(() => assertExactCurrency('$100.00', 100));

  assert.throws(
    () => assertExactCurrency('$175.00', 75),
    (err: unknown) =>
      err instanceof RangeError &&
      err.message.includes('17500 cents') &&
      err.message.includes('7500 cents')
  );

  assert.throws(
    () => assertExactCurrency('$75.01', 75),
    (err: unknown) =>
      err instanceof RangeError &&
      err.message.includes('7501 cents') &&
      err.message.includes('7500 cents')
  );
});
