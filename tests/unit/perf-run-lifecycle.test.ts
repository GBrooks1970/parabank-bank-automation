import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  initPerfRunOutput,
  recordPerfFailure,
  promotePerfSnapshot,
} from '../../src/quality/perf-run-lifecycle';

function makeTempRoot(): string {
  return mkdtempSync(join(tmpdir(), 'perf-lifecycle-test-'));
}

test('initPerfRunOutput creates a clean run directory and writes initial in_progress metadata', () => {
  const root = makeTempRoot();
  try {
    const runOutput = join(root, 'perf/run-output');
    mkdirSync(runOutput, { recursive: true });
    // Seed an old stale file that must be purged
    writeFileSync(join(runOutput, 'stale-metric.json'), '{"old": true}', 'utf8');

    const sourceRef = '1234567890abcdef1234567890abcdef12345678';
    const runUrl = 'https://github.com/org/repo/actions/runs/999';

    const result = initPerfRunOutput(root, sourceRef, runUrl);
    assert.equal(result.runOutputDir, runOutput);
    assert.equal(existsSync(join(runOutput, 'stale-metric.json')), false, 'stale files must be purged');

    const meta = JSON.parse(readFileSync(result.metadataPath, 'utf8'));
    assert.equal(meta.status, 'in_progress');
    assert.equal(meta.sourceRef, sourceRef);
    assert.equal(meta.runUrl, runUrl);
    assert.ok(meta.startedAt && !isNaN(Date.parse(meta.startedAt)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('recordPerfFailure captures structured failure metadata without touching reportDir', () => {
  const root = makeTempRoot();
  try {
    const runOutput = join(root, 'perf/run-output');
    const reportDir = join(root, 'perf/report');
    mkdirSync(reportDir, { recursive: true });
    writeFileSync(join(reportDir, 'index.html'), '<html>baseline</html>', 'utf8');

    initPerfRunOutput(root, 'commit-sha');

    const failureMeta = recordPerfFailure(runOutput, {
      exitCode: 99,
      phase: 'k6_execution',
      sourceRef: 'commit-sha',
      error: new Error('Threshold k6 p95 exceeded limit (15.2ms > 10ms)'),
    });

    assert.equal(failureMeta.status, 'failed');
    assert.equal(failureMeta.exitCode, 99);
    assert.equal(failureMeta.phase, 'k6_execution');
    assert.match(failureMeta.errorMessage, /Threshold k6 p95 exceeded/);

    const failureFile = JSON.parse(readFileSync(join(runOutput, 'failure-metadata.json'), 'utf8'));
    assert.equal(failureFile.exitCode, 99);

    const runMeta = JSON.parse(readFileSync(join(runOutput, 'run-metadata.json'), 'utf8'));
    assert.equal(runMeta.status, 'failed');
    assert.ok(runMeta.completedAt);

    // Verify reportDir was untouched
    assert.equal(readFileSync(join(reportDir, 'index.html'), 'utf8'), '<html>baseline</html>');
    assert.equal(existsSync(join(reportDir, 'perf-summary.json')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('promotePerfSnapshot validates provenance and promotes summary to reportDir on success', () => {
  const root = makeTempRoot();
  try {
    const runOutput = join(root, 'perf/run-output');
    const reportDir = join(root, 'perf/report');
    initPerfRunOutput(root, 'valid-sha');

    const generatedAt = '2026-11-09T12:00:00.000Z';
    const sourceRef = 'valid-sha-1234567';

    // Simulate k6 output in runOutput
    const summaryData = {
      metrics: { http_reqs: { values: { count: 1200 } } },
      provenance: { generatedAt, sourceRef },
    };
    writeFileSync(join(runOutput, 'perf-summary.json'), JSON.stringify(summaryData, null, 2), 'utf8');
    writeFileSync(join(runOutput, 'perf-summary.html'), '<html>summary</html>', 'utf8');

    promotePerfSnapshot(runOutput, reportDir, { generatedAt, sourceRef });

    // Verify reportDir received the promoted files
    assert.ok(existsSync(join(reportDir, 'perf-summary.json')));
    assert.ok(existsSync(join(reportDir, 'index.html')));
    assert.equal(readFileSync(join(reportDir, 'index.html'), 'utf8'), '<html>summary</html>');

    const promotedJson = JSON.parse(readFileSync(join(reportDir, 'perf-summary.json'), 'utf8'));
    assert.equal(promotedJson.provenance.sourceRef, sourceRef);

    // Verify run-metadata marked success
    const runMeta = JSON.parse(readFileSync(join(runOutput, 'run-metadata.json'), 'utf8'));
    assert.equal(runMeta.status, 'success');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('promotePerfSnapshot throws and refuses promotion on provenance mismatch', () => {
  const root = makeTempRoot();
  try {
    const runOutput = join(root, 'perf/run-output');
    const reportDir = join(root, 'perf/report');
    mkdirSync(runOutput, { recursive: true });

    // Seed summary with a different sourceRef
    const summaryData = {
      metrics: {},
      provenance: { generatedAt: '2026-11-09T12:00:00.000Z', sourceRef: 'stale-sha' },
    };
    writeFileSync(join(runOutput, 'perf-summary.json'), JSON.stringify(summaryData), 'utf8');
    writeFileSync(join(runOutput, 'perf-summary.html'), '<html>stale</html>', 'utf8');

    assert.throws(
      () => {
        promotePerfSnapshot(runOutput, reportDir, {
          generatedAt: '2026-11-09T12:00:00.000Z',
          sourceRef: 'expected-fresh-sha',
        });
      },
      /provenance mismatch/
    );

    // reportDir must not have been created/populated
    assert.equal(existsSync(join(reportDir, 'perf-summary.json')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
