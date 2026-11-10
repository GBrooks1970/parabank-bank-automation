import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const UI_STEPS_PATH = join('features', 'ui', 'steps', 'ui.steps.ts');

test('features/ui/steps/ui.steps.ts contains 0 occurrences of this.actor (second actor retired)', () => {
  const source = readFileSync(UI_STEPS_PATH, 'utf8');
  const matches = [...source.matchAll(/\bthis\.actor\b/g)];
  assert.equal(
    matches.length,
    0,
    `expected 0 occurrences of this.actor in ${UI_STEPS_PATH}, found ${matches.length}`
  );
});

test('features/ui/steps/ui.steps.ts contains 0 direct abilityTo calls (Screenplay seam integrity)', () => {
  const source = readFileSync(UI_STEPS_PATH, 'utf8');
  const matches = [...source.matchAll(/\babilityTo\b/g)];
  assert.equal(
    matches.length,
    0,
    `expected 0 direct abilityTo calls in ${UI_STEPS_PATH}, found ${matches.length}`
  );
});

test('features/ui/steps/ui.steps.ts does not import node:assert (all assertions through Serenity Ensure)', () => {
  const source = readFileSync(UI_STEPS_PATH, 'utf8');
  assert.ok(
    !source.includes("from 'node:assert") && !source.includes('from "node:assert"'),
    `${UI_STEPS_PATH} must not import node:assert; use Serenity Ensure for report visibility`
  );
});

test('features/ui/steps/ui.steps.ts uses PinTheLoanEnvironment task for parameter pinning', () => {
  const source = readFileSync(UI_STEPS_PATH, 'utf8');
  assert.ok(
    source.includes('PinTheLoanEnvironment'),
    `${UI_STEPS_PATH} must delegate parameter pinning to PinTheLoanEnvironment task`
  );
  assert.ok(
    !source.includes('setParameter'),
    `${UI_STEPS_PATH} must not directly call setParameter (DR-PB-13 / destructive-call-sites)`
  );
});

test('features/ui/steps/ui.steps.ts binds scenario memory through theNotes', () => {
  const source = readFileSync(UI_STEPS_PATH, 'utf8');
  assert.ok(
    source.includes('theNotes()'),
    `${UI_STEPS_PATH} must use theNotes() for actor scenario state`
  );
  assert.ok(
    source.includes("theNotes().set('registration'"),
    `${UI_STEPS_PATH} must record registration details in theNotes()`
  );
});
