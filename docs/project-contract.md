# Project Contract — parabank-bank-automation

<!-- First-checked gate source per portfolio-prompts/project-layout.md §"Project contract".
     One command per line under Gates; ALL must pass before a commit is gated green. -->

## Gates

pwsh ./scripts/build-sut.ps1
docker compose up -d
pwsh ./scripts/gate.ps1
npm run verify
docker compose down

<!-- `npm run verify` = typecheck + tag lint + lane suites (single test entry point per
     design doc §5.10; the PB-P3 report content check joins it in that phase). It assumes
     `npm ci` has run and the SUT is up — the boot steps above are the precondition, not
     part of verify. -->

## Working norms

- Boot→seed→use (DR-PB-06): never assume a fresh container is seeded; `gate.ps1` seeds.
- SUT pin (DR-PB-02): upstream commit changes are their own reviewed PRs, never drive-by.
- Assert-as-observed (design doc §5.7): SUT quirks are the spec; do not "fix" assertions
  to match conventional API behaviour.
- Scenarios run serially; `@mutates` = reset-bracketed; `@smoke` never mutates.
- Owner merges PRs; a phase gate ticks only with evidence links (docs/backlog.md).
- en-GB in prose docs; see docs/naming-conventions.md.
