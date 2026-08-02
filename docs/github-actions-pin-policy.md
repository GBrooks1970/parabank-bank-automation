# GitHub Actions pin policy

This project treats every external GitHub Action as an immutable execution input under
DR-PB-10. Workflow `uses:` entries must name a full 40-character commit SHA; a trailing
release comment keeps the reviewed human-readable version visible. Moving major tags such
as `@v5`, branches, and unqualified tags are not accepted.

## Current reviewed pins

The existing CI pins were reviewed on 2026-08-01. The Pages pins were reviewed and resolved
from their official `actions/*` release commits on 2026-08-02:

| Action | Release | Full commit SHA | Review note |
|---|---|---|---|
| `actions/checkout` | [`v5.1.0`](https://github.com/actions/checkout/releases/tag/v5.1.0) | `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09` | Safer `pull_request_target` checkout default does not alter this workflow's `pull_request` trigger. |
| `actions/setup-node` | [`v5.0.0`](https://github.com/actions/setup-node/releases/tag/v5.0.0) | `a0853c24544627f65ddf259abe73b1d18a591444` | Node 24 action runtime; existing explicit npm cache configuration is retained. |
| `actions/setup-java` | [`v4.9.0`](https://github.com/actions/setup-java/releases/tag/v4.9.0) | `d7793b545071e98d581d3bf084a51c3213318a07` | Current v4 release; its Node 20 action runtime remains tracked by PBR-02. |
| `actions/upload-artifact` | [`v4.6.2`](https://github.com/actions/upload-artifact/releases/tag/v4.6.2) | `ea165f8d65b6e75b540449e92b4886f43607fa02` | Current v4 release; its Node 20 action runtime remains tracked by PBR-02. |
| `actions/upload-pages-artifact` | [`v5.0.0`](https://github.com/actions/upload-pages-artifact/releases/tag/v5.0.0) | `fc324d3547104276b827a68afc52ff2a11cc49c9` | Node 24 composite release; archives only checked `target/pages/` and internally pins `actions/upload-artifact@v7.0.0`. |
| `actions/configure-pages` | [`v6.0.0`](https://github.com/actions/configure-pages/releases/tag/v6.0.0) | `45bfe0192ca1faeb007ade9deae92b16b8254a0d` | Node 24 release; reads Pages metadata in the deployment job and receives no PAT or repository secret. |
| `actions/deploy-pages` | [`v5.0.0`](https://github.com/actions/deploy-pages/releases/tag/v5.0.0) | `cd2ce8fcbc39b97be8ca5fce6e763baed58fa128` | Node 24 release; deploys the named Pages artefact through GitHub's OIDC-backed Pages API. |

The workflow-level default and full verification job grant only `contents: read`. The dependent
`deploy-pages` job alone adds `pages: write` and `id-token: write`; pull requests never reach
that job and cannot upload a Pages artefact. A future action that requires another token
permission must justify the narrowest additional permission in the same PR. Write access must
never be added merely to silence an action failure.

## Review and refresh procedure

Action refreshes are deliberate reviewed changes, not drive-by tag updates:

1. Inventory every external action with `rg -n "uses:" .github/workflows` and confirm no
   workflow is missed.
2. Select a stable release from the action's official `actions/*` repository. Read its
   release notes and the source diff from the currently pinned release; record any runtime,
   permission, input, output, or runner compatibility change in the PR.
3. Resolve the release tag to the commit GitHub will execute, for example:

   ```powershell
   gh api repos/actions/checkout/commits/v5.1.0 --jq '.sha'
   ```

   The result must be a 40-character commit SHA. Put that SHA after `@` and retain the
   exact release as a trailing comment, for example `# v5.1.0`.
4. Re-review the workflow's top-level and job-level `permissions`. Keep
   `contents: read` unless the updated action demonstrably needs a narrowly documented
   addition.
5. Validate YAML parsing, search again for mutable `uses:` references, run the complete
   five-command project contract from `docs/project-contract.md`, and require the PR CI
   gate to pass.
6. Record the old/new release and SHA, review findings, validation evidence, and any
   remaining runtime annotation in the PR and immutable implementation log.

Scheduled pin automation remains outside the approved cycle. It may propose a future
version, but it must not bypass release review, full-gate validation, or owner merge.
