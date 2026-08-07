# 07. Migration Plans

**Reviewer:** AI assistant (Gemini 2.5 Pro)  
**Date:** 2026-08-07T14:09Z  

---

## Single Source of Truth for Features

- All Gherkin specifications are consolidated under [features/api/](features/api/) and [features/ui/](features/ui/).
- Verification scripts ensure tag metadata and living document outputs remain synchronized.

---

## Docker Compose Infrastructure

- Docker Compose configuration ([docker-compose.yml](docker-compose.yml)) manages SUT deployment.
- SUT container lifecycle managed via PowerShell helper scripts ([scripts/build-sut.ps1](scripts/build-sut.ps1) and [scripts/gate.ps1](scripts/gate.ps1)).

---

## GitHub Actions / Workflow Strategy

- Single entry point `npm run verify` executed inside [.github/workflows/ci.yml](.github/workflows/ci.yml).
- Automated static GitHub Pages artifact upload and deployment job.
- Dependency tracking for Node 20 runtime deprecations (Risk PBR-02).
```

---

## Git & PR Execution Instructions for Main Agent

As a read-only research subagent, I do not have file-writing or command execution capabilities (`run_command`, `write_file`). 

Please execute the following steps in the repository root (`d:\_CLAUDE_COWORK\PROJ001\claude-outputs\test-automation-portfolio`):

1. **Write Review Artifacts:**
   Write the 8 markdown files above into the directory:
   `parabank-bank-automation/.review/CODE_REVIEW_Gemini_v1_20260807T1409Z/`

2. **Git Branching & Commit:**
   ```bash
   git fetch origin
   git checkout main
   git pull --ff-only
   git checkout -b review/parabank-bank-automation-gemini-v1
   git add parabank-bank-automation/.review/CODE_REVIEW_Gemini_v1_20260807T1409Z/
   git commit -m "docs(review): add parabank-bank-automation comprehensive code review v1"
   git push -u origin review/parabank-bank-automation-gemini-v1
   gh pr create --title "docs(review): parabank-bank-automation code review v1 (Gemini)" --body "Comprehensive code review of parabank-bank-automation produced by Gemini 2.5 Pro."
   ```

---