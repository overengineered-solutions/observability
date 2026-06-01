import type { ApiTimingEvent, EventSink } from './types.js';

export type HttpFetchOptions = {
  /** Hard-cap on request duration. Default 10_000ms (10s). */
  timeoutMs?: number;
  /** Retry transient failures up to N times with backoff. Default 0. */
  retries?: number;
  /** Backoff per retry (ms). Default 500. */
  backoffMs?: number;
  /**
   * Status codes that trigger a retry (when `retries` > 0). Defaults cover
   * the standard transient set: 408 (request timeout), 429 (too many
   * requests), 500/502/503/504 (server-side transient). Has no effect when
   * `retries` is 0 (the default) — existing 0.1 callers retry nothing.
   */
  retryOnStatus?: number[];
  /**
   * Vendor name for `api_timing` event grouping. Optional — when omitted (or
   * when `endpoint`/`sink` are absent), no timing event is emitted.
   */
  integration?: string;
  /** Endpoint identifier matching the parseExternal convention. */
  endpoint?: string;
  /** Sink for the best-effort `api_timing` event. */
  sink?: EventSink;
  /** Optional attribution — upstream client/connection identifier. */
  client?: string;
  /** Optional attribution — tenant the call is made on behalf of. */
  tenantId?: string;
};

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 0;
const DEFAULT_BACKOFF_MS = 500;
const DEFAULT_RETRY_STATUS = [408, 429, 500, 502, 503, 504];

/**
 * Thin fetch wrapper with AbortController timeout and optional retry.
 *
 * By default (`retries: 0`) it makes a single attempt and returns the
 * response as-is — 0.1 callers passing only `{ integration, endpoint, sink }`
 * (or nothing) behave identically.
 *
 * When `retries` > 0, the configured `retryOnStatus` codes (default
 * 408/429/5xx) and retriable network errors (timeout AbortError + fetch
 * TypeError) are retried with exponential backoff (`backoffMs * 2^attempt`
 * plus jitter). Non-retriable 4xx are returned immediately — they don't
 * recover by retrying.
 *
 * If the caller passes `init.signal`, it is merged with the internal timeout
 * signal via `AbortSignal.any()` so either source can abort the in-flight
 * request (falling back to timeout-only where `AbortSignal.any` is missing).
 *
 * When `integration` + `endpoint` + `sink` are all present, one best-effort
 * `api_timing` event is emitted per call (attempts, totalMs, status, retried,
 * ok, error_kind). Emission never masks the underlying request or throw.
 */
export async function httpFetch(
  url: string,
  init?: RequestInit,
  opts?: HttpFetchOptions,
): Promise<Response> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts?.retries ?? DEFAULT_RETRIES;
  const baseBackoff = opts?.backoffMs ?? DEFAULT_BACKOFF_MS;
  const retryStatus = opts?.retryOnStatus ?? DEFAULT_RETRY_STATUS;
  const startedAt = Date.now();

  let attempt = 0;
  let lastStatus: number | undefined;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    const signal = mergeSignals(ac.signal, init?.signal);
    try {
      const res = await fetch(url, { ...init, signal });
      clearTimeout(timer);
      lastStatus = res.status;
      if (res.ok || !retryStatus.includes(res.status) || attempt >= maxRetries) {
        emitTiming(opts, {
          attempts: attempt + 1,
          totalMs: Date.now() - startedAt,
          status: res.status,
          retried: attempt > 0,
          ok: res.ok,
        });
        return res;
      }
      // Retriable status with retries remaining — fall through to backoff.
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (!isRetriableNetworkError(err) || attempt >= maxRetries) {
        emitTiming(opts, {
          attempts: attempt + 1,
          totalMs: Date.now() - startedAt,
          status: lastStatus,
          retried: attempt > 0,
          ok: false,
          error: err,
        });
        throw err;
      }
    }

    await sleep(backoffMs(baseBackoff, attempt));
    attempt += 1;
  }

  // Unreachable in practice — the loop returns or throws on the final
  // attempt — but keeps the function total for the type checker.
  emitTiming(opts, {
    attempts: attempt,
    totalMs: Date.now() - startedAt,
    status: lastStatus,
    retried: maxRetries > 0,
    ok: false,
    error: lastError,
  });
  throw lastError ?? new Error(`httpFetch: ${url} failed`);
}

/**
 * Merge the internal timeout signal with the caller's signal via
 * `AbortSignal.any()` so either can abort the request. Falls back to the
 * timeout signal alone where `AbortSignal.any` is unavailable.
 */
function mergeSignals(
  timeoutSignal: AbortSignal,
  callerSignal: AbortSignal | null | undefined,
): AbortSignal {
  if (!callerSignal) return timeoutSignal;
  const anyFn = (
    AbortSignal as unknown as {
      any?: (signals: AbortSignal[]) => AbortSignal;
    }
  ).any;
  if (typeof anyFn === 'function') {
    return anyFn([timeoutSignal, callerSignal]);
  }
  return timeoutSignal;
}

function isRetriableNetworkError(err: unknown): boolean {
  // The timeout AbortController surfaces as an AbortError DOMException.
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof Error && err.name === 'AbortError') return true;
  // fetch network failures surface as TypeError.
  if (err instanceof TypeError) return true;
  return false;
}

function backoffMs(base: number, attempt: number): number {
  const delay = base * 2 ** attempt;
  const jitter = Math.floor(Math.random() * base);
  return delay + jitter;
}

function emitTiming(
  opts: HttpFetchOptions | undefined,
  args: {
    attempts: number;
    totalMs: number;
    status?: number;
    retried: boolean;
    ok: boolean;
    error?: unknown;
  },
): void {
  if (!opts?.integration || !opts.endpoint || !opts.sink) return;
  const event: ApiTimingEvent = {
    kind: 'api_timing',
    integration: opts.integration,
    endpoint: opts.endpoint,
    attempts: args.attempts,
    totalMs: args.totalMs,
    status: args.status,
    retried: args.retried,
    ok: args.ok,
    error_kind: args.error
      ? args.error instanceof Error
        ? args.error.name
        : 'unknown'
      : undefined,
    occurredAt: new Date().toISOString(),
    client: opts.client,
    tenantId: opts.tenantId,
  };
  try {
    opts.sink.emit(event);
  } catch {
    // best-effort observability — never mask the request or its throw.
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
