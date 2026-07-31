import Ajv, { ErrorObject, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { OPERATION_CONTRACTS, OPERATION_NAMES, OperationContract, OperationName } from './operation-contracts';
import { ApiResponse } from './types';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options' | 'trace';

interface OpenApiMediaType {
  schema?: unknown;
}

interface OpenApiResponse {
  content?: Record<string, OpenApiMediaType>;
}

interface OpenApiOperation {
  responses?: Record<string, OpenApiResponse>;
}

export interface OperationCoverageSummary {
  expected: OperationName[];
  exercised: OperationName[];
  missing: OperationName[];
  excludedLiveOperations: string[];
  appliedDeviations: string[];
}

/**
 * FR-B1 operation-aware validator.
 *
 * The matrix supplies identity and observed transport facts; response schemas always
 * resolve from the matching method/path/status/media entry in the live document. This
 * prevents a scenario from passing by naming a detached component schema that the
 * operation does not actually declare.
 */
export class SpecConformance {
  private readonly exercised = new Set<OperationName>();
  private readonly appliedDeviations = new Set<string>();

  private constructor(
    public readonly spec: Record<string, unknown>,
    private readonly ajv: Ajv
  ) {}

  static async fromLiveSpec(baseUrl: string): Promise<SpecConformance> {
    const res = await fetch(`${baseUrl}/parabank/services/bank/openapi.json`);
    if (res.status !== 200) {
      throw new Error(`openapi.json not served: HTTP ${res.status}`);
    }
    const contentType = res.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
    if (contentType !== 'application/json') {
      throw new Error(`openapi.json media type is ${contentType ?? '(missing)'}, expected application/json`);
    }

    const spec = (await res.json()) as Record<string, unknown>;
    const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: true });
    addFormats(ajv);
    // OpenAPI numeric formats are annotations outside JSON Schema's standard string formats.
    ajv.addFormat('int32', { type: 'number', validate: (value: number) => Number.isInteger(value) && value >= -2_147_483_648 && value <= 2_147_483_647 });
    ajv.addFormat('int64', { type: 'number', validate: (value: number) => Number.isSafeInteger(value) });
    ajv.addFormat('float', { type: 'number', validate: Number.isFinite });
    ajv.addFormat('double', { type: 'number', validate: Number.isFinite });
    // Register the whole document so operation-level schema pointers and component $refs resolve.
    ajv.addSchema(spec, 'openapi');
    return new SpecConformance(spec, ajv);
  }

  get openapiVersion(): string {
    return String(this.spec['openapi']);
  }

  /** Assert one client response against its approved observed and live-operation contract. */
  assertOperation(name: OperationName, response: ApiResponse): void {
    const contract = OPERATION_CONTRACTS[name];
    const errors: string[] = [];

    if (response.status !== contract.observedStatus) {
      errors.push(`status ${response.status}, expected observed ${contract.observedStatus}`);
    }

    if (response.contentType !== (contract.observedMediaType ?? undefined)) {
      errors.push(
        `media type ${response.contentType ?? '(missing)'}, expected ${contract.observedMediaType ?? '(none)'}`
      );
    }

    if (contract.body === 'openapi-document') {
      this.validateOpenApiBootstrap(response, errors);
    } else {
      const resolved = this.resolveResponse(name, contract, errors);
      if (contract.body === 'empty') {
        if (response.text !== '') {
          errors.push(`body is not empty: ${JSON.stringify(response.text)}`);
        }
        if (resolved && this.responseDeclaresSchema(resolved.response)) {
          errors.push(`live ${resolved.responseKey} response unexpectedly declares a body schema`);
        }
      } else if (resolved) {
        this.validateOperationBody(name, contract, response, resolved.responseKey, errors);
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `${name} (${contract.method} ${contract.path}) contract deviation:\n- ${errors.join('\n- ')}`
      );
    }
    this.exercised.add(name);
  }

  coverageSummary(): OperationCoverageSummary {
    const expected = [...OPERATION_NAMES];
    const exercised = expected.filter((name) => this.exercised.has(name));
    return {
      expected,
      exercised,
      missing: expected.filter((name) => !this.exercised.has(name)),
      excludedLiveOperations: this.excludedLiveOperations(),
      appliedDeviations: [...this.appliedDeviations].sort()
    };
  }

  formatCoverageSummary(): string {
    const summary = this.coverageSummary();
    return [
      `FR-B1 operation coverage: ${summary.exercised.length}/${summary.expected.length}`,
      `Exercised: ${summary.exercised.join(', ') || '(none)'}`,
      `Missing: ${summary.missing.join(', ') || '(none)'}`,
      `Intentionally excluded live operations (${summary.excludedLiveOperations.length}): ${summary.excludedLiveOperations.join(', ') || '(none)'}`,
      `Named deviations applied: ${summary.appliedDeviations.join(', ') || '(none)'}`
    ].join('\n');
  }

  private validateOpenApiBootstrap(response: ApiResponse, errors: string[]): void {
    if (!response.json || typeof response.json !== 'object' || Array.isArray(response.json)) {
      errors.push('body is not a JSON object');
      return;
    }
    const document = response.json as Record<string, unknown>;
    if (document['openapi'] !== '3.0.1') {
      errors.push(`OpenAPI version is ${String(document['openapi'])}, expected 3.0.1`);
    }
    if (!document['paths'] || typeof document['paths'] !== 'object' || Array.isArray(document['paths'])) {
      errors.push('document has no paths object');
    }
  }

  private resolveResponse(
    name: OperationName,
    contract: OperationContract,
    errors: string[]
  ): { responseKey: string; response: OpenApiResponse } | undefined {
    const operation = this.operation(contract);
    if (!operation) {
      errors.push('method/path is absent from the live specification');
      return undefined;
    }
    const responses = operation.responses;
    if (!responses) {
      errors.push('live operation has no responses object');
      return undefined;
    }
    const statusKey = String(contract.observedStatus);
    const responseKey = responses[statusKey] ? statusKey : responses['default'] ? 'default' : undefined;
    if (!responseKey) {
      errors.push(`live operation documents neither ${statusKey} nor default`);
      return undefined;
    }
    const response = responses[responseKey];
    if (!response) {
      errors.push(`live operation response ${responseKey} is empty`);
      return undefined;
    }

    if (contract.body === 'operation-schema') {
      const mediaType = contract.observedMediaType;
      if (!mediaType || !response.content?.[mediaType]) {
        errors.push(`live ${responseKey} response does not declare ${mediaType ?? '(no media type)'}`);
      } else if (response.content[mediaType].schema === undefined) {
        errors.push(`live ${responseKey} ${mediaType} response has no schema`);
      }
    }

    // `name` is included to make any future debugging breakpoint self-describing.
    void name;
    return { responseKey, response };
  }

  private validateOperationBody(
    name: OperationName,
    contract: OperationContract,
    response: ApiResponse,
    responseKey: string,
    errors: string[]
  ): void {
    const mediaType = contract.observedMediaType;
    if (!mediaType) {
      errors.push('operation-schema contract has no configured media type');
      return;
    }

    let data = response.json;
    if (data === undefined && contract.rawTextAsStringRisk && response.text !== '') {
      data = response.text;
      this.appliedDeviations.add(`${contract.rawTextAsStringRisk}:${name}:unquoted JSON string`);
    } else if (data === undefined) {
      errors.push('application/json body is not valid JSON');
      return;
    }

    const pointer = this.operationSchemaPointer(contract, responseKey, mediaType);
    const validator = this.schemaValidator(pointer);
    if (validator(data)) {
      return;
    }

    const remaining = this.unallowedErrors(name, contract, validator.errors ?? []);
    if (remaining.length > 0) {
      errors.push(this.ajv.errorsText(remaining, { dataVar: `${name} response` }));
    }
  }

  private unallowedErrors(
    name: OperationName,
    contract: OperationContract,
    validationErrors: ErrorObject[]
  ): ErrorObject[] {
    const allowances = contract.allowedValidationErrors ?? [];
    return validationErrors.filter((error) => {
      const text = `${error.instancePath} ${error.message}`;
      const allowance = allowances.find((candidate) => text.includes(candidate.includes));
      if (!allowance) {
        return true;
      }
      this.appliedDeviations.add(`${allowance.risk}:${name}:${allowance.includes}`);
      return false;
    });
  }

  private schemaValidator(pointer: string): ValidateFunction {
    const existing = this.ajv.getSchema(pointer);
    return existing ?? this.ajv.compile({ $ref: pointer });
  }

  private operation(contract: OperationContract): OpenApiOperation | undefined {
    const paths = this.spec['paths'] as Record<string, Partial<Record<HttpMethod, OpenApiOperation>>> | undefined;
    return paths?.[contract.path]?.[contract.method.toLowerCase() as HttpMethod];
  }

  private operationSchemaPointer(contract: OperationContract, responseKey: string, mediaType: string): string {
    return [
      'openapi#/paths',
      jsonPointerSegment(contract.path),
      contract.method.toLowerCase(),
      'responses',
      jsonPointerSegment(responseKey),
      'content',
      jsonPointerSegment(mediaType),
      'schema'
    ].join('/');
  }

  private responseDeclaresSchema(response: OpenApiResponse): boolean {
    return Object.values(response.content ?? {}).some((media) => media.schema !== undefined);
  }

  private excludedLiveOperations(): string[] {
    const included = new Set(
      Object.values(OPERATION_CONTRACTS)
        .filter((contract) => contract.body !== 'openapi-document')
        .map((contract) => `${contract.method} ${contract.path}`)
    );
    const paths = this.spec['paths'] as Record<string, Record<string, unknown>> | undefined;
    const methods = new Set<HttpMethod>(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);
    const excluded: string[] = [];
    for (const [path, pathItem] of Object.entries(paths ?? {})) {
      for (const method of Object.keys(pathItem)) {
        const normalised = method.toLowerCase() as HttpMethod;
        if (!methods.has(normalised)) continue;
        const label = `${normalised.toUpperCase()} ${path}`;
        if (!included.has(label)) excluded.push(label);
      }
    }
    return excluded.sort();
  }
}

function jsonPointerSegment(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}
