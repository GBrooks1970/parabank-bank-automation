import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ActionPin {
  action: string;
  ref: string;
  comment?: string;
  isPinnedSha: boolean;
  hasVersionComment: boolean;
  lineNumber: number;
  rawLine: string;
}

export interface ActionPinAuditResult {
  valid: boolean;
  pins: ActionPin[];
  errors: string[];
}

export interface CiWorkflowAuditResult {
  valid: boolean;
  errors: string[];
}

const SHA_40_REGEX = /^[0-9a-f]{40}$/i;
const USES_REGEX = /^\s*-\s+(?:name:\s*.*?\n\s+)?uses:\s*([^@\s]+)@([^\s#]+)(?:\s*#\s*([^\s\r\n]+))?/gm;

/**
 * Extracts and audits all action pins (`uses: owner/repo@ref # comment`) from workflow YAML content.
 */
export function extractActionPins(yamlContent: string): ActionPin[] {
  const pins: ActionPin[] = [];
  const lines = yamlContent.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = /^\s*(?:-\s+)?uses:\s*([^@\s]+)@([^\s#]+)(?:\s*#\s*([^\s\r\n]+))?/.exec(line);
    if (!match) continue;

    const action = match[1].trim();
    const ref = match[2].trim();
    const comment = match[3]?.trim();

    // Skip local actions (./) or docker images (docker://)
    if (action.startsWith('./') || action.startsWith('docker://')) {
      continue;
    }

    const isPinnedSha = SHA_40_REGEX.test(ref);
    const hasVersionComment = !!comment && /^v?\d+/i.test(comment);

    pins.push({
      action,
      ref,
      comment,
      isPinnedSha,
      hasVersionComment,
      lineNumber: i + 1,
      rawLine: line.trim()
    });
  }

  return pins;
}

/**
 * Audits all external actions in a workflow string for strict 40-character SHA pinning and version comments.
 */
export function auditActionPins(yamlContent: string, fileName = 'workflow.yml'): ActionPinAuditResult {
  const pins = extractActionPins(yamlContent);
  const errors: string[] = [];

  for (const pin of pins) {
    if (!pin.isPinnedSha) {
      errors.push(`${fileName}:${pin.lineNumber} Action '${pin.action}' is not pinned to a 40-character commit SHA (got '${pin.ref}')`);
    }
    if (!pin.hasVersionComment) {
      errors.push(`${fileName}:${pin.lineNumber} Action '${pin.action}' lacks a human-readable release comment (e.g. '# v1.2.3')`);
    }
  }

  return {
    valid: errors.length === 0,
    pins,
    errors
  };
}

/**
 * Audits all workflow files in `.github/workflows/` for action pin compliance.
 */
export function auditAllWorkflowPins(workflowsDir: string): ActionPinAuditResult {
  const errors: string[] = [];
  const allPins: ActionPin[] = [];

  const files = readdirSync(workflowsDir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .sort();

  for (const file of files) {
    const fullPath = join(workflowsDir, file);
    const content = readFileSync(fullPath, 'utf8');
    const result = auditActionPins(content, file);
    allPins.push(...result.pins);
    errors.push(...result.errors);
  }

  return {
    valid: errors.length === 0,
    pins: allPins,
    errors
  };
}

/**
 * Validates the structure and gates of `.github/workflows/ci.yml`.
 */
export function verifyCiWorkflow(ciContent: string): CiWorkflowAuditResult {
  const errors: string[] = [];

  // 1. Concurrency configuration
  const hasConcurrencyBlock = /concurrency:\s*\r?\n\s+group:\s*\$\{\{\s*github\.workflow\s*\}\}-\$\{\{\s*github\.ref\s*\}\}/.test(ciContent);
  const hasCancelInProgress = /cancel-in-progress:\s*true/.test(ciContent);

  if (!hasConcurrencyBlock) {
    errors.push("ci.yml missing top-level concurrency group '${{ github.workflow }}-${{ github.ref }}'");
  }
  if (!hasCancelInProgress) {
    errors.push("ci.yml missing top-level 'cancel-in-progress: true'");
  }

  // 2. static job existence and composition
  const hasStaticJob = /^\s{2}static:\s*$/m.test(ciContent);
  if (!hasStaticJob) {
    errors.push("ci.yml missing 'static' job");
  } else {
    // Check required commands in static job
    const staticJobMatch = /^\s{2}static:\s*([\s\S]*?)^\s{2}[a-z0-9_-]+:\s*$/m.exec(ciContent);
    const staticJobText = staticJobMatch ? staticJobMatch[1] : '';

    if (!staticJobText.includes('npm ci')) {
      errors.push("static job missing 'npm ci'");
    }
    if (!staticJobText.includes('npm run lint:tags')) {
      errors.push("static job missing 'npm run lint:tags'");
    }
    if (!staticJobText.includes('npm run typecheck')) {
      errors.push("static job missing 'npm run typecheck'");
    }
    if (!staticJobText.includes('npm run typecheck:style-02')) {
      errors.push("static job missing 'npm run typecheck:style-02'");
    }
    if (!staticJobText.includes('npm run typecheck:style-03')) {
      errors.push("static job missing 'npm run typecheck:style-03'");
    }
    if (!staticJobText.includes('npm run perf:typecheck')) {
      errors.push("static job missing 'npm run perf:typecheck'");
    }
    if (!staticJobText.includes('npm run test:unit')) {
      errors.push("static job missing 'npm run test:unit'");
    }

    // Dependency audit non-blocking check
    const hasAuditCommand = /npm audit --audit-level=high --omit=optional/.test(staticJobText);
    const hasContinueOnError = /continue-on-error:\s*true\s*\r?\n\s+run:\s*npm audit --audit-level=high/.test(staticJobText);

    if (!hasAuditCommand) {
      errors.push("static job missing 'npm audit --audit-level=high --omit=optional'");
    }
    if (!hasContinueOnError) {
      errors.push("static job audit step missing 'continue-on-error: true'");
    }
  }

  // 3. sut-boot-gate needs static
  const sutJobMatch = /^\s{2}sut-boot-gate:\s*([\s\S]*?)^\s{2}[a-z0-9_-]+:\s*$/m.exec(ciContent);
  if (!sutJobMatch) {
    errors.push("ci.yml missing 'sut-boot-gate' job");
  } else {
    const sutJobText = sutJobMatch[1];
    if (!/needs:\s*static\b/.test(sutJobText)) {
      errors.push("sut-boot-gate job missing 'needs: static' dependency gate");
    }
  }

  // 4. deploy-pages needs sut-boot-gate
  const pagesJobMatch = /^\s{2}deploy-pages:\s*([\s\S]*)$/m.exec(ciContent);
  if (!pagesJobMatch) {
    errors.push("ci.yml missing 'deploy-pages' job");
  } else {
    const pagesJobText = pagesJobMatch[1];
    if (!/needs:\s*sut-boot-gate\b/.test(pagesJobText)) {
      errors.push("deploy-pages job missing 'needs: sut-boot-gate' dependency gate");
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Asserts that the CI workflow adheres to all architecture constraints.
 */
export function assertCiWorkflowIntegrity(ciContent: string): void {
  const result = verifyCiWorkflow(ciContent);
  if (!result.valid) {
    throw new Error(`CI workflow integrity violation:\n${result.errors.map((e) => `  - ${e}`).join('\n')}`);
  }
}
