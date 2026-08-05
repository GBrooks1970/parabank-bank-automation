import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { inspectSerenityCoverage } from './report-integrity';

export const EVIDENCE_REPOSITORY = 'GBrooks1970/parabank-bank-automation';
export const EXPECTED_UI_SCENARIOS = 8;

const TEXT_EXTENSIONS = new Set([
  '.css',
  '.csv',
  '.htm',
  '.html',
  '.js',
  '.json',
  '.map',
  '.mjs',
  '.properties',
  '.txt',
  '.xml',
  '.yaml',
  '.yml'
]);

const REPORT_CONTENT_EXTENSIONS = new Set(['.csv', '.htm', '.html', '.json', '.properties', '.txt', '.xml']);

export interface PagesEvidencePaths {
  repositoryRoot?: string;
  reportDir?: string;
  featureDir?: string;
  stagingDir?: string;
}

export interface PagesEvidenceResult {
  sourceRef: string;
  scenarioCount: number;
  fileCount: number;
  byteCount: number;
}

interface EvidenceMetadata {
  repository: string;
  sourceRef: string;
  snapshot: string;
  report: string;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function assertFullCommitSha(value: string): string {
  if (!/^[0-9a-f]{40}$/i.test(value)) {
    throw new Error(`source ref must be a full 40-character Git commit SHA, received '${value}'`);
  }
  return value.toLowerCase();
}

export function renderEvidenceIndex(
  sourceRefValue: string,
  repository = EVIDENCE_REPOSITORY,
  hasPerf = false
): string {
  const sourceRef = assertFullCommitSha(sourceRefValue);
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error(`invalid GitHub repository identifier '${repository}'`);
  }

