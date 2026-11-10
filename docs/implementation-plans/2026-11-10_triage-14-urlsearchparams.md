---
version: 1
created: 2026-11-10T14:20Z
project: parabank-bank-automation
type: implementation-plan
item: TRIAGE-14 (approved worklist item; proposed backlog candidate)
status: approved
approved: 2026-11-10 (owner)
presented: 2026-11-10
language: en-GB
---

# Implementation plan: TRIAGE-14, encode REST query values with URLSearchParams

**Goal.** Replace template-string query parameter concatenations in `src/api/client.ts` (`createAccount`, `deposit`, `withdraw`, `transfer`, `requestLoan`) with `URLSearchParams`, eliminating query parameter pollution and injection risks (Claude v1 review finding R-09, score 4, LOW). Provide an explicitly named `rawQuery` escape hatch on request options for deliberately unencoded queries. Author unit tests proving parameter injection values like `5&amount=1` are encoded safely and an architecture check verifying zero template query concatenations remain in `src/api/client.ts`. Ensure all regression test suites, contract matrices, and the B4 `"abc"` negative partition pass cleanly.

**Sources.**
- Worklist `WORKLIST_parabank-bank-automation.md`: item TRIAGE-14 (`Claude v1 R-09 (LOW, 4)`).
- Review findings: Claude v1 review R-09 in `.review/CODE_REVIEW_Claude_v1_20261105T1412Z/02_RISKS_AND_ISSUES.md` §2.9 and `05_RECOMMENDATIONS.md`.
- Key files:
  - `src/api/client.ts` (ParaBank REST client)
  - `tests/unit/client-query-encoding.test.ts` (new unit test suite for query parameter encoding and architecture guard)
  - `docs/backlog.md` (Version 47, tracking TRIAGE-14 delivery)
  - `docs/qa-strategy.md` (unit test inventory update)

---

## Evidence Gathered Before Planning

All reads conducted in worktree `wt-parabank-t14` on branch `worklist/triage-14-urlsearchparams` tracking `origin/main` at `9d20f60` (following TRIAGE-13 delivery outcome merge), with Node 24.18.0 and npm 11.16.0.

1. **Template String Query Concatenation in `src/api/client.ts`:**
   - Audit of `src/api/client.ts` revealed that exactly five methods construct query strings using template literals:
     - Line 66 (`createAccount`): `${this.services}/createAccount?customerId=${customerId}&newAccountType=${newAccountType}&fromAccountId=${fromAccountId}`
     - Line 71 (`deposit`): `${this.services}/deposit?accountId=${accountId}&amount=${amount}`
     - Line 75 (`withdraw`): `${this.services}/withdraw?accountId=${accountId}&amount=${amount}`
     - Line 83 (`transfer`): `${this.services}/transfer?fromAccountId=${fromAccountId}&toAccountId=${toAccountId}&amount=${amount}`
     - Line 91 (`requestLoan`): `${this.services}/requestLoan?customerId=${customerId}&amount=${amount}&downPayment=${downPayment}&fromAccountId=${fromAccountId}`
   - In contrast, path segments in `login` (line 43) and `setParameter` (line 99) already use `encodeURIComponent`.
   - Because `amount` is typed `number | string` (to support sending malformed values in negative testing), any string value containing `&`, `+`, `#`, `%`, or spaces would alter the query structure (parameter pollution) instead of being delivered as the value of the `amount` parameter.

2. **Impact on Negative Partition in `b4-negative-paths.feature`:**
   - `features/api/b4-negative-paths.feature:15`: `When he transfers "abc" from account 12345 to account 12456`.
   - String `"abc"` contains only ASCII alphanumeric characters. `URLSearchParams.set('amount', 'abc')` produces `amount=abc`, which is byte-for-byte identical to the template string. The SUT will continue returning HTTP 404 with empty body as asserted.

