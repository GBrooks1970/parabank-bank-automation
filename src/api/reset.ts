/**
 * DR-PB-06 boot→seed→use: the single reset/seed helper both lanes share.
 * Polls POST initializeDB until 204 — doubling as the readiness wait (the same
 * pattern scripts/gate.ps1 proved). No fixed sleeps between attempts beyond the
 * poll interval; total time is bounded by timeoutMs.
 */
export async function seedDatabase(baseUrl: string, timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const url = `${baseUrl}/parabank/services/bank/initializeDB`;
  let lastError = 'no attempt made';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(5_000) });
      if (res.status === 204) {
        return;
      }
      lastError = `initializeDB returned ${res.status}`;
    } catch (err) {
      lastError = String(err);
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(
    `SUT not seedable within ${timeoutMs}ms (${lastError}). Is ParaBank up? Try: docker compose up -d && pwsh ./scripts/gate.ps1`
  );
}
