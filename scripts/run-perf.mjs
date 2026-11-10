// Runs the bundled k6 performance-smoke test in a Dockerized `grafana/k6` (D1.6a)
// against the locally-booted ParaBank SUT, and collects the summary artefacts.
//
// Assumes: `npm run perf:build` has produced perf/dist/parabank-load.js, and the
// SUT is up on http://localhost:8090 (scripts/build-sut.ps1 + compose + gate.ps1).
// Writes isolated diagnostics to perf/run-output/, and promotes verified snapshots to perf/report/.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { assertLocalSut } from '../src/quality/target-guard.ts';
import { initPerfRunOutput, recordPerfFailure, promotePerfSnapshot } from '../src/quality/perf-run-lifecycle.ts';

// Pin k6 by digest via K6_IMAGE when available; default to the pinned digest (D-T16-1).
export const DEFAULT_K6_IMAGE = 'grafana/k6@sha256:e7eeddf1ce2361df6920d925297f487c0ba549c44be242c6a9c22f28d9b08efa';

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const ROOT = resolve(import.meta.dirname, '..');
  const DIST = resolve(ROOT, 'perf/dist');
  const REPORT = resolve(ROOT, 'perf/report');

  if (!existsSync(resolve(DIST, 'parabank-load.js'))) {
    console.error('perf: perf/dist/parabank-load.js missing — run `npm run perf:build` first.');
    process.exit(1);
  }

  const k6Image = process.env.K6_IMAGE || DEFAULT_K6_IMAGE;
  const baseUrl = process.env.PARABANK_BASE_URL || 'http://localhost:8090/parabank/services/bank';
  // DR-PB-13: the k6 write scenario resets data (initializeDB); refuse a remote host before Docker starts.
  assertLocalSut(baseUrl, 'The perf lane');

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

  // TRIAGE-03: Initialize clean isolated run-specific diagnostics directory.
  // Old committed snapshots in perf/report are never mounted or touched during k6 execution.
  const { runOutputDir } = initPerfRunOutput(ROOT, sourceRef, runUrl);

  // The grafana/k6 image runs as a non-root user, so it cannot write handleSummary
  // output to the host-mounted /work unless it runs AS the host user. On POSIX
  // (the CI runner) pass --user uid:gid; on Windows (local dev) Docker Desktop
  // handles mount permissions itself, so no --user is needed/available.
  const userArgs =
    typeof process.getuid === 'function'
      ? ['--user', `${process.getuid()}:${process.getgid()}`]
      : [];

  // k6 writes handleSummary outputs to its CWD (/work); mount perf/dist as /scripts
  // and perf/run-output as /work so the run-specific summary files land in perf/run-output.
  const args = [
    'run', '--rm', '--network', 'host',
    ...userArgs,
    '-e', `PARABANK_BASE_URL=${baseUrl}`,
    '-e', `K6_IMAGE=${k6Image}`,
    '-e', `PERF_GENERATED_AT=${generatedAt}`,
    '-e', `PERF_SOURCE_REF=${sourceRef}`,
    '-e', `PERF_RUN_URL=${runUrl}`,
    '-v', `${DIST}:/scripts:ro`,
    '-v', `${runOutputDir}:/work`,
    '-w', '/work',
    k6Image, 'run', '/scripts/parabank-load.js',
  ];

  console.log(`perf: docker ${args.join(' ')}`);

  // Execute k6 in container. If k6 breaches a threshold (exit 99) or crashes, catch the failure,
  // record failure diagnostics in perf/run-output, and leave perf/report untouched.
  try {
    execFileSync('docker', args, { stdio: 'inherit' });
  } catch (err) {
    const exitCode = typeof err?.status === 'number' ? err.status : 1;
    console.error(`perf: k6 execution failed with exit code ${exitCode}. Recording failure diagnostics in ${runOutputDir}.`);
    recordPerfFailure(runOutputDir, {
      exitCode,
      error: err,
      phase: 'k6_execution',
      sourceRef,
    });
    process.exit(exitCode);
  }

  // On k6 success (exit 0): verify provenance and promote snapshot to perf/report.
  try {
    promotePerfSnapshot(runOutputDir, REPORT, { generatedAt, sourceRef });
  } catch (err) {
    console.error(`perf: snapshot promotion failed: ${err instanceof Error ? err.message : String(err)}`);
    recordPerfFailure(runOutputDir, {
      exitCode: 1,
      error: err,
      phase: 'snapshot_promotion',
      sourceRef,
    });
    process.exit(1);
  }

  console.log(`perf: verified provenance and promoted snapshot to perf/report (${generatedAt}, ${sourceRef.slice(0, 7)})`);
}
