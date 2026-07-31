export interface ReportCoverageResult {
  scenarioNames: string[];
  missingScenarioNames: string[];
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

/** Compare feature names with exact string values present in Serenity JSON artefacts. */
export function inspectSerenityCoverage(
  featureSources: readonly string[],
  artifactJsonTexts: readonly string[]
): ReportCoverageResult {
  const scenarioNames = featureSources.flatMap(scenarioNamesFromFeature);
  const artifactStrings = new Set<string>();
  const invalidArtifactIndexes: number[] = [];

  artifactJsonTexts.forEach((text, index) => {
    try {
      collectStrings(JSON.parse(text), artifactStrings);
    } catch {
      invalidArtifactIndexes.push(index);
    }
  });

  return {
    scenarioNames,
    missingScenarioNames: scenarioNames.filter((name) => !artifactStrings.has(name)),
    invalidArtifactIndexes
  };
}

function collectStrings(value: unknown, result: Set<string>): void {
  if (typeof value === 'string') {
    result.add(value);
  } else if (Array.isArray(value)) {
    value.forEach((entry) => collectStrings(entry, result));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((entry) => collectStrings(entry, result));
  }
}
