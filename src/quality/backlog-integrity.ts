import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

export interface VersionEntry {
  version: number;
  header: string;
  text: string;
}

export interface BacklogValidationResult {
  valid: boolean;
  currentVersion: number;
  pendingPrs: number[];
  violations: string[];
}

/**
 * Parses the current (most recent) version entry from docs/backlog.md content.
 * The current version is the first version header immediately following the document title.
 */
export function parseCurrentVersionEntry(backlogContent: string): VersionEntry {
  const lines = backlogContent.split(/\r?\n/);
  const versionLineRegex = /^(?:\*{0,2}Version:\*{0,2}\s*|v)(\d+)\s*(?:—|-)\s*(.+)$/i;

  let startIndex = -1;
  let version = 0;
  let header = '';

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(versionLineRegex);
    if (match) {
      startIndex = i;
      version = parseInt(match[1], 10);
      const headlineMatch = lines[i].match(/^(?:\*{0,2}Version:\*{0,2}\s*|v)\d+\s*(?:—|-)\s*\*\*([^*]+)\*\*/i);
      header = headlineMatch ? headlineMatch[1].trim() : match[2].trim();
      break;
    }
  }

  if (startIndex === -1) {
    throw new Error('Could not find current version header in backlog content');
  }

  // Collect lines until the next version header or major section header
  const entryLines: string[] = [lines[startIndex]];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (versionLineRegex.test(line) || /^#{1,3}\s+/.test(line)) {
      break;
    }
    entryLines.push(line);
  }

  return {
    version,
    header,
    text: entryLines.join('\n').trim()
  };
}

/**
 * Extracts PR numbers from text associated with pending status markers
 * (e.g. "MERGE PENDING", "MERGE EVIDENCE PENDING", "STATUS: PENDING").
 */
