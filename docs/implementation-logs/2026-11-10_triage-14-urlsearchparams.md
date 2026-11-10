<!--
  AUDIENCE: Engineers and AI agents reviewing development session history.
  PURPOSE:  Record what was built, what was decided, what broke, and what was learned
            during a development session. Immutable once written — append only.
  LOCATION: docs/implementation-logs/2026-11-10_triage-14-urlsearchparams.md
  TEMPLATE: docs/templates/implementation-log.template.md
-->

# TRIAGE-14: encode REST query values with URLSearchParams, 2026-11-10

## Session Summary

Resolved Claude v1 review finding R-09 (score 4, LOW) by replacing template literal query string concatenations in `src/api/client.ts` (`createAccount`, `deposit`, `withdraw`, `transfer`, `requestLoan`) with standard `URLSearchParams` encoding, eliminating parameter injection and query pollution risks:

1. **`buildQueryUrl` and `RequestOptions` in `src/api/client.ts` (D-T14-1, D-T14-2):**
   - Exported `RequestOptions` with optional `rawQuery?: string` escape hatch.
   - Implemented `buildQueryUrl(basePath: string, params: Record<string, string | number | undefined>, options?: RequestOptions): string`.
   - Iterates through defined parameters using `new URLSearchParams()`, correctly preserving numeric values (including 0, floats, and negative values) and serializing strings.
   - Percent-encodes reserved characters (`&` -> `%26`, `=` -> `%3D`, `+` -> `%2B`, `#` -> `%23`, spaces).
   - Parameter injection values such as `'5&amount=1'` are safely encoded as `amount=5%26amount%3D1`, ensuring the SUT receives a single parameter rather than polluted query parameters.
   - When `options?.rawQuery` is provided, normalizes away any leading `?` and appends `?${rawQuery}` verbatim without encoding, providing an explicit review-visible escape hatch.

2. **Refactored Client Methods to Use `buildQueryUrl` (D-T14-1, D-T14-3):**
   - Refactored `createAccount`, `deposit`, `withdraw`, `transfer`, and `requestLoan` to construct query strings via `buildQueryUrl`.
   - Preserves exact byte behavior for standard strings like `"abc"` in `features/api/b4-negative-paths.feature:13-17` (returns HTTP 404 with empty body as asserted).

3. **Comprehensive Unit Test Suite (`tests/unit/client-query-encoding.test.ts`, D-T14-4):**
   - Authored unit test suite covering:
     1. Standard query parameter encoding with `URLSearchParams`, preserving 0 and omitting undefined parameters.
     2. Parameter injection defense: `amount: '5&amount=1'` produces `amount=5%26amount%3D1` (`searchParams.getAll('amount').length === 1`), contrasting with naive concatenation which produces 2 `amount` parameters.
     3. Special character encoding (`+`, `#`, spaces, unicode).
     4. `rawQuery` escape hatch: verbatim query passing, stripping leading `?` without duplicating `??`.
     5. All 5 REST query client methods construct encoded URLs using `withFetchSpy` spy pattern.
     6. Architecture guard: statically scans `src/api/client.ts` asserting 0 template-string query concatenations (`?<param>=${...}`) and ensuring all 5 query methods call `buildQueryUrl`.
   - Expanded unit test suite from 93 to 99 tests (all passing).

Plan: [`../implementation-plans/2026-11-10_triage-14-urlsearchparams.md`](../implementation-plans/2026-11-10_triage-14-urlsearchparams.md)
(approved 2026-11-10 by owner, decisions D-T14-1 to D-T14-5 confirmed).

---

## Objectives

1. ✅ Define `RequestOptions` and implement `buildQueryUrl` in `src/api/client.ts` using `URLSearchParams` (D-T14-1, D-T14-2).
2. ✅ Refactor `createAccount`, `deposit`, `withdraw`, `transfer`, and `requestLoan` in `src/api/client.ts` to use `buildQueryUrl` (D-T14-1, D-T14-3).
3. ✅ Author comprehensive unit test suite in `tests/unit/client-query-encoding.test.ts` (D-T14-4).
4. ✅ Verify architecture guard ensuring 0 template-string query concatenations in `src/api/client.ts` (D-T14-4).
5. ✅ Quality gates: `npm run test:unit` passes 99/99, all four typechecks pass, `lint:tags` passes, cucumber dry-runs pass (14 API, 8 UI), root `check-support.ps1` passes 9/9.
