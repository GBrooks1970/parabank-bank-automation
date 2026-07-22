<!--
  AUDIENCE: Gary Brooks + any agent reviewing this project's publication decision.
  PURPOSE:  Evidence record of the public-readiness audit run before making the repository
            public (PB-P5), following the portfolio's P-07 convention:
            audit -> explicit owner approval -> publish -> post-publication verification.
  LOCATION: docs/audits/2026-07-22_public-readiness.md
-->

# Public-readiness audit — parabank-bank-automation — 2026-07-22

**Decision:** Owner approved publication on 2026-07-22 after this audit. The repository was
made **public** the same day (see §Post-publication verification).

**Scope audited:** the tracked working tree **and the full git history** at `main` (`d51bb1e`),
plus the GitHub repository metadata. The pinned upstream ParaBank source is never committed
here (`target-app/` is gitignored and fetched at build time), so it is out of scope by design.

**Verdict: CLEAR TO PUBLISH — no blockers.**

---

## Findings

| # | Check | Result |
|---|---|---|
| 1 | Secrets / API keys / tokens / private keys (tree + all history) | **Pass.** None found. High-signal scans (`ghp_…`, `AKIA…`, `-----BEGIN … PRIVATE KEY`, `xox…`) over `git log --all -p` returned nothing. |
| 2 | Credentials in test code | **Pass — benign.** Only test data: the **public** ParaBank demo credential `john`/`demo` (documented by Parasoft), a throwaway `S3curePass!` used to register a customer in a local, ephemeral demo bank, and fabricated SSN/addresses (`999-99-9999`, etc.). None are real or reused anywhere. |
| 3 | Upstream source / `node_modules` / WAR / build output committed | **Pass.** 48 tracked files, all first-party; `target-app/`, `node_modules/`, `/target/` and `*.war` are gitignored and untracked. |
| 4 | Local absolute-path leakage (`D:\…`, `C:\Users\…`) | **Pass.** None in the tracked tree. |
| 5 | Dependency vulnerabilities | **Pass.** `npm audit` = 0 vulnerabilities. |
| 6 | Licence | **Pass (verify post-publish).** `LICENSE` is a valid 21-line MIT with both required clauses. GitHub's API reported `license: null` while the repo was **private**; expect auto-detection once public — verified below. |
| 7 | Third-party legal | **Pass.** Only our own tests are published; ParaBank (Apache-2.0) is fetched at build, never redistributed; provenance is documented in the README. |

## Non-blocking doc-currency items (fixed in the publication PR)

- README status block said "Phases 0–3 complete" (PB-P4 was done) — under-claimed, not misleading. Refreshed.
- `docs/backlog.md` PB-P0 evidence noted the repo as "(private)"; clarified as private-at-the-time, now public.

---

## Post-publication verification (2026-07-22)

- [ ] GitHub reports the repository as **public**.
- [ ] GitHub detects the licence as **MIT** (`gh repo view … --json licenseInfo`).
- [ ] An **anonymous clone** succeeds (no credentials).
- [ ] Default-branch **CI is green** after publication.

*(Boxes are ticked in the publication PR / a follow-up once each is confirmed.)*