export function extractPendingPrNumbers(text: string): number[] {
  const pendingStatusRegex = /\b(?:MERGE(?:\s+EVIDENCE)?\s+PENDING|STATUS:\s*PENDING)\b/i;
  const prPattern = /(?:\[#(\d+)\]|(?:PR|pull\s+request|pull)?\s*#(\d+))/gi;
  const mergedAsPattern = /(?:merged\s+as|merged\s+in)\s*\[?#(\d+)\]?/gi;
  const reviewVehiclePatterns = [
    /(?:review\s+vehicle\s+(?:is\s+)?(?:PR\s+)?|vehicle\s+is\s+(?:PR\s+)?)\[?#?(\d+)\]?/gi,
    /(?:\[#(\d+)\]|PR\s*#?(\d+))\s+is\s+(?:the\s+)?review\s+vehicle/gi
  ];

  const pendingPrs = new Set<number>();
  const mergedPrs = new Set<number>();

  // Collect PRs explicitly marked as already merged in the text (e.g. "merged as [#68]")
  let mergedMatch: RegExpExecArray | null;
  while ((mergedMatch = mergedAsPattern.exec(text)) !== null) {
    const prNum = parseInt(mergedMatch[1], 10);
    if (!isNaN(prNum) && prNum > 0) {
      mergedPrs.add(prNum);
    }
  }

  // Extract title (the text inside **...** on the first line)
  const lines = text.split(/\r?\n/);
  const titleMatch = lines[0]?.match(/^(?:\*{0,2}Version:\*{0,2}\s*|v)\d+\s*(?:—|-)\s*\*\*([^*]+)\*\*/i);
  const headline = titleMatch ? titleMatch[1] : (lines[0] ?? '');
  const headerHasPending = pendingStatusRegex.test(headline);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Within each line, split by sentence/clause boundaries (. ; !), allowing for markdown asterisks
    const clauses = line.split(/(?<=[.!;])\*{0,2}\s+/);
    for (const clause of clauses) {
      // Ignore explanatory clauses discussing test fixtures, defects, or quoted status
      if (/\bfixture\b/i.test(clause) || /\bDefect:\b/i.test(clause)) {
        continue;
      }

      // Strip quoted occurrences like '"PENDING"' or '"MERGE EVIDENCE PENDING"'
      const unquoted = clause.replace(/["'][^"']*PENDING[^"']*["']/gi, '');

      if (pendingStatusRegex.test(unquoted)) {
        prPattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = prPattern.exec(unquoted)) !== null) {
          const prStr = match[1] ?? match[2];
          if (prStr) {
            const prNum = parseInt(prStr, 10);
            if (!isNaN(prNum) && prNum > 0 && !mergedPrs.has(prNum)) {
              pendingPrs.add(prNum);
            }
          }
        }
      }
    }
  }

  // If the version headline itself has pending status (e.g. "PB-PIN-05 IMPLEMENTED; MERGE EVIDENCE PENDING"),
  // look for review vehicle PRs in the entry text
  if (headerHasPending) {
    for (const pattern of reviewVehiclePatterns) {
      pattern.lastIndex = 0;
      let rvMatch: RegExpExecArray | null;
      while ((rvMatch = pattern.exec(text)) !== null) {
        const prStr = rvMatch[1] ?? rvMatch[2];
        if (prStr) {
          const prNum = parseInt(prStr, 10);
          if (!isNaN(prNum) && prNum > 0 && !mergedPrs.has(prNum)) {
            pendingPrs.add(prNum);
          }
        }
      }
    }

    // If specific review vehicle syntax wasn't used, check for any PR in the first line
    if (pendingPrs.size === 0) {
      prPattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = prPattern.exec(lines[0])) !== null) {
        const prStr = match[1] ?? match[2];
        if (prStr) {
          const prNum = parseInt(prStr, 10);
          if (!isNaN(prNum) && prNum > 0 && !mergedPrs.has(prNum)) {
            pendingPrs.add(prNum);
          }
        }
      }
    }
  }

  return Array.from(pendingPrs).sort((a, b) => a - b);
}

/**
 * Inspects whether the local Git repository is shallow or unavailable.
 */
export function isGitHistoryAvailable(cwd?: string): boolean {
  try {
    const isShallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();

    if (isShallow === 'true') {
      return false;
    }

    const commitCount = execFileSync('git', ['rev-list', '--count', 'HEAD'], {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();

    return parseInt(commitCount, 10) > 1;
  } catch {
    return false;
  }
}

/**
 * Extracts merged PR numbers from local git log commit subjects.
 * Matches GitHub squash merge subjects "... (#123)" and merge commits "Merge pull request #123".
 */
export function getMergedPrNumbersFromGit(cwd?: string, maxCommits = 500): Set<number> {
  const mergedPrs = new Set<number>();
  try {
    const logOutput = execFileSync('git', ['log', `-n${maxCommits}`, '--format=%s'], {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    const lines = logOutput.split(/\r?\n/);
    const squashRegex = /\(#(\d+)\)$/;
    const mergePrRegex = /^Merge pull request #(\d+)/;

    for (const line of lines) {
      const squashMatch = line.match(squashRegex);
      if (squashMatch) {
        mergedPrs.add(parseInt(squashMatch[1], 10));
        continue;
      }
      const mergeMatch = line.match(mergePrRegex);
      if (mergeMatch) {
        mergedPrs.add(parseInt(mergeMatch[1], 10));
      }
    }
  } catch (error) {
    throw new Error(`Failed to retrieve merged PRs from git log: ${error instanceof Error ? error.message : String(error)}`);
  }

  return mergedPrs;
}

/**
 * Validates that the backlog's current version entry does not mark any merged PR as pending.
 */
export function validateBacklogPending(
  backlogContent: string,
  mergedPrs: Set<number>
): BacklogValidationResult {
  const currentEntry = parseCurrentVersionEntry(backlogContent);
  const pendingPrs = extractPendingPrNumbers(currentEntry.text);
  const violations: string[] = [];

  for (const pr of pendingPrs) {
    if (mergedPrs.has(pr)) {
      violations.push(
        `Backlog version ${currentEntry.version} marks PR #${pr} as pending, but PR #${pr} is already merged into main.`
      );
    }
  }

  return {
    valid: violations.length === 0,
    currentVersion: currentEntry.version,
    pendingPrs,
    violations
  };
}

/**
 * Asserts that no merged PR is marked as pending in the backlog's current version entry.
 */
export function assertNoMergedPrsPending(
  backlogContent: string,
  mergedPrs: Set<number>
): void {
  const result = validateBacklogPending(backlogContent, mergedPrs);
  assert.equal(
    result.valid,
    true,
    `Backlog integrity violation detected:\n${result.violations.join('\n')}`
  );
}
