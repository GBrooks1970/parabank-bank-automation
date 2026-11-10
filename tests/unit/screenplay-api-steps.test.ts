import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { CreateAccount, round2 } from '../../src/screenplay/tasks';

test('features/api/steps/api.steps.ts contains 0 direct abilityTo calls (Screenplay seam integrity)', () => {
  const stepFile = join('features', 'api', 'steps', 'api.steps.ts');
  const source = readFileSync(stepFile, 'utf8');

  const matches = [...source.matchAll(/\babilityTo\b/g)];
  assert.equal(
    matches.length,
    0,
    `expected 0 direct abilityTo calls in ${stepFile}, found ${matches.length}`
  );
});

test('features/api/steps/api.steps.ts does not import transport classes CallParaBankRest or CallParaBankSoap', () => {
  const stepFile = join('features', 'api', 'steps', 'api.steps.ts');
  const source = readFileSync(stepFile, 'utf8');

  assert.ok(!source.includes('CallParaBankRest'), 'api.steps.ts must not reference CallParaBankRest');
  assert.ok(!source.includes('CallParaBankSoap'), 'api.steps.ts must not reference CallParaBankSoap');
});

test('every Given/When/Then step definition in api.steps.ts delegates cleanly in a single statement', () => {
  const stepFile = join('features', 'api', 'steps', 'api.steps.ts');
  const source = readFileSync(stepFile, 'utf8');

  // Match step definition blocks: (Given|When|Then)(<string|regex>, async function (...) { <body> });
  const stepPattern = /(?:Given|When|Then)\((?:'[^']+'|"[^"]+"|\/[^\/]+\/),\s*(?:async\s+)?function\s*\([^)]*\)\s*\{([\s\S]*?)\}\);/g;
  const matches = [...source.matchAll(stepPattern)];

  assert.equal(matches.length, 31, `expected exactly 31 step definitions, matched ${matches.length}`);

  for (const match of matches) {
    const body = match[1]
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('//'));

    assert.equal(
      body.length,
      1,
      `step definition body must be exactly 1 statement, got ${body.length}: ${JSON.stringify(body)}`
    );
    assert.ok(
      body[0].startsWith('await this.actor.attemptsTo('),
      `step statement must delegate to this.actor.attemptsTo: ${body[0]}`
    );
  }
});

test('CreateAccount.ofTypeNamed rejects unknown account types and resolves valid types', () => {
  assert.throws(
    () => CreateAccount.ofTypeNamed('INVALID_TYPE'),
    /unknown account type INVALID_TYPE/
  );

  const checking = CreateAccount.ofTypeNamed('CHECKING');
  assert.equal(typeof checking.fundedFrom, 'function');

  const savings = CreateAccount.ofTypeNamed('SAVINGS');
  assert.equal(typeof savings.fundedFrom, 'function');
});

test('round2 performs correct floating point money rounding without IEEE noise', () => {
  assert.equal(round2(10.45), 10.45);
  assert.equal(round2(10.450000000000003), 10.45);
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(round2(-2300.00), -2300.0);
});
