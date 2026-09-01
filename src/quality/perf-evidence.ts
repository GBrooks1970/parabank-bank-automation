/**
 * Provenance and freshness of the published `/perf/` evidence (PB-PIN-04).
 *
 * The k6 summary is committed to `main` by the nightly perf lane and published on the next
 * functional deploy, so the page routinely outlives the run that produced it. Publishing
 * undated numbers as if they were current is the failure this guards: while the perf lane
 * was broken (PB-PIN-01), the site showed 2026-08-18 figures for two weeks with nothing on
 * the page to say when they were measured.
 *
 * Deliberately NOT a gate on the functional deploy. Stale or unprovenanced perf evidence is
 * withheld from publication and reported; it never fails `ci`. Coupling the required lane to
 * the health of a non-blocking lane is precisely the mistake DR-PB-11 removed.
 */

/** Nightly lane, so anything approaching a fortnight old is not "current". */
export const PERF_MAX_AGE_DAYS = 14;

/** Tolerance for runner/host clock skew before a future timestamp is treated as wrong. */
const FUTURE_SKEW_MINUTES = 10;

const SHA_PATTERN = /^[0-9a-f]{7,40}$/;

export interface PerfProvenance {
  /** ISO-8601 UTC instant at which the k6 run produced this summary. */
  generatedAt: string;
  /** Commit the perf lane ran from. */
  sourceRef: string;
  /** Workflow run that produced it, when generated in CI. */
  runUrl?: string;
  /** k6 image reference used, for the rendered footer. */
  k6Image?: string;
}

export type PerfEvidenceAssessment =
  | { publishable: true; provenance: PerfProvenance; ageDays: number }
  | { publishable: false; reason: string };

/**
 * Extract provenance from a k6 summary document. Returns undefined rather than throwing:
 * a summary without usable provenance is a publication decision, not a crash.
 */
export function readPerfProvenance(rawJson: string): PerfProvenance | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined;

  const candidate = (parsed as { provenance?: unknown }).provenance;
  if (typeof candidate !== 'object' || candidate === null) return undefined;

  const { generatedAt, sourceRef, runUrl, k6Image } = candidate as Record<string, unknown>;
  if (typeof generatedAt !== 'string' || typeof sourceRef !== 'string') return undefined;
  if (!SHA_PATTERN.test(sourceRef)) return undefined;
  if (Number.isNaN(Date.parse(generatedAt))) return undefined;

  return {
    generatedAt,
    sourceRef,
    ...(typeof runUrl === 'string' && runUrl.length > 0 ? { runUrl } : {}),
    ...(typeof k6Image === 'string' && k6Image.length > 0 ? { k6Image } : {})
  };
}

/**
 * Decide whether a committed perf summary may be published as current evidence.
 *
 * @param rawJson  contents of `perf/report/perf-summary.json`, or undefined when absent
 * @param now      evaluation instant (injected so the decision is deterministic in tests)
 */
export function assessPerfEvidence(
  rawJson: string | undefined,
  now: Date,
  maxAgeDays: number = PERF_MAX_AGE_DAYS
): PerfEvidenceAssessment {
  if (rawJson === undefined) {
    return { publishable: false, reason: 'no committed perf summary (perf/report/perf-summary.json is absent)' };
  }

  const provenance = readPerfProvenance(rawJson);
  if (!provenance) {
    return {
      publishable: false,
      reason:
        'perf summary carries no usable provenance (needs provenance.generatedAt as an ISO instant and provenance.sourceRef as a commit sha)'
    };
  }

  const generatedAtMs = Date.parse(provenance.generatedAt);
  const ageMs = now.getTime() - generatedAtMs;

  if (ageMs < -FUTURE_SKEW_MINUTES * 60_000) {
    return {
      publishable: false,
      reason: `perf summary is dated in the future (${provenance.generatedAt}); refusing to publish it as current`
    };
  }

  const ageDays = Math.max(0, ageMs) / 86_400_000;
  if (ageDays > maxAgeDays) {
    return {
      publishable: false,
      reason: `perf summary is ${ageDays.toFixed(1)} days old (limit ${maxAgeDays}), generated ${provenance.generatedAt} from ${provenance.sourceRef}; the perf lane is probably not running`
    };
  }

  return { publishable: true, provenance, ageDays };
}
