import assert from 'node:assert/strict';
import test from 'node:test';
import { SpecConformance } from '../../src/api/spec-conformance';
import { ApiResponse } from '../../src/api/types';

test('operation selection validates the declared status, media type, and response schema', () => {
  const spec = SpecConformance.fromDocument(
    documentWith({
      '/login/{username}/{password}': operation('get', '200', {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
      })
    })
  );

  spec.assertOperation('login', jsonResponse({ id: 12212 }));
  assert.deepEqual(spec.coverageSummary().exercised, ['login']);
  assert.throws(
    () => spec.assertOperation('login', { ...jsonResponse({ id: 12212 }), contentType: 'text/plain' }),
    /media type text\/plain, expected application\/json/
  );
});

test('default-response resolution applies only the named PBR-01 validation allowance', () => {
  const spec = SpecConformance.fromDocument(
    documentWith({
      '/accounts/{accountId}/transactions': operation('get', 'default', {
        type: 'array',
        items: {
          type: 'object',
          required: ['date'],
          properties: { date: { type: 'string', format: 'date-time' } }
        }
      })
    })
  );

  spec.assertOperation('transactions', jsonResponse([{ date: 1_785_496_721_130 }]));
  assert.deepEqual(spec.coverageSummary().appliedDeviations, [
    'PBR-01:transactions:/date must be string'
  ]);
});

test('PBR-04 raw-text handling is selected only for an approved mutation operation', () => {
  const transfer = SpecConformance.fromDocument(
    documentWith({ '/transfer': operation('post', '200', { type: 'string' }) })
  );
  transfer.assertOperation('transfer', {
    status: 200,
    contentType: 'application/json',
    text: 'Successfully transferred $1'
  });
  assert.deepEqual(transfer.coverageSummary().appliedDeviations, [
    'PBR-04:transfer:unquoted JSON string'
  ]);

  const login = SpecConformance.fromDocument(
    documentWith({
      '/login/{username}/{password}': operation('get', '200', { type: 'string' })
    })
  );
  assert.throws(() => login.assertOperation('login', jsonResponse(123)), /must be string/);
});

function documentWith(paths: Record<string, unknown>): Record<string, unknown> {
  return { openapi: '3.0.1', paths };
}

function operation(
  method: 'get' | 'post',
  responseKey: '200' | 'default',
  schema: Record<string, unknown>
): Record<string, unknown> {
  return {
    [method]: {
      responses: {
        [responseKey]: { content: { 'application/json': { schema } } }
      }
    }
  };
}

function jsonResponse(json: unknown): ApiResponse {
  return {
    status: 200,
    contentType: 'application/json',
    text: JSON.stringify(json),
    json
  };
}
