export interface ScenarioResult {
  name: string;
  result: string;
}

export interface ReportCoverageResult {
  scenarioNames: string[];
  results: Map<string, string>;
  missingScenarioNames: string[];
  nonSuccessScenarios: ScenarioResult[];
  unexpectedScenarioNames: string[];
  invalidArtifactIndexes: number[];
}

/** Extract concrete Scenario and Scenario Outline names from Gherkin source. */
export function scenarioNamesFromFeature(source: string): string[] {
  return source
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = /^\s*Scenario(?: Outline)?:\s*(.+)$/.exec(line);
      return match ? [match[1].trim()] : [];
    });
}

/**
 * Verify Serenity JSON report artefacts against an expected list of scenarios.
 * Strictly verifies that every expected scenario is present by its exact name
 * and has result === 'SUCCESS', and detects missing, non-SUCCESS, or unexpected scenarios.
 */
export function verifySerenityReport(
  expectedScenarios: readonly string[],
  artifactJsonTexts: readonly string[]
): ReportCoverageResult {
  const results = new Map<string, string>();
  const invalidArtifactIndexes: number[] = [];

  artifactJsonTexts.forEach((text, index) => {
    try {
      const parsed = JSON.parse(text) as { name?: unknown; result?: unknown } | null;
      if (parsed && typeof parsed === 'object' && typeof parsed.name === 'string') {
        results.set(parsed.name, String(parsed.result));
      }
    } catch {
      invalidArtifactIndexes.push(index);
    }
  });

  const missingScenarioNames: string[] = [];
  const nonSuccessScenarios: ScenarioResult[] = [];
  for (const name of expectedScenarios) {
    const result = results.get(name);
    if (result === undefined) {
      missingScenarioNames.push(name);
    } else if (result !== 'SUCCESS') {
      nonSuccessScenarios.push({ name, result });
    }
  }

  const unexpectedScenarioNames: string[] = [];
  for (const name of results.keys()) {
    if (!expectedScenarios.includes(name)) {
      unexpectedScenarioNames.push(name);
    }
  }

  return {
    scenarioNames: [...expectedScenarios],
    results,
    missingScenarioNames,
    nonSuccessScenarios,
    unexpectedScenarioNames,
    invalidArtifactIndexes
  };
}

/** Compare feature names with Serenity JSON artefacts, verifying presence and SUCCESS outcome. */
export function inspectSerenityCoverage(
  featureSources: readonly string[],
  artifactJsonTexts: readonly string[]
): ReportCoverageResult {
  const scenarioNames = featureSources.flatMap(scenarioNamesFromFeature);
  return verifySerenityReport(scenarioNames, artifactJsonTexts);
}

/** Format standard failure diagnostic strings from a ReportCoverageResult. */
export function formatReportCoverageFailures(
  coverage: ReportCoverageResult,
  artifactFileNames?: readonly string[]
): string[] {
  const failures: string[] = [];
  for (const index of coverage.invalidArtifactIndexes) {
    const fileLabel = artifactFileNames && artifactFileNames[index] ? artifactFileNames[index] : `index ${index}`;
    failures.push(`invalid Serenity JSON artefact: ${fileLabel}`);
  }
  for (const name of coverage.missingScenarioNames) {
    failures.push(`scenario missing from Serenity artefacts: '${name}'`);
  }
  for (const { name, result } of coverage.nonSuccessScenarios) {
    failures.push(`scenario '${name}' is ${result}, not SUCCESS`);
  }
  for (const name of coverage.unexpectedScenarioNames) {
    failures.push(`unexpected scenario in Serenity artefacts: '${name}'`);
  }
  return failures;
}
