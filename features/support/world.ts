import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Actor } from '../../src/screenplay/core';
import { SpecConformance } from '../../src/api/spec-conformance';
import { assertLocalSut } from '../../src/quality/target-guard';

export const BASE_URL = process.env.PARABANK_URL ?? 'http://localhost:8090';
// DR-PB-13: these lanes reset, wipe and re-configure their target, so refuse anything but the
// local SUT before a single request is made (this module loads before every hook).
assertLocalSut(BASE_URL, 'The Cucumber lanes');

export class PBWorld extends World {
  /** The scenario's actor — built with both abilities in the Before hook. */
  actor!: Actor;
  /** Live-spec validator, fetched once per run (FR-B1); set in BeforeAll. */
  static spec: SpecConformance;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(PBWorld);
