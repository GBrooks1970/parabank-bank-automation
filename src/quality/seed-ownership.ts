/**
 * TRIAGE-02: who owns the seed state during a run.
 *
 * Normally every Cucumber process seeds in BeforeAll (DR-PB-06 boot→seed→use). The smoke-safety
 * runner (`scripts/smoke-safety.mjs`) instead seeds once itself and compares the seeded customer's
 * state after each lane; a re-seed inside a lane would erase the very mutation it is looking for.
 * It therefore sets PARABANK_SEED_OWNER=smoke-safety for its child processes only, and the shared
 * hooks then neither seed at start nor reset around a scenario.
 *
 * Only the exact value counts: an unset, empty or unexpected value leaves normal seeding on, so a
 * stray environment variable cannot silently switch it off.
 */

export const SEED_OWNER_ENV = 'PARABANK_SEED_OWNER';
export const SMOKE_SAFETY_OWNER = 'smoke-safety';

/** True only when the smoke-safety runner has taken ownership of the seed state. */
export function seedOwnedExternally(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[SEED_OWNER_ENV] === SMOKE_SAFETY_OWNER;
}

/**
 * TRIAGE-11 (DR-PB-06, design doc §5.5, R-07): Refuse a reset attempt while the
 * smoke-safety runner owns the seed state.
 */
export function assertResetAllowed(scenarioName: string, env: NodeJS.ProcessEnv = process.env): void {
  if (seedOwnedExternally(env)) {
    throw new Error(
      `smoke-safety owns the seed state; scenario "${scenarioName}" would reset it. @smoke scenarios must not trigger a reset hook.`
    );
  }
}

// TRIAGE-15 must-fail proof: deliberate type mismatch to prove static job fails before SUT build
export const _mustFailTypeCheck: number = 'deliberate_compilation_failure_for_triage_15_must_fail_proof';
