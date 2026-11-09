import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatReportCoverageFailures,
  inspectSerenityCoverage,
  scenarioNamesFromFeature,
  verifySerenityReport
} from '../../src/quality/report-integrity';

test('scenarioNamesFromFeature extracts scenarios and outlines but not comments', () => {
  assert.deepEqual(
    scenarioNamesFromFeature(`
Feature: report
  Scenario: First journey
  # Scenario: Commented out
  Scenario Outline: Boundary <amount>
`),
    ['First journey', 'Boundary <amount>']
  );
});

test('verifySerenityReport and inspectSerenityCoverage pass when all scenarios are present and SUCCESS', () => {
  const expected = ['First journey', 'Second journey'];
  const artifacts = [
    JSON.stringify({ name: 'First journey', result: 'SUCCESS' }),
    JSON.stringify({ name: 'Second journey', result: 'SUCCESS' })
  ];

  const result = verifySerenityReport(expected, artifacts);
  assert.deepEqual(result.scenarioNames, expected);
  assert.deepEqual(result.missingScenarioNames, []);
  assert.deepEqual(result.nonSuccessScenarios, []);
  assert.deepEqual(result.unexpectedScenarioNames, []);
  assert.deepEqual(result.invalidArtifactIndexes, []);
  assert.equal(result.results.get('First journey'), 'SUCCESS');
  assert.equal(result.results.get('Second journey'), 'SUCCESS');
  assert.deepEqual(formatReportCoverageFailures(result, ['first.json', 'second.json']), []);

  const featureCoverage = inspectSerenityCoverage(
    ['Feature: report\nScenario: First journey\nScenario: Second journey'],
    artifacts
  );
  assert.deepEqual(featureCoverage.missingScenarioNames, []);
  assert.deepEqual(featureCoverage.nonSuccessScenarios, []);
  assert.deepEqual(featureCoverage.unexpectedScenarioNames, []);
  assert.deepEqual(featureCoverage.invalidArtifactIndexes, []);
});

test('MUST-FAIL: inspectSerenityCoverage rejects non-SUCCESS results (FAILURE, BROKEN, PENDING)', () => {
  const result = inspectSerenityCoverage(
    ['Feature: report\nScenario: Success journey\nScenario: Failed journey\nScenario: Broken journey'],
    [
      JSON.stringify({ name: 'Success journey', result: 'SUCCESS' }),
      JSON.stringify({ name: 'Failed journey', result: 'FAILURE' }),
      JSON.stringify({ name: 'Broken journey', result: 'BROKEN' })
    ]
  );

  assert.deepEqual(result.missingScenarioNames, []);
  assert.deepEqual(result.nonSuccessScenarios, [
    { name: 'Failed journey', result: 'FAILURE' },
    { name: 'Broken journey', result: 'BROKEN' }
  ]);

  const failures = formatReportCoverageFailures(result);
  assert.ok(failures.includes("scenario 'Failed journey' is FAILURE, not SUCCESS"));
  assert.ok(failures.includes("scenario 'Broken journey' is BROKEN, not SUCCESS"));
});

test('MUST-FAIL: inspectSerenityCoverage rejects scenario names appearing only as free text in children/description', () => {
  // Legacy weakness: free text inside children/description matched as a scenario name.
  // New implementation requires a top-level name property on the scenario artefact.
  const result = inspectSerenityCoverage(
    ['Feature: report\nScenario: First journey\nScenario: Second journey'],
    [
      JSON.stringify({
        name: 'First journey',
        result: 'SUCCESS',
        description: 'Second journey mentioned in description',
        children: [{ title: 'Second journey step' }]
      })
    ]
  );

  assert.deepEqual(result.missingScenarioNames, ['Second journey']);
  assert.deepEqual(result.nonSuccessScenarios, []);
  const failures = formatReportCoverageFailures(result);
  assert.ok(failures.includes("scenario missing from Serenity artefacts: 'Second journey'"));
});

test('verifySerenityReport rejects unexpected scenarios not in the expected list', () => {
  const result = verifySerenityReport(
    ['Expected scenario'],
    [
      JSON.stringify({ name: 'Expected scenario', result: 'SUCCESS' }),
      JSON.stringify({ name: 'Surprise rogue test', result: 'SUCCESS' })
    ]
  );

  assert.deepEqual(result.missingScenarioNames, []);
  assert.deepEqual(result.unexpectedScenarioNames, ['Surprise rogue test']);
  const failures = formatReportCoverageFailures(result);
  assert.ok(failures.includes("unexpected scenario in Serenity artefacts: 'Surprise rogue test'"));
});

test('inspectSerenityCoverage reports invalid JSON and exact-name omissions', () => {
  const result = inspectSerenityCoverage(
    ['Feature: report\nScenario: Full scenario name'],
    ['{"name":"Full scenario","result":"SUCCESS"}', 'not-json']
  );

  assert.deepEqual(result.missingScenarioNames, ['Full scenario name']);
  assert.deepEqual(result.invalidArtifactIndexes, [1]);
  const failures = formatReportCoverageFailures(result, ['scenario-1.json', 'broken.json']);
  assert.ok(failures.includes("invalid Serenity JSON artefact: broken.json"));
  assert.ok(failures.includes("scenario missing from Serenity artefacts: 'Full scenario name'"));
});

test('verifySerenityReport ignores non-scenario JSON artifacts without a string name', () => {
  const result = verifySerenityReport(
    ['Expected scenario'],
    [
      JSON.stringify({ name: 'Expected scenario', result: 'SUCCESS' }),
      JSON.stringify({ metadata: 'report-meta', timestamp: 123456789 })
    ]
  );

  assert.deepEqual(result.missingScenarioNames, []);
  assert.deepEqual(result.nonSuccessScenarios, []);
  assert.deepEqual(result.unexpectedScenarioNames, []);
  assert.deepEqual(result.invalidArtifactIndexes, []);
});
