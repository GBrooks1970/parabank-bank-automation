# Project Contract — parabank-bank-automation

<!-- First-checked gate source per portfolio-prompts/project-layout.md §"Project contract".
     One command per line under Gates; ALL must pass before a commit is gated green. -->

## Gates

pwsh ./scripts/build-sut.ps1
docker compose up -d
pwsh ./scripts/gate.ps1
docker compose down

<!-- Gate evolution (per design doc §5.10 and backlog PB-P2): when the test toolchain
     lands, `npm run verify` (typecheck + lanes + report content check) is INSERTED between
     gate.ps1 and compose down, becoming the single test entry point. The SUT boot remains
     the precondition, not part of verify. Update this file in the same PR that adds it. -->

## Working norms

- Boot→seed→use (DR-PB-06): never assume a fresh container is seeded; `gate.ps1` seeds.
- SUT pin (DR-PB-02): upstream commit changes are their own reviewed PRs, never drive-by.
- Assert-as-observed (design doc §5.7): SUT quirks are the spec; do not "fix" assertions
  to match conventional API behaviour.
- Scenarios run serially; `@mutates` = reset-bracketed; `@smoke` never mutates.
- Owner merges PRs; a phase gate ticks only with evidence links (docs/backlog.md).
- en-GB in prose docs; see docs/naming-conventions.md.
