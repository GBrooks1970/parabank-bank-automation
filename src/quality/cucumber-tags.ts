export interface FeatureDocument {
  file: string;
  lane: string;
  source: string;
}

export interface ScenarioTags {
  name: string;
  line: number;
  tags: string[];
}

export interface TagPolicyResult {
  failures: string[];
  smokeByLane: Record<string, number>;
}

/** Parse scenario tags while applying Cucumber's feature-level tag inheritance. */
export function scenarioTagsFromFeature(source: string): ScenarioTags[] {
  const scenarios: ScenarioTags[] = [];
  let featureTags: string[] = [];
  let pendingTags: string[] = [];
  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (line.startsWith('@')) {
      pendingTags.push(...line.split(/\s+/).filter((tag) => tag.startsWith('@')));
      continue;
    }
    if (line.startsWith('Feature:')) {
      featureTags = [...pendingTags];
      pendingTags = [];
      continue;
    }
    const scenario = /^Scenario(?: Outline)?:\s*(.+)$/.exec(line);
    if (scenario) {
      scenarios.push({
        name: scenario[1].trim(),
        line: index + 1,
        tags: [...new Set([...featureTags, ...pendingTags])]
      });
      pendingTags = [];
      continue;
    }
    if (line !== '' && !line.startsWith('#')) {
      pendingTags = [];
    }
  }
  return scenarios;
}

/** Evaluate the fixed smoke-count and store-safety policy without reading the filesystem. */
export function evaluateTagPolicy(
  documents: readonly FeatureDocument[],
  expectedSmokeCounts: Readonly<Record<string, number>>
): TagPolicyResult {
  const failures: string[] = [];
  const smokeByLane = Object.fromEntries(Object.keys(expectedSmokeCounts).map((lane) => [lane, 0]));

  for (const document of documents) {
    for (const scenario of scenarioTagsFromFeature(document.source)) {
      if (!scenario.tags.includes('@smoke')) continue;
      smokeByLane[document.lane] = (smokeByLane[document.lane] ?? 0) + 1;
      if (scenario.tags.includes('@mutates')) {
        failures.push(`${document.file}:${scenario.line} — scenario is tagged BOTH @smoke and @mutates`);
      }
    }
  }

  for (const [lane, expected] of Object.entries(expectedSmokeCounts)) {
    const actual = smokeByLane[lane] ?? 0;
    const laneExists = documents.some((document) => document.lane === lane);
    if (!laneExists && lane === 'features/ui') continue;
    if (actual !== expected) {
      failures.push(
        `${lane}: ${actual} @smoke scenario(s), design doc §5.9 fixes ${expected} — changing the smoke set is a design-doc amendment`
      );
    }
  }
  return { failures, smokeByLane };
}
