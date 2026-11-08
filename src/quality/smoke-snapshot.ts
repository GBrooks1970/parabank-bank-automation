/**
 * TRIAGE-02: the state the smoke-safety proof measures, and a readable difference between two
 * observations of it. Pure and SUT-independent, so it is unit-tested without ParaBank.
 *
 * Measured scope: the seeded customer's accounts (as listed by GET /customers/{id}/accounts) and,
 * for each of those accounts, its transactions (GET /accounts/{id}/transactions). Admin parameters,
 * other customers and customers registered during a run are NOT measured.
 */

export interface SeedSnapshot {
  /** The accounts list, as returned. */
  accounts: unknown[];
  /** Each listed account's transactions, keyed by account id. */
  transactions: Record<string, unknown[]>;
}

/** Stable serialisation: object keys sorted at every level, array order kept. */
export function canonical(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(source)
        .sort()
        .map((key) => [key, sortKeys(source[key])])
    );
  }
  return value;
}

function accountId(account: unknown): string {
  if (account !== null && typeof account === 'object' && 'id' in account) {
    return String((account as { id: unknown }).id);
  }
  return canonical(account);
}

function byId(accounts: unknown[]): Map<string, Record<string, unknown>> {
  return new Map(accounts.map((account) => [accountId(account), (account ?? {}) as Record<string, unknown>]));
}

/**
 * Lists every difference between two snapshots in words; an empty list means unchanged.
 * Names added and removed accounts, each changed account field with both values, and each
 * account whose transaction list changed, with both counts and the first differing entry.
 */
export function diffSnapshots(before: SeedSnapshot, after: SeedSnapshot): string[] {
  const differences: string[] = [];
  const beforeAccounts = byId(before.accounts);
  const afterAccounts = byId(after.accounts);

  for (const [id, account] of beforeAccounts) {
    const now = afterAccounts.get(id);
    if (!now) {
      differences.push(`account ${id} was removed`);
      continue;
    }
    const fields = new Set([...Object.keys(account), ...Object.keys(now)]);
    for (const field of [...fields].sort()) {
      const was = canonical(account[field]);
      const is = canonical(now[field]);
      if (was !== is) differences.push(`account ${id} ${field} changed from ${was} to ${is}`);
    }
  }
  for (const id of afterAccounts.keys()) {
    if (!beforeAccounts.has(id)) differences.push(`account ${id} was added`);
  }

  const ids = new Set([...Object.keys(before.transactions), ...Object.keys(after.transactions)]);
  for (const id of [...ids].sort()) {
    const was = before.transactions[id] ?? [];
    const is = after.transactions[id] ?? [];
    if (canonical(was) === canonical(is)) continue;
    const length = Math.max(was.length, is.length);
    let index = 0;
    while (index < length && canonical(was[index]) === canonical(is[index])) index += 1;
    const first = index < is.length ? canonical(is[index]) : `(missing; was ${canonical(was[index])})`;
    differences.push(
      `account ${id} transactions changed from ${was.length} to ${is.length} entries; first difference at #${index}: ${first}`
    );
  }
  return differences;
}
