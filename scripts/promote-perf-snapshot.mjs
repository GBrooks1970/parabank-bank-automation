#!/usr/bin/env node
/**
 * Promotes provenanced k6 performance report snapshots from a downloaded
 * artifact or isolated run-output directory into the committed report location (perf/report).
 *
 * Designed with zero external dependencies (Node standard library only) so that
 * the GitHub Actions `publish` job can run it in a clean environment without `npm ci`
 * or any third-party code executing under a write token.
 */

import { existsSync, mkdirSync, readFileSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Validates provenance and promotes performance summary files.
 *
 * @param {string} sourceDir Directory containing downloaded artifact files
 * @param {string} targetDir Directory to promote report files into (perf/report)
 * @returns {{ summaryJsonPath: string; indexPath: string; generatedAt: string; sourceRef: string }}
 */
export function promoteSnapshotFromArtifact(sourceDir, targetDir) {
  const resolvedSource = resolve(process.cwd(), sourceDir);
  const resolvedTarget = resolve(process.cwd(), targetDir);

  const summaryJsonPath = join(resolvedSource, 'perf-summary.json');
  if (!existsSync(summaryJsonPath)) {
    throw new Error(`Cannot promote snapshot: perf-summary.json not found in ${resolvedSource}`);
  }

  let parsed;
  try {
    const raw = readFileSync(summaryJsonPath, 'utf8');
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Cannot promote snapshot: malformed JSON in ${summaryJsonPath}: ${err.message}`);
  }

  const generatedAt = parsed?.provenance?.generatedAt;
  const sourceRef = parsed?.provenance?.sourceRef;

  if (typeof generatedAt !== 'string' || !generatedAt.trim()) {
    throw new Error(`Cannot promote snapshot: missing or invalid provenance.generatedAt in ${summaryJsonPath}`);
  }

  if (typeof sourceRef !== 'string' || !sourceRef.trim()) {
    throw new Error(`Cannot promote snapshot: missing or invalid provenance.sourceRef in ${summaryJsonPath}`);
  }

  // Ensure index.html exists in source (check index.html or fallback to perf-summary.html)
  let sourceIndexPath = join(resolvedSource, 'index.html');
  const fallbackHtmlPath = join(resolvedSource, 'perf-summary.html');

  if (!existsSync(sourceIndexPath)) {
    if (existsSync(fallbackHtmlPath)) {
      sourceIndexPath = fallbackHtmlPath;
    } else {
      throw new Error(`Cannot promote snapshot: neither index.html nor perf-summary.html found in ${resolvedSource}`);
    }
  }

  // Ensure target directory exists
  mkdirSync(resolvedTarget, { recursive: true });

  const targetJsonPath = join(resolvedTarget, 'perf-summary.json');
  const targetIndexPath = join(resolvedTarget, 'index.html');

  copyFileSync(summaryJsonPath, targetJsonPath);
  copyFileSync(sourceIndexPath, targetIndexPath);

  return {
    summaryJsonPath: targetJsonPath,
    indexPath: targetIndexPath,
    generatedAt,
    sourceRef,
  };
}

// CLI entry point
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  const sourceDir = args[0] || 'perf/run-output';
  const targetDir = args[1] || 'perf/report';

  try {
    const result = promoteSnapshotFromArtifact(sourceDir, targetDir);
    console.log(
      `perf: promoted snapshot from ${sourceDir} to ${targetDir} (generatedAt: ${result.generatedAt}, sourceRef: ${result.sourceRef.slice(0, 7)})`
    );
  } catch (err) {
    console.error(`perf: snapshot promotion failed: ${err.message}`);
    process.exit(1);
  }
}
