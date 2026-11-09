import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

export interface RunMetadata {
  status: 'in_progress' | 'failed' | 'success';
  startedAt: string;
  sourceRef: string;
  runUrl?: string;
  completedAt?: string;
}

export interface FailureMetadata {
  status: 'failed';
  failedAt: string;
  exitCode: number;
  phase: string;
  sourceRef: string;
  errorMessage: string;
}

export interface ProvenanceTarget {
  generatedAt: string;
  sourceRef: string;
}

/**
 * Initializes a clean run-specific output directory for performance diagnostics,
 * ensuring no stale metrics from previous runs or committed snapshots can be attached.
 */
export function initPerfRunOutput(
  rootDir: string,
  sourceRef: string = '',
  runUrl: string = ''
): { runOutputDir: string; metadataPath: string } {
  const runOutputDir = resolve(rootDir, 'perf/run-output');

  // Completely wipe any previous run output to guarantee clean state
  rmSync(runOutputDir, { recursive: true, force: true });
  mkdirSync(runOutputDir, { recursive: true });

  const metadata: RunMetadata = {
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    sourceRef,
    ...(runUrl ? { runUrl } : {}),
  };

  const metadataPath = join(runOutputDir, 'run-metadata.json');
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

  return { runOutputDir, metadataPath };
}

/**
 * Records failure diagnostics in the isolated run output directory on container/threshold failure,
 * ensuring committed report snapshots (perf/report/) remain unpolluted.
 */
export function recordPerfFailure(
  runOutputDir: string,
  details: {
    exitCode?: number;
    error?: unknown;
    phase?: string;
    sourceRef?: string;
  }
): FailureMetadata {
  mkdirSync(runOutputDir, { recursive: true });

  const errorMessage =
    details.error instanceof Error
      ? details.error.message
      : String(details.error || 'Execution failed');

  const failureMeta: FailureMetadata = {
    status: 'failed',
    failedAt: new Date().toISOString(),
    exitCode: details.exitCode ?? 1,
    phase: details.phase || 'k6_execution',
    sourceRef: details.sourceRef || '',
    errorMessage,
  };

  const failurePath = join(runOutputDir, 'failure-metadata.json');
  writeFileSync(failurePath, JSON.stringify(failureMeta, null, 2), 'utf8');

  // Also update run-metadata.json if it exists
  const runMetaPath = join(runOutputDir, 'run-metadata.json');
  if (existsSync(runMetaPath)) {
    try {
      const existing: RunMetadata = JSON.parse(readFileSync(runMetaPath, 'utf8'));
      existing.status = 'failed';
      existing.completedAt = failureMeta.failedAt;
      writeFileSync(runMetaPath, JSON.stringify(existing, null, 2), 'utf8');
    } catch {
      // Ignore parse failure on existing metadata
    }
  }

  return failureMeta;
}

/**
 * Promotes provenanced, successful k6 summary outputs from the isolated run directory
 * into the committed snapshot location (perf/report/).
 * Refuses promotion if provenance does not strictly match expected values.
 */
export function promotePerfSnapshot(
  runOutputDir: string,
  reportDir: string,
  provenance: ProvenanceTarget
): void {
  const summaryJsonPath = join(runOutputDir, 'perf-summary.json');
  const summaryHtmlPath = join(runOutputDir, 'perf-summary.html');

  if (!existsSync(summaryJsonPath)) {
    throw new Error(`Cannot promote perf snapshot: ${summaryJsonPath} does not exist`);
  }

  const rawJson = readFileSync(summaryJsonPath, 'utf8');
  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    throw new Error(`Cannot promote perf snapshot: malformed JSON in ${summaryJsonPath}`);
  }

  if (
    parsed?.provenance?.generatedAt !== provenance.generatedAt ||
    parsed?.provenance?.sourceRef !== provenance.sourceRef
  ) {
    throw new Error(
      `Cannot promote perf snapshot: provenance mismatch. Expected ${provenance.generatedAt} / ${provenance.sourceRef}, got ${parsed?.provenance?.generatedAt} / ${parsed?.provenance?.sourceRef}`
    );
  }

  // Ensure index.html exists in runOutputDir (format from summaryHtml if needed)
  const runOutputIndexPath = join(runOutputDir, 'index.html');
  if (!existsSync(runOutputIndexPath)) {
    if (existsSync(summaryHtmlPath)) {
      copyFileSync(summaryHtmlPath, runOutputIndexPath);
    } else {
      throw new Error(`Cannot promote perf snapshot: neither index.html nor perf-summary.html exists in ${runOutputDir}`);
    }
  }

  // Promote to target report directory
  mkdirSync(reportDir, { recursive: true });
  copyFileSync(summaryJsonPath, join(reportDir, 'perf-summary.json'));
  copyFileSync(runOutputIndexPath, join(reportDir, 'index.html'));

  // Mark success in run-metadata
  const runMetaPath = join(runOutputDir, 'run-metadata.json');
  if (existsSync(runMetaPath)) {
    try {
      const existing: RunMetadata = JSON.parse(readFileSync(runMetaPath, 'utf8'));
      existing.status = 'success';
      existing.completedAt = new Date().toISOString();
      writeFileSync(runMetaPath, JSON.stringify(existing, null, 2), 'utf8');
    } catch {
      // Ignore parse failure
    }
  }
}
