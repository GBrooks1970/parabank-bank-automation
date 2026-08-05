// ParaBank k6 performance-smoke lane (design: docs/perf-lane-design.md).
//
// A threshold-gated load SMOKE over ParaBank's REST surface — NOT a capacity or
// benchmark test. Read-mostly ramping scenario + one reset-bracketed write
// scenario (D1.2a / D1.4b). Self-contained handleSummary (no remote/CDN import).
import http from 'k6/http';
import { check, sleep } from 'k6';
import type { Options } from 'k6/options';

const BASE = __ENV.PARABANK_BASE_URL || 'http://localhost:8090/parabank/services/bank';
const USERNAME = __ENV.PARABANK_USER || 'john';
const PASSWORD = __ENV.PARABANK_PASS || 'demo';
const K6_IMAGE = __ENV.K6_IMAGE || 'grafana/k6';

export const options: Options = {
  scenarios: {
    // Read-mostly, ramping (D1.4b): ramp-up -> steady -> ramp-down.
    read_mostly: {
      executor: 'ramping-vus',
      exec: 'readMostly',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 8 },
        { duration: '30s', target: 8 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '5s',
      tags: { scenario: 'read_mostly' },
    },
    // One controlled write, small + constant, during the steady window.
    write_transfer: {
      executor: 'constant-vus',
      exec: 'writeTransfer',
      vus: 2,
      duration: '30s',
      startTime: '15s',
      tags: { scenario: 'write_transfer' },
    },
  },
  // Conservative, steady-state-aware; nightly non-blocking (D1.1a) absorbs noise.
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{scenario:read_mostly}': ['p(95)<1500'],
    'checks{scenario:read_mostly}': ['rate>0.99'],
    'checks{scenario:write_transfer}': ['rate>0.99'],
  },
};

interface SetupData {
  customerId: number;
  accountIds: number[];
}

/** Parse a k6 response body as JSON, returning undefined instead of throwing. */
function safeJson(res: { json: () => unknown }): any {
  try {
    return res.json();
  } catch {
    return undefined;
  }
}

/** Reset to a clean seed (isolation from the functional fixtures), then discover accounts. */
export function setup(): SetupData {
  const reset = http.post(`${BASE}/initializeDB`);
  check(reset, { 'initializeDB reset ok': (r) => r.status === 204 || r.status === 200 });

  const login = http.get(`${BASE}/login/${USERNAME}/${PASSWORD}`);
  check(login, { 'login 200': (r) => r.status === 200 });

  let customerId = 12212;
  const customer = safeJson(login);
  if (customer && typeof customer.id === 'number') customerId = customer.id;

  const accountsRes = http.get(`${BASE}/customers/${customerId}/accounts`);
  const accounts = safeJson(accountsRes);
  const accountIds = Array.isArray(accounts)
    ? accounts.map((a: { id?: number }) => a.id).filter((id): id is number => typeof id === 'number')
    : [];

  return { customerId, accountIds };
}

/** Read-mostly iteration: list accounts, then read one account's transactions. */
export function readMostly(data: SetupData): void {
  const accounts = http.get(`${BASE}/customers/${data.customerId}/accounts`);
  check(accounts, { 'accounts 200': (r) => r.status === 200 });

  const accountId = data.accountIds[0];
  if (accountId !== undefined) {
    const transactions = http.get(`${BASE}/accounts/${accountId}/transactions`);
    check(transactions, { 'transactions 200': (r) => r.status === 200 });
  }
  sleep(0.5);
}

/** One controlled write: transfer a unit between two seeded accounts. */
export function writeTransfer(data: SetupData): void {
  const from = data.accountIds[0];
  const to = data.accountIds[1];
  if (from === undefined || to === undefined) return;

  const res = http.post(`${BASE}/transfer?fromAccountId=${from}&toAccountId=${to}&amount=1`);
  check(res, { 'transfer 200': (r) => r.status === 200 });
  sleep(1);
}