3. **Current Test Baseline:**
   - Unit tests: 93/93 pass across 16 test suites (`npm run test:unit`).
   - SUT functional tests: 14 API scenarios (`npm run test:api`) and 8 UI scenarios (`npm run test:ui`) pass.
   - SUT smoke safety: `npm run check:smoke-safety` clean.

---

## Key Decisions

### Decision D-T14-1: Request Options and `rawQuery` Escape Hatch
- **Context:** The acceptance criteria and review R-09 recommend: "If a raw, intentionally malformed query is ever needed, add an explicit `rawQuery` escape hatch named as such, so intent is visible in review."
- **Decision:**
  - Define and export `RequestOptions`:
    ```typescript
    export interface RequestOptions {
      /**
       * Explicit escape hatch for sending an unencoded/raw query string on purpose
       * (e.g. testing malformed query strings or raw injection attempts).
       * When provided, this query string is appended verbatim (`?${rawQuery}`)
       * instead of building and encoding parameters with URLSearchParams.
       */
      rawQuery?: string;
    }
    ```
  - Implement a helper function `buildQueryUrl(basePath: string, params: Record<string, string | number | undefined>, options?: RequestOptions): string`.
  - When `options?.rawQuery` is present, normalize away any leading `?` and append `?${rawQuery}` directly to `basePath`.
  - Add optional `options?: RequestOptions` to `createAccount`, `deposit`, `withdraw`, `transfer`, and `requestLoan`.
- **Alternatives Considered:**
  - *No escape hatch:* Rejected because testing servers' responses to invalid query syntax (e.g. trailing ampersands or duplicate keys) requires raw queries, and the review specifically asked for an explicit, named escape hatch.
  - *Allowing raw strings directly in `amount`:* Rejected because mixing raw query syntax into parameter values defeats encoding. The escape hatch must operate at the query-string level with clear naming.

### Decision D-T14-2: Encoding Semantics via `URLSearchParams`
- **Context:** `createAccount`, `deposit`, `withdraw`, `transfer`, and `requestLoan` take numbers and strings (including `0`, `0.01`, negative numbers, and strings like `"abc"`).
- **Decision:**
  - In `buildQueryUrl`, iterate through `params`:
    ```typescript
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const query = searchParams.toString();
    return query ? `${basePath}?${query}` : basePath;
    ```
  - Standard `URLSearchParams` encodes:
    - `&` as `%26`
    - `=` as `%3D`
    - `+` as `%2B`
    - `#` as `%23`
    - space as `+` (or `%20`)
  - An input such as `amount = '5&amount=1'` becomes `amount=5%26amount%3D1`. The server receives a single parameter named `amount` with value `"5&amount=1"`, preventing parameter pollution.
- **Alternatives Considered:**
  - *Manual `encodeURIComponent` concatenation (`?key=${encodeURIComponent(val)}`):* Rejected because `URLSearchParams` is the standard Web API for query strings in Node.js and browsers, correctly handles keys and values, and conforms to standard query serialization.

### Decision D-T14-3: Architecture Guard for Template String Elimination
- **Context:** To ensure that future endpoints or refactorings do not reintroduce unencoded query concatenations.
- **Decision:**
  - In `tests/unit/client-query-encoding.test.ts`, include an architecture test that statically scans `src/api/client.ts` and asserts 0 occurrences of template literal query concatenations (matching regex `/\?\$\{[^}]+\}/`).

---

## Detailed Step-by-Step Implementation Plan