  const safeRepository = escapeHtml(repository);
  const safeRef = escapeHtml(sourceRef);
  const repositoryUrl = `https://github.com/${encodeURI(repository)}`;
  const commitUrl = `${repositoryUrl}/commit/${sourceRef}`;

  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>ParaBank test evidence</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; background: #0b1324; color: #e8eefc; }
    main { width: min(46rem, calc(100% - 2rem)); margin: clamp(2rem, 8vw, 6rem) auto; }
    .card { background: #131f36; border: 1px solid #30415f; border-radius: 1rem; padding: clamp(1.25rem, 5vw, 2.5rem); box-shadow: 0 1rem 3rem #05091480; }
    .eyebrow { color: #8fc7ff; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    h1 { font-size: clamp(2rem, 7vw, 3.4rem); line-height: 1.05; margin: .5rem 0 1rem; }
    p { color: #c8d4ea; line-height: 1.65; }
    dl { display: grid; gap: .55rem; margin: 1.5rem 0; }
    dt { color: #8fa5c8; font-size: .9rem; }
    dd { margin: 0 0 .55rem; overflow-wrap: anywhere; }
    a { color: #9ed0ff; }
    .button { display: inline-block; margin-top: .5rem; padding: .8rem 1.05rem; border-radius: .55rem; background: #5ea9ff; color: #07101f; font-weight: 800; text-decoration: none; }
    .note { border-left: .25rem solid #f8c15c; padding-left: 1rem; }
    code { font-size: .88em; }
  </style>
</head>
<body>
  <main>
    <article class="card">
      <div class="eyebrow">Public test evidence</div>
      <h1>ParaBank Serenity report</h1>
      <p>This is the latest successfully published snapshot produced by the complete test workflow on the default branch. It is evidence of a completed run, not a live CI-status display.</p>
      <dl>
        <dt>Repository</dt>
        <dd><a href="${repositoryUrl}">${safeRepository}</a></dd>
        <dt>Tested commit</dt>
        <dd><a href="${commitUrl}"><code>${safeRef}</code></a></dd>
      </dl>
      <p class="note">GitHub Pages hosts only this static evidence. The ParaBank Docker application, REST API and SOAP services are not hosted here.</p>
      <a class="button" href="./serenity/index.html">Open the Serenity report</a>
      ${hasPerf ? '<a class="button" href="./perf/index.html" style="margin-left:.5rem;background:#c9a227">Performance smoke summary</a>' : ''}
    </article>
  </main>
</body>
</html>
`;
}

export function preparePagesEvidence(sourceRefValue: string, paths: PagesEvidencePaths = {}): PagesEvidenceResult {
  const sourceRef = assertFullCommitSha(sourceRefValue);
  const resolved = resolvePaths(paths);
  assertSafeDirectory(resolved.repositoryRoot, resolved.reportDir, 'Serenity report');
  assertSafeDirectory(resolved.repositoryRoot, resolved.stagingDir, 'Pages staging');
  if (
    resolved.reportDir === resolved.stagingDir ||
    isWithin(resolved.reportDir, resolved.stagingDir) ||
    isWithin(resolved.stagingDir, resolved.reportDir)
  ) {
    throw new Error('Pages staging directory must not contain or replace the source Serenity report');
  }

  assertNonTrivialFile(join(resolved.reportDir, 'index.html'), 'Serenity entry page');
  assertNoSymbolicLinks(resolved.reportDir);

  rmSync(resolved.stagingDir, { recursive: true, force: true });
  mkdirSync(resolved.stagingDir, { recursive: true });
  cpSync(resolved.reportDir, join(resolved.stagingDir, 'serenity'), {
    recursive: true,
    preserveTimestamps: true
  });

  // Optional performance-smoke summary (perf lane, D1.5b): publish it at /perf/ when a
  // committed report exists. The nightly perf workflow produces perf/report/index.html;
  // before the first nightly run there is nothing to publish, so /perf/ is simply absent.
  const perfReportDir = join(resolved.repositoryRoot, 'perf', 'report');
  const hasPerf = existsSync(join(perfReportDir, 'index.html'));
  if (hasPerf) {
    assertNoSymbolicLinks(perfReportDir);
    cpSync(perfReportDir, join(resolved.stagingDir, 'perf'), {
      recursive: true,
      preserveTimestamps: true
    });
  }

  const metadata: EvidenceMetadata = {
    repository: EVIDENCE_REPOSITORY,
    sourceRef,
    snapshot: 'latest-successful-main',
    report: './serenity/index.html'
  };
  writeFileSync(
    join(resolved.stagingDir, 'index.html'),
    renderEvidenceIndex(sourceRef, EVIDENCE_REPOSITORY, hasPerf),
    'utf8'
  );
  writeFileSync(join(resolved.stagingDir, 'evidence.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  writeFileSync(join(resolved.stagingDir, '.nojekyll'), '', 'utf8');

  return validatePagesEvidence(sourceRef, paths);
}

export function validatePagesEvidence(sourceRefValue: string, paths: PagesEvidencePaths = {}): PagesEvidenceResult {
  const sourceRef = assertFullCommitSha(sourceRefValue);
  const resolved = resolvePaths(paths);
  assertSafeDirectory(resolved.repositoryRoot, resolved.stagingDir, 'Pages staging');
  assertNoSymbolicLinks(resolved.stagingDir);

  const rootIndex = join(resolved.stagingDir, 'index.html');
  const serenityDir = join(resolved.stagingDir, 'serenity');
  assertNonTrivialFile(rootIndex, 'evidence entry page');
  assertNonTrivialFile(join(serenityDir, 'index.html'), 'Serenity entry page');

  const metadata = parseEvidenceMetadata(join(resolved.stagingDir, 'evidence.json'));
  if (metadata.repository !== EVIDENCE_REPOSITORY || metadata.sourceRef !== sourceRef) {
    throw new Error('evidence metadata does not identify the expected repository and source ref');
  }
  const rootHtml = readFileSync(rootIndex, 'utf8');
  for (const required of [EVIDENCE_REPOSITORY, sourceRef, './serenity/index.html', 'latest successfully published snapshot']) {
    if (!rootHtml.includes(required)) throw new Error(`evidence entry page is missing '${required}'`);
  }

  const featureFiles = listFiles(resolved.featureDir).filter((file) => extname(file).toLowerCase() === '.feature');
  const artifactFiles = listFiles(serenityDir).filter((file) => extname(file).toLowerCase() === '.json');
  const coverage = inspectSerenityCoverage(
    featureFiles.map((file) => readFileSync(file, 'utf8')),
    artifactFiles.map((file) => readFileSync(file, 'utf8'))
  );
  if (coverage.scenarioNames.length !== EXPECTED_UI_SCENARIOS) {
    throw new Error(`expected ${EXPECTED_UI_SCENARIOS} UI scenarios, found ${coverage.scenarioNames.length}`);
  }
  if (coverage.invalidArtifactIndexes.length > 0) {
    throw new Error(`invalid Serenity JSON artefacts at indexes ${coverage.invalidArtifactIndexes.join(', ')}`);
  }
  if (coverage.missingScenarioNames.length > 0) {
    throw new Error(`Serenity report is missing scenarios: ${coverage.missingScenarioNames.join(', ')}`);
  }

  assertLocalReferences(resolved.stagingDir);
  assertPublicArtifactSafe(resolved.stagingDir);

  const files = listFiles(resolved.stagingDir);
  return {
    sourceRef,
    scenarioCount: coverage.scenarioNames.length,
    fileCount: files.length,
    byteCount: files.reduce((total, file) => total + statSync(file).size, 0)
  };
}

export function assertPublicArtifactSafe(siteRootValue: string): void {
  const siteRoot = resolve(siteRootValue);
  const failures: string[] = [];

  for (const file of listFiles(siteRoot)) {
    const extension = extname(file).toLowerCase();
    if (!TEXT_EXTENSIONS.has(extension)) continue;
    const source = readFileSync(file, 'utf8');
    const relativeFile = relative(siteRoot, file).replaceAll(sep, '/');

    const generalPatterns: Array<[string, RegExp]> = [
      ['authorisation header', /\bauthorization\s*[:=]\s*(?:basic|bearer)\s+[A-Za-z0-9+/._~=-]{6,}/i],
      ['cookie header', /\b(?:set-cookie|cookie)\s*[:=]\s*[A-Za-z0-9_.-]+\s*=\s*[^;\s"'<>]{3,}/i],
      ['structured token', /\b(?:gh[opsu]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16})\b/],
      ['Windows machine path', /\b[A-Za-z]:[\\/]+(?:Users|runner|workspace|_work)[\\/]+[^\s"'<>]+/i],
      ['Unix machine path', /\/(?:home|Users|runner|workspace|__w|github\/workspace)\/[^\s"'<>]+/i]
    ];
    for (const [label, pattern] of generalPatterns) {
      if (pattern.test(source)) failures.push(`${relativeFile}: ${label}`);
    }

    if (REPORT_CONTENT_EXTENSIONS.has(extension)) {
      const reportPatterns: Array<[string, RegExp]> = [
        ['secret-like assignment', /(?:&quot;|["'])?\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|private[_-]?key|password)\b(?:&quot;|["'])?\s*[:=]\s*(?:&quot;|["'])?[^\s"'&<>]{4,}/i],
        ['generated customer password', /S3curePass!/i],
        ['seeded demo password', /(?:password[^\r\n]{0,120}(?:&quot;|["'])demo(?:&quot;|["'])|(?:&quot;|["'])demo(?:&quot;|["'])[^\r\n]{0,120}password)/i],
        ['unmasked password interaction', /enters\s+(?:&quot;|["'])(?!\[a masked value\])[^\r\n]{1,100}(?:&quot;|["'])\s+into\s+(?:[^\r\n]{0,40})password/i]
      ];
      for (const [label, pattern] of reportPatterns) {
        if (pattern.test(source)) failures.push(`${relativeFile}: ${label}`);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(`public artefact safety check failed:\n- ${[...new Set(failures)].join('\n- ')}`);
  }
}

export function assertLocalReferences(siteRootValue: string): void {
  const siteRoot = resolve(siteRootValue);
  const failures: string[] = [];

  for (const file of listFiles(siteRoot)) {
    const extension = extname(file).toLowerCase();
    if (extension !== '.html' && extension !== '.htm' && extension !== '.css') continue;
    const source = readFileSync(file, 'utf8');
    const references: string[] = [];

    if (extension === '.css') {
      for (const match of source.matchAll(/url\(\s*(?:["'])?([^"')]+)(?:["'])?\s*\)/gi)) references.push(match[1]);
    } else {
      for (const match of source.matchAll(/\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
        references.push(match[1] ?? match[2]);
      }
      for (const match of source.matchAll(/<(?:script|img|source|iframe)\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
        const target = match[1] ?? match[2];
        if (/^https?:\/\//i.test(target)) failures.push(`${relative(siteRoot, file)}: external runtime source '${target}'`);
      }
      for (const match of source.matchAll(/<link\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
        const target = match[1] ?? match[2];
        if (/^https?:\/\//i.test(target)) failures.push(`${relative(siteRoot, file)}: external stylesheet '${target}'`);
      }
    }

    for (const rawReference of references) {
      const reference = rawReference.trim().replaceAll('&amp;', '&');
      if (!reference || /^(?:#|data:|javascript:|mailto:|tel:|about:|https?:\/\/)/i.test(reference)) continue;
      const pathPart = reference.split(/[?#]/, 1)[0];
      if (!pathPart) continue;
      if (pathPart.startsWith('/') || isAbsolute(pathPart)) {
        failures.push(`${relative(siteRoot, file)}: Pages-base-unsafe absolute reference '${rawReference}'`);
        continue;
      }

      let decoded: string;
      try {
        decoded = decodeURIComponent(pathPart);
      } catch {
        failures.push(`${relative(siteRoot, file)}: invalid encoded reference '${rawReference}'`);
        continue;
      }
      const target = resolve(dirname(file), decoded);
      if (!isWithin(siteRoot, target)) {
        failures.push(`${relative(siteRoot, file)}: reference escapes staging root '${rawReference}'`);
      } else if (!existsSync(target)) {
        failures.push(`${relative(siteRoot, file)}: broken local reference '${rawReference}'`);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(`local reference check failed:\n- ${[...new Set(failures)].join('\n- ')}`);
  }
}

function resolvePaths(paths: PagesEvidencePaths) {
  const repositoryRoot = resolve(paths.repositoryRoot ?? process.cwd());
  return {
    repositoryRoot,
    reportDir: resolve(paths.reportDir ?? join(repositoryRoot, 'target', 'site', 'serenity')),
    featureDir: resolve(paths.featureDir ?? join(repositoryRoot, 'features', 'ui')),
    stagingDir: resolve(paths.stagingDir ?? join(repositoryRoot, 'target', 'pages'))
  };
}

function parseEvidenceMetadata(file: string): EvidenceMetadata {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as EvidenceMetadata;
  } catch (error) {
    throw new Error(`invalid evidence metadata at ${file}`, { cause: error });
  }
}

function assertSafeDirectory(root: string, candidate: string, label: string): void {
  if (candidate === root || !isWithin(root, candidate)) {
    throw new Error(`${label} directory must be a descendant of the repository root`);
  }
}

function assertNonTrivialFile(file: string, label: string): void {
  if (!existsSync(file) || !statSync(file).isFile() || statSync(file).size <= 1024) {
    throw new Error(`${label} is missing or not greater than 1 KiB: ${file}`);
  }
}

function assertNoSymbolicLinks(root: string): void {
  if (lstatSync(root).isSymbolicLink()) throw new Error(`symbolic links are not allowed in public evidence: ${root}`);
  for (const entry of walk(root)) {
    if (lstatSync(entry).isSymbolicLink()) throw new Error(`symbolic links are not allowed in public evidence: ${entry}`);
  }
}

function isWithin(root: string, candidate: string): boolean {
  const pathFromRoot = relative(resolve(root), resolve(candidate));
  return pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`) && !isAbsolute(pathFromRoot);
}

function listFiles(root: string): string[] {
  if (!existsSync(root)) throw new Error(`required directory does not exist: ${root}`);
  return walk(root).filter((entry) => lstatSync(entry).isFile()).sort();
}

function walk(root: string): string[] {
  const entries: string[] = [];
  for (const item of readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(root, item.name);
    entries.push(path);
    if (item.isDirectory()) entries.push(...walk(path));
  }
  return entries;
}
