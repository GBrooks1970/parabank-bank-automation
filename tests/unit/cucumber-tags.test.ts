import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateTagPolicy, scenarioTagsFromFeature } from '../../src/quality/cucumber-tags';

test('scenarioTagsFromFeature applies feature and scenario tag inheritance', () => {
  const scenarios = scenarioTagsFromFeature(`
@api @mutates
Feature: inherited tags

  @smoke
  Scenario: unsafe inherited combination
    Given a step
`);

  assert.deepEqual(scenarios, [
    {
      name: 'unsafe inherited combination',
      line: 6,
      tags: ['@api', '@mutates', '@smoke']
    }
  ]);
});

test('evaluateTagPolicy rejects inherited @smoke/@mutates and reports fixed-count drift', () => {
  const result = evaluateTagPolicy(
    [
      {
        file: 'features/api/example.feature',
        lane: 'features/api',
        source: '@mutates\nFeature: unsafe\n@smoke\nScenario: inherited conflict'
      }
    ],
    { 'features/api': 2 }
  );

  assert.equal(result.smokeByLane['features/api'], 1);
  assert.deepEqual(result.failures, [
    'features/api/example.feature:4 — scenario is tagged BOTH @smoke and @mutates',
    'features/api: 1 @smoke scenario(s), design doc §5.9 fixes 2 — changing the smoke set is a design-doc amendment'
  ]);
});

test('evaluateTagPolicy accepts the intended inherited lane tags and smoke count', () => {
  const result = evaluateTagPolicy(
    [
      {
        file: 'features/api/reads.feature',
        lane: 'features/api',
        source: '@api\nFeature: reads\n@smoke\nScenario: first\n@smoke\nScenario Outline: second'
      }
    ],
    { 'features/api': 2 }
  );

  assert.deepEqual(result, { failures: [], smokeByLane: { 'features/api': 2 } });
});
