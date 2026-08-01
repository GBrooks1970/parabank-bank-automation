/** One bounded policy for ParaBank REST, SOAP, and live-contract requests. */
export const REQUEST_TIMEOUT_MS = 10_000;

export interface RequestDeadlineContext {
  /** Human-readable operation name, such as `REST login` or `SOAP getAccount`. */
  operation: string;
  /** A route template or otherwise credential-free path for diagnostics. */
  safePath: string;
  /** Override used by focused tests; production callers use REQUEST_TIMEOUT_MS. */
  timeoutMs?: number;
}

export class RequestDeadlineError extends Error {
  constructor(
    public readonly method: string,
    public readonly operation: string,
    public readonly safePath: string,
    public readonly timeoutMs: number,
    options: ErrorOptions = {}
  ) {
    super(
      `Request deadline exceeded: ${operation} [${method} ${safePath}] after ${timeoutMs}ms`,
      options
    );
    this.name = 'RequestDeadlineError';
  }
}

/**
 * Execute one request with an abort-backed deadline and credential-safe diagnostics.
 * Existing caller cancellation is preserved and is never relabelled as a timeout.
 */
export async function withRequestDeadline<T>(
  init: RequestInit,
  context: RequestDeadlineContext,
  request: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const timeoutMs = context.timeoutMs ?? REQUEST_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError(`Request timeout must be a positive integer; received ${String(timeoutMs)}`);
  }

  const safePath = credentialSafePath(context.safePath);
  const timeoutError = new RequestDeadlineError(method, context.operation, safePath, timeoutMs);
  const controller = new AbortController();
  const callerSignal = init.signal;
  const forwardCallerAbort = (): void => controller.abort(callerSignal?.reason);

  if (callerSignal?.aborted) {
    forwardCallerAbort();
  } else {
    callerSignal?.addEventListener('abort', forwardCallerAbort, { once: true });
  }

  let deadlineExpired = false;
  const timer = controller.signal.aborted
    ? undefined
    : setTimeout(() => {
        deadlineExpired = true;
        controller.abort(timeoutError);
      }, timeoutMs);

  try {
    return await request(controller.signal);
  } catch (error) {
    if (deadlineExpired) {
      throw new RequestDeadlineError(method, context.operation, safePath, timeoutMs, { cause: error });
    }
    throw error;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    callerSignal?.removeEventListener('abort', forwardCallerAbort);
  }
}

/** Strip origins, query strings, fragments, and known credential-bearing login segments. */
export function credentialSafePath(pathOrUrl: string): string {
  try {
    const pathname = new URL(pathOrUrl, 'https://diagnostic.invalid').pathname;
    return pathname.replace(
      /(\/login\/)[^/]+\/[^/]+(?=\/|$)/i,
      '$1{username}/{password}'
    );
  } catch {
    return '/(invalid-path)';
  }
}
