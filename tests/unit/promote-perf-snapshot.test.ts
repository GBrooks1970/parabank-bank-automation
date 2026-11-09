import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
// @ts-ignore: untyped ESM helper script
import { promoteSnapshotFromArtifact } from '../../scripts/promote-perf-snapshot.mjs';

function withTempDirs(fn: (sourceDir: string, targetDir: string) => void | Promise<void>) {
  const base = mkdtempSync(join(tmpdir(), 'perf-promote-test-'));
  const sourceDir = join(base, 'source');
  const targetDir = join(base, 'target');
  const { mkdirSync } = require('node:fs');
  mkdirSync(sourceDir, { recursive: true });
  mkdirSync(targetDir, { recursive: true });

  try {
    return fn(sourceDir, targetDir);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

test('promoteSnapshotFromArtifact cleanly promotes valid provenanced summary and index.html', () => {
  withTempDirs((source, target) => {
    const summary = {
      provenance: {
        generatedAt: '2026-11-09T16:00:00.000Z',
        sourceRef: '1234567890abcdef1234567890abcdef12345678',
      },
      metrics: { http_req_duration: { p95: 12.5 } },
    };
    writeFileSync(join(source, 'perf-summary.json'), JSON.stringify(summary));
    writeFileSync(join(source, 'index.html'), '<html><body>Report</body></html>');

    const result = promoteSnapshotFromArtifact(source, target);
    assert.equal(result.generatedAt, '2026-11-09T16:00:00.000Z');
    assert.equal(result.sourceRef, '1234567890abcdef1234567890abcdef12345678');

    assert.ok(existsSync(join(target, 'perf-summary.json')));
    assert.ok(existsSync(join(target, 'index.html')));

    const targetJson = JSON.parse(readFileSync(join(target, 'perf-summary.json'), 'utf8'));
    assert.equal(targetJson.provenance.generatedAt, '2026-11-09T16:00:00.000Z');
    const targetHtml = readFileSync(join(target, 'index.html'), 'utf8');
    assert.equal(targetHtml, '<html><body>Report</body></html>');
  });
});

test('promoteSnapshotFromArtifact promotes perf-summary.html as index.html when index.html is absent', () => {
  withTempDirs((source, target) => {
    const summary = {
      provenance: {
        generatedAt: '2026-11-09T16:00:00.000Z',
        sourceRef: 'abc1234567890abcdef1234567890abcdef12345',
      },
    };
    writeFileSync(join(source, 'perf-summary.json'), JSON.stringify(summary));
    writeFileSync(join(source, 'perf-summary.html'), '<html><body>Summary Report</body></html>');

    promoteSnapshotFromArtifact(source, target);

    assert.ok(existsSync(join(target, 'index.html')));
    const targetHtml = readFileSync(join(target, 'index.html'), 'utf8');
    assert.equal(targetHtml, '<html><body>Summary Report</body></html>');
  });
});

test('promoteSnapshotFromArtifact throws when perf-summary.json is missing', () => {
  withTempDirs((source, target) => {
    writeFileSync(join(source, 'index.html'), '<html></html>');

    assert.throws(
      () => promoteSnapshotFromArtifact(source, target),
      /perf-summary\.json not found/
    );
  });
});

test('promoteSnapshotFromArtifact throws on malformed JSON', () => {
  withTempDirs((source, target) => {
    writeFileSync(join(source, 'perf-summary.json'), '{ invalid json');
    writeFileSync(join(source, 'index.html'), '<html></html>');

    assert.throws(
      () => promoteSnapshotFromArtifact(source, target),
      /malformed JSON/
    );
  });
});

test('promoteSnapshotFromArtifact throws when provenance is absent or empty', () => {
  withTempDirs((source, target) => {
    writeFileSync(join(source, 'perf-summary.json'), JSON.stringify({ noProvenance: true }));
    writeFileSync(join(source, 'index.html'), '<html></html>');

    assert.throws(
      () => promoteSnapshotFromArtifact(source, target),
      /missing or invalid provenance\.generatedAt/
    );
  });
});

test('promoteSnapshotFromArtifact throws when neither index.html nor perf-summary.html exists', () => {
  withTempDirs((source, target) => {
    const summary = {
      provenance: {
        generatedAt: '2026-11-09T16:00:00.000Z',
        sourceRef: '1234567',
      },
    };
    writeFileSync(join(source, 'perf-summary.json'), JSON.stringify(summary));

    assert.throws(
      () => promoteSnapshotFromArtifact(source, target),
      /neither index\.html nor perf-summary\.html found/
    );
  });
});

test('scripts/promote-perf-snapshot.mjs CLI exits 0 on valid inputs and 1 on errors', () => {
  withTempDirs((source, target) => {
    const scriptPath = join(process.cwd(), 'scripts/promote-perf-snapshot.mjs');

    // Test error path: empty source dir exits 1
    assert.throws(() => {
      execFileSync(process.execPath, [scriptPath, source, target], { stdio: 'pipe' });
    });

    // Test success path: write valid files and execute
    const summary = {
      provenance: {
        generatedAt: '2026-11-09T16:00:00.000Z',
        sourceRef: 'abcdef1234567890abcdef1234567890abcdef12',
      },
    };
    writeFileSync(join(source, 'perf-summary.json'), JSON.stringify(summary));
    writeFileSync(join(source, 'index.html'), '<html><body>CLI OK</body></html>');

    const stdout = execFileSync(process.execPath, [scriptPath, source, target], { encoding: 'utf8' });
    assert.match(stdout, /perf: promoted snapshot/);
    assert.ok(existsSync(join(target, 'index.html')));
  });
});