/** Leave the SUT on a clean seed so nothing drifts the functional suite. */
export function teardown(): void {
  http.post(`${BASE}/initializeDB`);
}

// ── Self-contained summary (no remote jslib import) ──────────────────────────

interface SummaryMetric {
  type?: string;
  values?: Record<string, number>;
}
interface SummaryData {
  metrics?: Record<string, SummaryMetric>;
}

export function handleSummary(data: SummaryData): Record<string, string> {
  return {
    stdout: renderText(data),
    'perf-summary.json': JSON.stringify(data, null, 2),
    'perf-summary.html': renderHtml(data),
  };
}

function metricValue(data: SummaryData, name: string, key: string): number | undefined {
  return data.metrics?.[name]?.values?.[key];
}

function fmt(n: number | undefined, digits = 2): string {
  return typeof n === 'number' ? n.toFixed(digits) : '—';
}

function renderText(data: SummaryData): string {
  const p95 = metricValue(data, 'http_req_duration', 'p(95)');
  const failRate = metricValue(data, 'http_req_failed', 'rate');
  const reqs = metricValue(data, 'http_reqs', 'count');
  return [
    'ParaBank k6 performance smoke (NOT a capacity test)',
    `  http_reqs: ${fmt(reqs, 0)}`,
    `  http_req_duration p95: ${fmt(p95)} ms`,
    `  http_req_failed rate: ${fmt(failRate, 4)}`,
    '',
  ].join('\n');
}

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderHtml(data: SummaryData): string {
  const rows = [
    ['HTTP requests', fmt(metricValue(data, 'http_reqs', 'count'), 0)],
    ['Request duration p95 (ms)', fmt(metricValue(data, 'http_req_duration', 'p(95)'))],
    ['Request duration avg (ms)', fmt(metricValue(data, 'http_req_duration', 'avg'))],
    ['Request duration max (ms)', fmt(metricValue(data, 'http_req_duration', 'max'))],
    ['Failed-request rate', fmt(metricValue(data, 'http_req_failed', 'rate'), 4)],
    ['Checks pass rate', fmt(metricValue(data, 'checks', 'rate'), 4)],
    ['Peak VUs', fmt(metricValue(data, 'vus_max', 'max'), 0)],
    ['Iterations', fmt(metricValue(data, 'iterations', 'count'), 0)],
  ]
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${esc(v)}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ParaBank — performance smoke summary</title>
<style>
  :root { color-scheme: light; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0;
    padding: 1.5rem; background: #ffffff; color: #1c2430; line-height: 1.5; }
  .banner { max-width: 820px; margin: 0 auto 1.25rem; padding: .85rem 1.1rem; border: 1px solid #c9a227;
    border-left: 6px solid #c9a227; border-radius: 8px; background: #fff8e1; color: #4a3b0a;
    font-size: .92rem; }
  h1 { font-size: 1.4rem; margin: 0 auto .5rem; max-width: 820px; }
  table { max-width: 820px; margin: 0 auto; width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: .5rem .7rem; border-bottom: 1px solid #e3e8ee; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
  .meta { max-width: 820px; margin: 1rem auto 0; font-size: .85rem; color: #5a6672; }
</style>
</head>
<body>
<div class="banner" role="note">
  <strong>Performance <em>smoke</em>, not a capacity benchmark.</strong> A threshold-gated k6 load smoke
  against a locally-booted, deterministically-seeded ParaBank SUT on a shared GitHub-hosted runner.
  Absolute numbers are runner-dependent and must not be read as a capacity or SLA claim.
</div>
<h1>ParaBank — k6 performance smoke summary</h1>
<table>
<thead><tr><th>Metric</th><th class="num">Value</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<p class="meta">Generated by ${esc(K6_IMAGE)} · read-mostly (ramping) + one reset-bracketed write ·
thresholds: http_req_failed&lt;1%, read-mostly p95&lt;1500ms, checks&gt;99%.</p>
</body>
</html>
`;
}
