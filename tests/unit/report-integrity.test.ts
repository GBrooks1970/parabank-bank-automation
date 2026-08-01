import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectSerenityCoverage, scenarioNamesFromFeature } from '../../src/quality/report-integrity';

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

test('inspectSerenityCoverage finds exact scenario strings in nested valid artefacts', () => {
  const result = inspectSerenityCoverage(
    ['Feature: report\nScenario: First journey\nScenario: Second journey'],
    [JSON.stringify({ name: 'First journey', children: [{ title: 'Second journey' }] })]
  );

  assert.deepEqual(result, {
    scenarioNames: ['First journey', 'Second journey'],
    missingScenarioNames: [],
    invalidArtifactIndexes: []
  });
});

test('inspectSerenityCoverage reports invalid JSON and exact-name omissions', () => {
  const result = inspectSerenityCoverage(
    ['Feature: report\nScenario: Full scenario name'],
    ['{"name":"Full scenario"}', 'not-json']
  );

  assert.deepEqual(result.missingScenarioNames, ['Full scenario name']);
  assert.deepEqual(result.invalidArtifactIndexes, [1]);
});
