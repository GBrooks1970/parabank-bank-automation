# Public Serenity evidence

The canonical public evidence URL is
[`https://gbrooks1970.github.io/parabank-bank-automation/`](https://gbrooks1970.github.io/parabank-bank-automation/).
It is a static snapshot of the latest successful `main` workflow deployment. It is not a
live CI-status indicator, and GitHub Pages does not host the ParaBank Docker application,
REST API or SOAP services.

## Publication contract

The existing `sut-boot-gate` job remains the only source of test and report truth. After
`npm run verify` has passed, `npm run prepare:pages` copies the generated Serenity report
without rewriting its files, creates a deterministic provenance page and stages the result
under `target/pages/`. `npm run check:pages` independently verifies provenance, all eight UI
scenarios, local references and public-data safety.

Pull requests run both commands with the workflow commit as their source ref but receive no
Pages permissions and do not upload a Pages artefact. A successful `push` to `main` uploads
the exact checked directory. The dependent deploy job alone receives `pages: write` and
`id-token: write`, and publishes through the protected `github-pages` environment. Failed or
cancelled verification leaves the last good public snapshot in place.

To exercise the package locally after a Java-backed report has been generated:

```powershell
$sourceRef = git rev-parse HEAD
npm run prepare:pages -- --source-ref $sourceRef
npm run check:pages -- --source-ref $sourceRef
```

Both commands require a full 40-character Git commit. Packaging embeds no wall-clock time;
repeating it for the same report and ref produces byte-identical files.

## Public-data boundary

Serenity's `Masked` wrapper supplies real password and synthetic SSN values to browser
fields while replacing their report descriptions with `[a masked value]`. Seeded-login
Gherkin names the public username `john` but deliberately does not print its password. The
packaging gate rejects unmasked password interactions, the fixed generated password,
credential-bearing auth/cookie headers, structured tokens, secret-like assignments and
machine-specific workspace paths. The username is public ParaBank demo data and needs no
secret exception; no password value is allow-listed.

The staged Serenity subtree is otherwise a byte-for-byte copy of the content-verified report.
The root evidence page and `evidence.json` are the only generated wrappers.

The report command explicitly selects `net.serenity-bdd:serenity-cli:jar:4.3.4`. The
Serenity/JS 3.44.1 default CLI 4.2.34 emits a stale `jquery-ui/1.14.1` reference while copying
the asset as `jquery-ui-1.14.1`; upstream corrected that report resource before the stable
4.3.4 release. The fixed Maven coordinate prevents the renderer from drifting and its output
must still pass the same local-reference and content checks.

## Ownership and recovery

The repository owner controls merge and the `github-pages` environment. Repository Pages must
use **GitHub Actions** as its build and deployment source. No repository secret or long-lived
deployment credential is required.

If publication fails:

1. Keep the last successful deployment in place; do not manually publish an unchecked
   diagnostic `serenity-report` artefact.
2. Inspect the failed `main` workflow. Verification, packaging and safety must all pass before
   deployment can start.
3. Fix or revert the source commit through a reviewed pull request, then let its successful
   `main` run produce the replacement snapshot.
4. If Pages configuration was changed externally, restore **Settings → Pages → Source:
   GitHub Actions** and rerun the failed `main` workflow.

The separately uploaded `serenity-report` artefact remains diagnostic only and uses its
existing retention policy. Public history, failed-run reports and pull-request previews are
intentionally outside PB-EVID-01.
