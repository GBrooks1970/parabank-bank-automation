import { After, Before, BeforeAll, setDefaultTimeout } from '@cucumber/cucumber';
import { seedDatabase } from '../../src/api/reset';
import { ParaBankRestClient } from '../../src/api/client';
import { SpecConformance } from '../../src/api/spec-conformance';
import { Actor } from '../../src/screenplay/core';
import { CallParaBankRest, CallParaBankSoap } from '../../src/screenplay/abilities';
import { BASE_URL, PBWorld } from './world';

// SUT calls poll (seed can wait for boot); scenario steps are network-bound.
setDefaultTimeout(30_000);

BeforeAll({ timeout: 150_000 }, async function () {
  // DR-PB-06 boot→seed→use: seeding doubles as the readiness wait.
  await seedDatabase(BASE_URL);
  // FR-B1: the spec is fetched live, once per run.
  PBWorld.spec = await SpecConformance.fromLiveSpec(BASE_URL);
});

Before(async function (this: PBWorld, { pickle }) {
  // Reset bracket (design doc §5.5): scenarios tagged @mutates start from seed state.
  if (pickle.tags.some((t) => t.name === '@mutates')) {
    await seedDatabase(BASE_URL);
  }
  this.actor = new Actor('Tess').whoCan(
    new CallParaBankRest(new ParaBankRestClient(BASE_URL)),
    new CallParaBankSoap(BASE_URL)
  );
});

// FR-A5 and the FR-B1 matrix pin/mutate admin or database state; restore defaults
// afterwards — initializeDB resets admin parameters along with the data.
After('@loan or @contract-matrix', async function () {
  await seedDatabase(BASE_URL);
});
