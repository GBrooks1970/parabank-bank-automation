import Ajv, { ValidateFunction } from 'ajv';

/**
 * FR-B1 helper: fetches the OpenAPI 3.0.1 spec LIVE from the running SUT (never a
 * checked-in copy — the SUT pin pins the spec) and validates response bodies against
 * its component schemas via Ajv. `strict: false` because OpenAPI 3.0 schemas carry
 * dialect keywords (e.g. `nullable`) outside Ajv's default draft.
 */
export class SpecConformance {
  private constructor(
    public readonly spec: Record<string, unknown>,
    private readonly ajv: Ajv
  ) {}

  static async fromLiveSpec(baseUrl: string): Promise<SpecConformance> {
    const res = await fetch(`${baseUrl}/parabank/services/bank/openapi.json`);
    if (res.status !== 200) {
      throw new Error(`openapi.json not served: HTTP ${res.status}`);
    }
    const spec = (await res.json()) as Record<string, unknown>;
    const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false });
    // Register the whole document so $ref pointers into components resolve.
    ajv.addSchema(spec, 'openapi');
    return new SpecConformance(spec, ajv);
  }

  get openapiVersion(): string {
    return String(this.spec['openapi']);
  }

  private compiled(ref: string): ValidateFunction {
    // JSON-pointer lookup into the registered spec document; Ajv compiles and caches.
    const fn = this.ajv.getSchema(`openapi#/components/schemas/${ref}`);
    if (!fn) throw new Error(`Component schema not found in live spec: ${ref}`);
    return fn;
  }

  /**
   * Validate one object against a named component schema. Returns error text or null.
   * `allowedDeviations` are substring matchers (instancePath + message) for deviations
   * ALREADY recorded as backlog risks (FR-B1: never silently accommodated — an allowance
   * here must cite a PBR-nn risk in docs/backlog.md at the call site).
   */
  validate(schemaName: string, data: unknown, allowedDeviations: string[] = []): string | null {
    const fn = this.compiled(schemaName);
    if (fn(data)) return null;
    const remaining = (fn.errors ?? []).filter(
      (err) => !allowedDeviations.some((allowed) => `${err.instancePath} ${err.message}`.includes(allowed))
    );
    return remaining.length === 0 ? null : this.ajv.errorsText(remaining, { dataVar: schemaName });
  }

  /** Validate an array where every element must match the named component schema. */
  validateArray(schemaName: string, data: unknown, allowedDeviations: string[] = []): string | null {
    if (!Array.isArray(data)) return `${schemaName}[]: response body is not an array`;
    for (let i = 0; i < data.length; i++) {
      const error = this.validate(schemaName, data[i], allowedDeviations);
      if (error) return `${schemaName}[${i}]: ${error}`;
    }
    return null;
  }

  /** True when the live spec documents `status` for the given path+method. */
  documentsStatus(path: string, method: string, status: number): boolean {
    const paths = this.spec['paths'] as Record<string, Record<string, { responses?: Record<string, unknown> }>>;
    const op = paths?.[path]?.[method.toLowerCase()];
    if (!op?.responses) return false;
    return Object.keys(op.responses).includes(String(status)) || Object.keys(op.responses).includes('default');
  }
}
