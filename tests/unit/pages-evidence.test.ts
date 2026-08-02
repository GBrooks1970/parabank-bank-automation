import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';
import {
  assertLocalReferences,
  assertPublicArtifactSafe,
  escapeHtml,
  preparePagesEvidence,
  validatePagesEvidence
} from '../../src/quality/pages-evidence';

const SOURCE_REF = '1234567890abcdef1234567890abcdef12345678';
const SCENARIOS = Array.from({ length: 8 }, (_, index) => `Public evidence scenario ${index + 1}`);

test('preparePagesEvidence copies the complete report and produces deterministic provenance', (t) => {
  const fixture = makeFixture(t);
  const sourceIndex = readFileSync(join(fixture.reportDir, 'index.html'));

  const first = preparePagesEvidence(SOURCE_REF, fixture);
  const firstSnapshot = snapshot(fixture.stagingDir);
  const second = preparePagesEvidence(SOURCE_REF, fixture);

  assert.deepEqual(second, first);
  assert.deepEqual(snapshot(fixture.stagingDir), firstSnapshot);
  assert.equal(first.scenarioCount, 8);
  assert.deepEqual(readFileSync(join(fixture.stagingDir, 'serenity', 'index.html')), sourceIndex);
  assert.match(readFileSync(join(fixture.stagingDir, 'index.html'), 'utf8'), /latest successfully published snapshot/);
  assert.match(readFileSync(join(fixture.stagingDir, 'evidence.json'), 'utf8'), new RegExp(SOURCE_REF));
});

test('generated provenance escaping encodes every HTML-significant character', () => {
  assert.equal(escapeHtml(`<owner & "repo" 'branch'>`), '&lt;owner &amp; &quot;repo&quot; &#39;branch&#39;&gt;');
});

test('preparation rejects missing and empty Serenity entry pages', (t) => {
  const missing = makeFixture(t);
  rmSync(join(missing.reportDir, 'index.html'));
  assert.throws(() => preparePagesEvidence(SOURCE_REF, missing), /missing or not greater than 1 KiB/);

  const empty = makeFixture(t);
  writeFileSync(join(empty.reportDir, 'index.html'), 'empty', 'utf8');
  assert.throws(() => preparePagesEvidence(SOURCE_REF, empty), /missing or not greater than 1 KiB/);
});

test('validation rejects an absent expected scenario', (t) => {
  const fixture = makeFixture(t);
  preparePagesEvidence(SOURCE_REF, fixture);
  writeFileSync(join(fixture.stagingDir, 'serenity', 'scenario-8.json'), JSON.stringify({ name: 'different' }));
  assert.throws(() => validatePagesEvidence(SOURCE_REF, fixture), /missing scenarios: Public evidence scenario 8/);
});

test('staging and local references cannot traverse outside the repository root', (t) => {
  const fixture = makeFixture(t);
  const outside = join(fixture.repositoryRoot, '..', 'outside-pages');
  assert.throws(
    () => preparePagesEvidence(SOURCE_REF, { ...fixture, stagingDir: outside }),
    /must be a descendant of the repository root/
  );
  assert.throws(
    () => preparePagesEvidence(SOURCE_REF, { ...fixture, stagingDir: join(fixture.repositoryRoot, 'target') }),
    /must not contain or replace the source Serenity report/
  );

  preparePagesEvidence(SOURCE_REF, fixture);
  writeFileSync(
    join(fixture.stagingDir, 'index.html'),
    `${readFileSync(join(fixture.stagingDir, 'index.html'), 'utf8')}<a href="../../outside.txt">outside</a>`,
    'utf8'
  );
  assert.throws(() => assertLocalReferences(fixture.stagingDir), /reference escapes staging root/);
});

test('local-reference validation detects broken links', (t) => {
  const fixture = makeFixture(t);
  preparePagesEvidence(SOURCE_REF, fixture);
  rmSync(join(fixture.stagingDir, 'serenity', 'styles.css'));
  assert.throws(() => assertLocalReferences(fixture.stagingDir), /broken local reference 'styles\.css'/);
});

test('public-artefact safety rejects credentials, headers, tokens and machine paths', (t) => {
  const fixture = makeFixture(t);
  preparePagesEvidence(SOURCE_REF, fixture);
  const unsafe = join(fixture.stagingDir, 'serenity', 'unsafe.json');
  writeFileSync(
    unsafe,
    JSON.stringify({
      step: 'Paula enters &quot;S3curePass!&quot; into customer.password field',
      header: 'Authorization: Bearer abcdefghijklmnop',
      cookie: 'Set-Cookie: session=private-value',
      password: 'not-public',
      path: 'C:\\Users\\runneradmin\\work\\repo'
    }),
    'utf8'
  );
  writeFileSync(
    join(fixture.stagingDir, 'serenity', 'unsafe.csv'),
    'description,Paula enters &quot;S3curePass!&quot; into customer.password field\n',
    'utf8'
  );

  assert.throws(() => assertPublicArtifactSafe(fixture.stagingDir), (error: Error) => {
    assert.match(error.message, /generated customer password/);
    assert.match(error.message, /unsafe\.csv: generated customer password/);
    assert.match(error.message, /authorisation header/);
    assert.match(error.message, /cookie header/);
    assert.match(error.message, /secret-like assignment/);
    assert.match(error.message, /Windows machine path/);
    return true;
  });
});

test('public-artefact safety accepts the named public username and masked interactions', (t) => {
  const fixture = makeFixture(t);
  preparePagesEvidence(SOURCE_REF, fixture);
  writeFileSync(
    join(fixture.stagingDir, 'serenity', 'masked.json'),
    JSON.stringify({
      step: 'Paula enters &quot;[a masked value]&quot; into password field',
      username: 'john',
      vendorDocumentation: 'cookie token password'
    }),
    'utf8'
  );
  assert.doesNotThrow(() => assertPublicArtifactSafe(fixture.stagingDir));
});

function makeFixture(t: test.TestContext) {
  const repositoryRoot = mkdtempSync(join(tmpdir(), 'pb-pages-evidence-'));
  t.after(() => rmSync(repositoryRoot, { recursive: true, force: true }));

  const reportDir = join(repositoryRoot, 'target', 'site', 'serenity');
  const featureDir = join(repositoryRoot, 'features', 'ui');
  const stagingDir = join(repositoryRoot, 'target', 'pages');
  mkdirSync(reportDir, { recursive: true });
  mkdirSync(featureDir, { recursive: true });

  writeFileSync(
    join(reportDir, 'index.html'),
    `<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body>${'evidence '.repeat(140)}</body></html>`,
    'utf8'
  );
  writeFileSync(join(reportDir, 'styles.css'), 'body { color: #123456; }\n', 'utf8');
  SCENARIOS.forEach((scenario, index) => {
    writeFileSync(join(reportDir, `scenario-${index + 1}.json`), JSON.stringify({ name: scenario }), 'utf8');
  });
  writeFileSync(
    join(featureDir, 'public-evidence.feature'),
    `Feature: Public evidence\n${SCENARIOS.map((scenario) => `  Scenario: ${scenario}\n    Given evidence exists`).join('\n')}`,
    'utf8'
  );

  return { repositoryRoot, reportDir, featureDir, stagingDir };
}

function snapshot(root: string): Array<[string, string]> {
  const files = walkFiles(root);
  return files.map((file) => [
    relative(root, file).replaceAll('\\', '/'),
    createHash('sha256').update(readFileSync(file)).digest('hex')
  ]);
}

function walkFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const path = join(root, entry.name);
      return entry.isDirectory() ? walkFiles(path) : [path];
    });
}