### 1. Update `src/api/client.ts`
- Export `RequestOptions` interface with `rawQuery?: string`.
- Implement `buildQueryUrl(basePath: string, params: Record<string, string | number | undefined>, options?: RequestOptions): string`.
- Refactor the five query methods to use `buildQueryUrl`:
  - `createAccount(customerId: number, newAccountType: number, fromAccountId: number, options?: RequestOptions)`:
    `buildQueryUrl(`${this.services}/createAccount`, { customerId, newAccountType, fromAccountId }, options)`
  - `deposit(accountId: number, amount: number | string, options?: RequestOptions)`:
    `buildQueryUrl(`${this.services}/deposit`, { accountId, amount }, options)`
  - `withdraw(accountId: number, amount: number | string, options?: RequestOptions)`:
    `buildQueryUrl(`${this.services}/withdraw`, { accountId, amount }, options)`
  - `transfer(fromAccountId: number, toAccountId: number, amount: number | string, options?: RequestOptions)`:
    `buildQueryUrl(`${this.services}/transfer`, { fromAccountId, toAccountId, amount }, options)`
  - `requestLoan(customerId: number, amount: number, downPayment: number, fromAccountId: number, options?: RequestOptions)`:
    `buildQueryUrl(`${this.services}/requestLoan`, { customerId, amount, downPayment, fromAccountId }, options)`

### 2. Author Unit Tests in `tests/unit/client-query-encoding.test.ts`
- Create `tests/unit/client-query-encoding.test.ts` using `node:test` and `node:assert/strict`.
- Test cases:
  1. `buildQueryUrl encodes query parameters with URLSearchParams`:
     Verify standard parameters, numeric values including 0, floating points, and strings.
  2. `buildQueryUrl encodes injection attempts such as 5&amount=1 preventing parameter pollution`:
     Verify that `amount: '5&amount=1'` produces `amount=5%26amount%3D1` and `new URL(url).searchParams.getAll('amount')` has length 1.
  3. `buildQueryUrl encodes special characters (+, #, space, unicode)`:
     Verify `+` becomes `%2B`, `#` becomes `%23`, space becomes `+`.
  4. `buildQueryUrl honours rawQuery escape hatch verbatim`:
     Verify passing `options: { rawQuery: 'from=1&to=2&amount=5&amount=1' }` outputs exact unencoded string; verify leading `?` is trimmed without doubling.
  5. `ParaBankRestClient methods (createAccount, deposit, withdraw, transfer, requestLoan) construct encoded URLs`:
     Use `withFetchSpy` pattern to assert the actual outgoing URLs constructed by all 5 client methods.
  6. `src/api/client.ts contains 0 template-string query concatenations`:
     Architecture test reading `src/api/client.ts` ensuring no `?${` patterns exist.

### 3. Verify Local Gates & SUT Integrity
- Run unit test suite: `npm run test:unit` (93 -> 99+ tests pass).
- Run typechecks: `npm run typecheck`, `npm run typecheck:style-02`, `npm run typecheck:style-03`.
- Run tag lint: `npm run lint:tags`.
- Run API tests: `npm run test:api` (14/14 pass, including B4 `"abc"` negative path and contract matrix).
- Run UI tests: `npm run test:ui` (8/8 pass).
- Run smoke safety: `npm run check:smoke-safety`.
- Run root docs check: `pwsh -File tools/ci/check-support.ps1 -Only Docs` (9/9 PASS).

---

## Acceptance Criteria Cross-Reference

| Acceptance Criterion | Implementation & Evidence |
|---|---|
| Every query string in `src/api/client.ts` built with `URLSearchParams` | `buildQueryUrl` wired into `createAccount`, `deposit`, `withdraw`, `transfer`, `requestLoan`. Architecture test asserts 0 `?${` concatenations. |
| A unit test shows a value such as `5&amount=1` is sent as one encoded value | `tests/unit/client-query-encoding.test.ts` verifies `amount=5%26amount%3D1` and `searchParams.getAll('amount').length === 1`. |
| Explicitly named `rawQuery` escape hatch provided | `RequestOptions.rawQuery` supported across `buildQueryUrl` and all 5 client methods; unit tested. |
| B4 `"abc"` partition behaves as before | `features/api/b4-negative-paths.feature:13-17` passes with HTTP 404 empty body in `npm run test:api`. |
| `npm run verify` and PR CI pass | All local gates and GitHub Actions PR CI `sut-boot-gate` green. |
