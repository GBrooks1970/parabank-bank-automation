/**
 * DR-PB-13: the main lanes run ONLY against the local pinned SUT.
 *
 * Their hooks reset the datastore before scenarios (initializeDB), the FR-B1 contract matrix
 * exercises cleanDB, the @loan hooks change admin parameters, and smoke-safety seeds first.
 * Pointed at any other host (above all the shared public demo), they would wipe and
 * re-configure it for everyone. The style folders (test-style-NN/) may target a remote host
 * because their setup never resets one; these lanes may not.
 */

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** True only for an http(s) URL whose host is loopback (localhost, 127.0.0.1, ::1). */
export function isLoopbackUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  return LOOPBACK_HOSTNAMES.has(parsed.hostname.toLowerCase());
}

/** Throws before any request is made unless `url` is the local SUT. */
export function assertLocalSut(url: string, purpose: string): void {
  if (isLoopbackUrl(url)) return;
  throw new Error(
    `${purpose} refuses PARABANK_URL=${url}: it resets data (initializeDB), wipes it (cleanDB) and changes admin ` +
      'parameters, so it runs only against the local pinned SUT (localhost / 127.0.0.1 / ::1). ' +
      'To run against the live demo, use test-style-02 or test-style-03 (DR-PB-13).'
  );
}
