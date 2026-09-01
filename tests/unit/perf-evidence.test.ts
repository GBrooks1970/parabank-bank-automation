import assert from 'node:assert/strict';
import test from 'node:test';
import { assessPerfEvidence, readPerfProvenance, PERF_MAX_AGE_DAYS } from '../../src/quality/perf-evidence';

const NOW = new Date('2026-09-01T20:00:00Z');

function summary(provenance: unknown, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ metrics: { http_reqs: { values: { count: 1396 } } }, provenance, ...extra });
}

test('readPerfProvenance accepts a complete record and drops empty optionals', () => {
  const provenance = readPerfProvenance(
    summary({
      generatedAt: '2026-09-01T19:58:40Z',
      sourceRef: '98aa06abd0ffe0cd10a79af573f3022f389117a7',
      runUrl: 'https://github.com/o/r/actions/runs/1',
      k6Image: ''
    })
  );

  assert.deepEqual(provenance, {
    generatedAt: '2026-09-01T19:58:40Z',
    sourceRef: '98aa06abd0ffe0cd10a79af573f3022f389117a7',
    runUrl: 'https://github.com/o/r/actions/runs/1'
  });
});

test('readPerfProvenance rejects malformed JSON, absent, and ill-typed provenance', () => {
  assert.equal(readPerfProvenance('{not json'), undefined);
  assert.equal(readPerfProvenance(JSON.stringify({ metrics: {} })), undefined);
  assert.equal(readPerfProvenance(summary('a string')), undefined);
  assert.equal(readPerfProvenance(summary({ sourceRef: 'abcdef1' })), undefined, 'generatedAt required');
  assert.equal(readPerfProvenance(summary({ generatedAt: '2026-09-01T00:00:00Z' })), undefined, 'sourceRef required');
  assert.equal(
    readPerfProvenance(summary({ generatedAt: 'not-a-date', sourceRef: 'abcdef1' })),
    undefined,
    'generatedAt must parse'
  );
  assert.equal(
    readPerfProvenance(summary({ generatedAt: '2026-09-01T00:00:00Z', sourceRef: 'nope' })),
    undefined,
    'sourceRef must look like a commit sha'
  );
});

test('assessPerfEvidence publishes a fresh, provenanced summary and reports its age', () => {
  const result = assessPerfEvidence(
    summary({ generatedAt: '2026-08-31T20:00:00Z', sourceRef: 'abcdef1234567' }),
    NOW
  );

  assert.equal(result.publishable, true);
  assert.ok(result.publishable && Math.abs(result.ageDays - 1) < 0.001);
});

test('assessPerfEvidence withholds an absent summary', () => {
  const result = assessPerfEvidence(undefined, NOW);
  assert.equal(result.publishable, false);
  assert.match(result.publishable === false ? result.reason : '', /absent/);
});

test('assessPerfEvidence withholds a summary with no provenance', () => {
  const result = assessPerfEvidence(JSON.stringify({ metrics: {} }), NOW);
  assert.equal(result.publishable, false);
  assert.match(result.publishable === false ? result.reason : '', /no usable provenance/);
});

test('assessPerfEvidence withholds a summary older than the limit', () => {
  // The PB-PIN-01 outage: 2026-08-18 numbers still on the site on 2026-09-01.
  const result = assessPerfEvidence(
    summary({ generatedAt: '2026-08-18T03:40:00Z', sourceRef: 'bd651ce' }),
    NOW
  );

  assert.equal(result.publishable, false);
  assert.match(result.publishable === false ? result.reason : '', /14\.7 days old \(limit 14\)/);
});

test('assessPerfEvidence keeps a summary exactly at the limit publishable', () => {
  const generatedAt = new Date(NOW.getTime() - PERF_MAX_AGE_DAYS * 86_400_000).toISOString();
  const result = assessPerfEvidence(summary({ generatedAt, sourceRef: 'abcdef1' }), NOW);
  assert.equal(result.publishable, true);
});

test('assessPerfEvidence tolerates small clock skew but rejects a future summary', () => {
  const skewed = new Date(NOW.getTime() + 5 * 60_000).toISOString();
  assert.equal(assessPerfEvidence(summary({ generatedAt: skewed, sourceRef: 'abcdef1' }), NOW).publishable, true);

  const future = new Date(NOW.getTime() + 60 * 60_000).toISOString();
  const result = assessPerfEvidence(summary({ generatedAt: future, sourceRef: 'abcdef1' }), NOW);
  assert.equal(result.publishable, false);
  assert.match(result.publishable === false ? result.reason : '', /dated in the future/);
});
