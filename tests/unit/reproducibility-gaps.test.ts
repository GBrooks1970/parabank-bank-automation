import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
// @ts-ignore: untyped ESM helper script
import { DEFAULT_K6_IMAGE } from '../../scripts/run-perf.mjs';

const ROOT = typeof __dirname !== 'undefined' ? resolve(__dirname, '..', '..') : process.cwd();

test('scripts/run-perf.mjs default k6 image matches the reviewed digest in perf.yml (D-T16-1)', () => {
  const perfYml = readFileSync(join(ROOT, '.github', 'workflows', 'perf.yml'), 'utf8');
  const match = /K6_IMAGE:\s*(grafana\/k6@[^\s\r\n]+)/.exec(perfYml);
  assert.ok(match, 'perf.yml should declare K6_IMAGE with a digest pin');
  const pinnedDigest = match[1].trim();

  assert.equal(
    DEFAULT_K6_IMAGE,
    pinnedDigest,
    `run-perf.mjs DEFAULT_K6_IMAGE should match perf.yml (${pinnedDigest})`
  );
  assert.match(DEFAULT_K6_IMAGE, /^grafana\/k6@sha256:[a-f0-9]{64}$/);
});

test('scripts/gate.ps1 all Invoke-WebRequest calls are bounded with -TimeoutSec (D-T16-2)', () => {
  const gateScript = readFileSync(join(ROOT, 'scripts', 'gate.ps1'), 'utf8');
  const lines = gateScript.split(/\r?\n/);
  const webRequests = lines
    .map((line, idx) => ({ line: line.trim(), lineNum: idx + 1 }))
    .filter((entry) => entry.line.startsWith('Invoke-WebRequest') || entry.line.includes('= Invoke-WebRequest'));

  assert.ok(webRequests.length >= 4, `Expected at least 4 Invoke-WebRequest calls, found ${webRequests.length}`);

  for (const req of webRequests) {
    assert.match(
      req.line,
      /-TimeoutSec\s+\d+/,
      `gate.ps1:${req.lineNum} probe '${req.line}' lacks explicit -TimeoutSec bound`
    );
  }
});

test('scripts/smoke-safety.mjs imports and wraps network requests with withRequestDeadline (D-T16-3)', () => {
  const scriptContent = readFileSync(join(ROOT, 'scripts', 'smoke-safety.mjs'), 'utf8');

  // Verify import of request-deadline helper
  assert.match(
    scriptContent,
    /import\s*\{\s*withRequestDeadline\s*\}\s*from\s*['"]\.\.\/src\/api\/request-deadline\.ts['"]/,
    'smoke-safety.mjs must import withRequestDeadline from src/api/request-deadline.ts'
  );

  // Verify seed() wraps initializeDB with withRequestDeadline
  assert.match(
    scriptContent,
    /withRequestDeadline\([\s\S]*?method:\s*['"]POST['"][\s\S]*?operation:\s*['"]smoke-safety initializeDB['"][\s\S]*?fetch\(`\$\{SERVICES\}\/initializeDB`/,
    'seed() must invoke withRequestDeadline for initializeDB'
  );

  // Verify readJson() wraps fetch with withRequestDeadline
  assert.match(
    scriptContent,
    /withRequestDeadline\([\s\S]*?operation:\s*`smoke-safety \$\{what\}`[\s\S]*?fetch\(`\$\{SERVICES\}\$\{path\}`/,
    'readJson() must invoke withRequestDeadline for GET requests'
  );
});

test('docker-compose.yml image tag matches build-sut.ps1 UpstreamCommit short SHA (D-T16-4)', () => {
  const composeText = readFileSync(join(ROOT, 'docker-compose.yml'), 'utf8');
  const buildSutText = readFileSync(join(ROOT, 'scripts', 'build-sut.ps1'), 'utf8');

  // Extract declared image tag from docker-compose.yml
  const composeMatch = /^\s*image:\s*parabank:([a-f0-9]+)\s*$/m.exec(composeText);
  assert.ok(composeMatch, "docker-compose.yml must declare image: parabank:<short-sha>");
  const composeTag = composeMatch[1].trim();

  // Extract UpstreamCommit default from build-sut.ps1
  const commitMatch = /\$UpstreamCommit\s*=\s*['"]([a-f0-9]{40})['"]/.exec(buildSutText);
  assert.ok(commitMatch, "build-sut.ps1 must declare default 40-char UpstreamCommit");
  const upstreamCommit = commitMatch[1].trim();
  const expectedShort = upstreamCommit.substring(0, 7);

  assert.equal(
    composeTag,
    expectedShort,
    `docker-compose.yml image tag (${composeTag}) must match build-sut.ps1 upstream commit prefix (${expectedShort})`
  );
});

test('MUST-FAIL: compose tag mismatch validation rejects mismatched upstream commit (D-T16-6)', () => {
  const buildSutText = readFileSync(join(ROOT, 'scripts', 'build-sut.ps1'), 'utf8');

  // Verify that the validation logic exists in build-sut.ps1
  assert.match(buildSutText, /COMPOSE IMAGE TAG MISMATCH/);
  assert.match(buildSutText, /docker-compose\.yml/);

  // Pure logic replica test
  function validateComposeTag(composeTag: string, upstreamCommit: string): void {
    const expected = upstreamCommit.length >= 7 ? upstreamCommit.substring(0, 7) : upstreamCommit;
    if (composeTag !== expected) {
      throw new Error(`COMPOSE IMAGE TAG MISMATCH: got '${composeTag}', expected '${expected}'`);
    }
  }

  // Matches
  assert.doesNotThrow(() => validateComposeTag('d1bf006', 'd1bf0068a961e10f0d2d65c84b9a10dc7bd2c8b1'));

  // Mismatches
  assert.throws(
    () => validateComposeTag('d1bf006', '1234567890abcdef1234567890abcdef12345678'),
    /COMPOSE IMAGE TAG MISMATCH: got 'd1bf006', expected '1234567'/
  );
});
