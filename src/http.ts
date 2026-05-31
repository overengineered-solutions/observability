export type HttpFetchOptions = {
  /** Hard-cap on request duration. Default 10_000ms (10s). */
  timeoutMs?: number;
  /** Retry transient failures up to N times with linear backoff. Default 0. */
  retries?: number;
  /** Backoff per retry (ms). Default 500. */
  backoffMs?: number;
};

/**
 * Thin fetch wrapper with AbortController timeout and optional linear retry.
 * 5xx + network errors are retried; 4xx are NOT (caller-side errors don't
 * recover by retrying).
 */
export async function httpFetch(
  url: string,
  init?: RequestInit,
  opts?: HttpFetchOptions,
): Promise<Response> {
  const timeoutMs = opts?.timeoutMs ?? 10_000;
  const retries = opts?.retries ?? 0;
  const backoffMs = opts?.backoffMs ?? 500;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: ac.signal });
      clearTimeout(timer);
      if (res.status >= 500 && attempt < retries) {
        await sleep(backoffMs * (attempt + 1));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt >= retries) break;
      await sleep(backoffMs * (attempt + 1));
    }
  }
  throw lastErr ?? new Error(`httpFetch: ${url} failed`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
