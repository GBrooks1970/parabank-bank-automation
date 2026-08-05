// Runs the bundled k6 performance-smoke test in a Dockerized `grafana/k6` (D1.6a)
// against the locally-booted ParaBank SUT, and collects the summary artefacts.
//
// Assumes: `npm run perf:build` has produced perf/dist/parabank-load.js, and the
// SUT is up on http://localhost:8090 (scripts/build-sut.ps1 + compose + gate.ps1).
// Writes perf/report/index.html (published /perf/ page) and perf/report/perf-summary.json.
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';

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

// k6 writes handleSummary outputs to its CWD (/work); mount perf/dist as /scripts
// and perf/report as /work so the summary files land in perf/report.
const args = [
  'run', '--rm', '--network', 'host',
  '-e', `PARABANK_BASE_URL=${baseUrl}`,
  '-e', `K6_IMAGE=${k6Image}`,
  '-v', `${DIST}:/scripts:ro`,
  '-v', `${REPORT}:/work`,
  '-w', '/work',
  k6Image, 'run', '/scripts/parabank-load.js',
];

console.log(`perf: docker ${args.join(' ')}`);
try {
  execFileSync('docker', args, { stdio: 'inherit' });
} finally {
  // Publish the generated summary as the /perf/ index page.
  const summaryHtml = resolve(REPORT, 'perf-summary.html');
  if (existsSync(summaryHtml)) renameSync(summaryHtml, resolve(REPORT, 'index.html'));
}
console.log('perf: wrote perf/report/index.html + perf/report/perf-summary.json');
