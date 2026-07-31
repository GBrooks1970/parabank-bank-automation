# Project Contract — parabank-bank-automation

<!-- First-checked gate source per portfolio-prompts/project-layout.md §"Project contract".
     One command per line under `## Gates`; ALL must pass before a commit is gated green.
     Keep the `## Gates` section to bare commands only — the workspace preflight parses
     every line under it as a gate command, so no prose or comments belong there. -->

<!-- What `npm run verify` covers (single test entry point, design doc §5.10):
       typecheck -> SUT-independent framework unit tests -> tag lint -> smoke-safety proof -> API lane -> UI lane ->
       Serenity report generation -> report content check.
     Preconditions: `npm ci` has run, the SUT is up (the boot steps below), and — for the
     full UI lane and report — Playwright's Chromium (`npx playwright install chromium`)
     and, for the HTML report only, a JDK are present. The report step degrades to a
     no-op where Java is absent (local dev); CI installs both and enforces the HTML. -->

## Gates

pwsh ./scripts/build-sut.ps1
docker compose up -d
pwsh ./scripts/gate.ps1
npm run verify
docker compose down

## Working norms

- Boot->seed->use (DR-PB-06): never assume a fresh container is seeded; `gate.ps1` seeds.
- SUT pin (DR-PB-02): upstream commit changes are their own reviewed PRs, never drive-by.
- Assert-as-observed (design doc §5.7): SUT quirks are the spec; do not "fix" assertions
  to match conventional API behaviour.
- Scenarios run serially; `@mutates` = reset-bracketed; `@smoke` never mutates; `@loan`
  scenarios pin admin loan params and re-seed afterwards (design doc §5.6).
- UI outcomes are cross-checked via the shared REST client, not the UI alone.
- The Serenity report is content-verified, never trusted to have merely been generated
  (magento empty-shell lesson).
- Owner merges PRs; a phase gate ticks only with evidence links (docs/backlog.md).
- en-GB in prose docs; see docs/naming-conventions.md.
