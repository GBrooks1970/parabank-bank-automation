/**
 * Currency utilities for parsing and exact minor-unit comparisons.
 *
 * Implements the acceptance criteria for TRIAGE-04 (review R-04 / Claude v1 R-06):
 * replaces unanchored substring matching with exact formatted currency and
 * minor-unit (cents) validation.
 */

const CURRENCY_PATTERN = /^\$?\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)\.([0-9]{2})$/;

/**
 * Converts a floating-point dollar amount to integer minor units (cents).
 */
export function toMinorUnits(amount: number): number {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    throw new TypeError(`Expected a numeric amount, got: ${String(amount)}`);
  }
  return Math.round(amount * 100);
}

/**
 * Formats a numeric dollar amount to exact currency representation with 2 decimal places.
 * Matches ParaBank SUT client formatting ('$' + amount.toFixed(2)).
 */
export function formatCurrency(amount: number): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    throw new TypeError(`Expected a numeric amount, got: ${String(amount)}`);
  }
  return `$${amount.toFixed(2)}`;
}

/**
 * Parses a formatted currency string into minor units (integer cents).
 * Strictly requires anchored format with two decimal places (e.g. "$75.00", "75.00", "$1,250.50").
 * Rejects unanchored text, missing cents, or non-currency strings.
 */
export function parseCurrencyToMinorUnits(raw: string): number {
  if (typeof raw !== 'string') {
    throw new TypeError(`Expected a string currency value, got: ${typeof raw}`);
  }

  const trimmed = raw.trim();
  const match = CURRENCY_PATTERN.exec(trimmed);

  if (!match) {
    throw new RangeError(
      `Cannot parse currency from "${raw}": expected delimited currency format like "$75.00"`
    );
  }

  const dollars = parseInt(match[1].replace(/,/g, ''), 10);
  const cents = parseInt(match[2], 10);
  return dollars * 100 + cents;
}

/**
 * Checks whether a displayed currency string matches an expected dollar amount in minor units.
 * Returns false if the displayed string cannot be parsed as delimited currency or amounts differ.
 */
export function isExactCurrencyMatch(rawText: string, expectedAmount: number): boolean {
  try {
    const displayedCents = parseCurrencyToMinorUnits(rawText);
    const expectedCents = toMinorUnits(expectedAmount);
    return displayedCents === expectedCents;
  } catch {
    return false;
  }
}

/**
 * Asserts that a displayed currency string matches an expected dollar amount in minor units.
 * Throws a RangeError if the currency does not match or cannot be parsed.
 */
export function assertExactCurrency(rawText: string, expectedAmount: number): void {
  const displayedCents = parseCurrencyToMinorUnits(rawText);
  const expectedCents = toMinorUnits(expectedAmount);
  if (displayedCents !== expectedCents) {
    throw new RangeError(
      `Currency mismatch: displayed "${rawText}" (${displayedCents} cents) does not match expected $${expectedAmount.toFixed(2)} (${expectedCents} cents)`
    );
  }
}
