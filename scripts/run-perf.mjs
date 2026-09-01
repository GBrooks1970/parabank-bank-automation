// Runs the bundled k6 performance-smoke test in a Dockerized `grafana/k6` (D1.6a)
// against the locally-booted ParaBank SUT, and collects the summary artefacts.
//
// Assumes: `npm run perf:build` has produced perf/dist/parabank-load.js, and the
// SUT is up on http://localhost:8090 (scripts/build-sut.ps1 + compose + gate.ps1).
// Writes perf/report/index.html (published /perf/ page) and perf/report/perf-summary.json.
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, renameSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = resolve(ROOT, 'perf/dist');
const REPORT = resolve(ROOT, 'perf/report');

if (!existsSync(resolve(DIST, 'parabank-load.js'))) {
  console.error('perf: perf/dist/parabank-load.js missing — run `npm run perf:build` first.');
  process.exit(1);
}
mkdirSync(REPORT, { recursive: true });

// Pin k6 by digest via K6_IMAGE when available; default to the floating tag locally.
const k6Image = process.env.K6_IMAGE || 'grafana/k6:latest';
const baseUrl = process.env.PARABANK_BASE_URL || 'http://localhost:8090/parabank/services/bank';

// Provenance (PB-PIN-04). The summary is committed to main and published on a later
// functional deploy, so it must carry when and from what it was measured; without this the
// page shows undated numbers and a broken lane is invisible to a reader.
const generatedAt = new Date().toISOString();
const sourceRef =
  process.env.GITHUB_SHA ||
  (() => {
    try {
      return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    } catch {
      return '';
    }
  })();
const runUrl =
  process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : '';

if (!sourceRef) {
  console.error('perf: could not determine the source commit; the summary would publish without provenance.');
  process.exit(1);
}

// The grafana/k6 image runs as a non-root user, so it cannot write handleSummary
// output to the host-mounted /work unless it runs AS the host user. On POSIX
// (the CI runner) pass --user uid:gid; on Windows (local dev) Docker Desktop
// handles mount permissions itself, so no --user is needed/available.
const userArgs =
  typeof process.getuid === 'function'
    ? ['--user', `${process.getuid()}:${process.getgid()}`]
    : [];

// k6 writes handleSummary outputs to its CWD (/work); mount perf/dist as /scripts
// and perf/report as /work so the summary files land in perf/report.
const args = [
  'run', '--rm', '--network', 'host',
  ...userArgs,
  '-e', `PARABANK_BASE_URL=${baseUrl}`,
  '-e', `K6_IMAGE=${k6Image}`,
  '-e', `PERF_GENERATED_AT=${generatedAt}`,
  '-e', `PERF_SOURCE_REF=${sourceRef}`,
  '-e', `PERF_RUN_URL=${runUrl}`,
  '-v', `${DIST}:/scripts:ro`,
  '-v', `${REPORT}:/work`,
  '-w', '/work',
  k6Image, 'run', '/scripts/parabank-load.js',
];

console.log(`perf: docker ${args.join(' ')}`);
execFileSync('docker', args, { stdio: 'inherit' });

// Publish the generated summary as the /perf/ index page. Fail loudly if k6 did
// not produce it (e.g. a mount-permission regression) rather than silently pass.
const summaryHtml = resolve(REPORT, 'perf-summary.html');
const summaryJson = resolve(REPORT, 'perf-summary.json');
if (!existsSync(summaryHtml) || !existsSync(summaryJson)) {
  console.error('perf: k6 did not write the summary files to perf/report (check container write permissions).');
  process.exit(1);
}
renameSync(summaryHtml, resolve(REPORT, 'index.html'));

// Prove the provenance actually reached the summary, rather than trusting that it did:
// without it the page publishes undated numbers, which is the whole point of PB-PIN-04.
const written = JSON.parse(readFileSync(summaryJson, 'utf8'));
if (written?.provenance?.generatedAt !== generatedAt || written?.provenance?.sourceRef !== sourceRef) {
  console.error('perf: the summary did not record the expected provenance; refusing to pass.');
  process.exit(1);
}
console.log(`perf: wrote perf/report/index.html + perf/report/perf-summary.json (${generatedAt}, ${sourceRef.slice(0, 7)})`);
