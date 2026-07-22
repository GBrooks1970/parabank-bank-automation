import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Actor } from '../../src/screenplay/core';
import { SpecConformance } from '../../src/api/spec-conformance';

export const BASE_URL = process.env.PARABANK_URL ?? 'http://localhost:8090';

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
