interface HttpFetchOptions {
  timeoutMs?: number;
  retries?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const RETRY_BASE_DELAY_MS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function withTimeoutSignal(
  timeoutMs: number,
  upstream?: AbortSignal | null,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new Error(`httpFetch timeout after ${timeoutMs}ms`));
  }, timeoutMs);

  const onUpstreamAbort = () => {
    controller.abort(upstream?.reason);
  };

  if (upstream) {
    if (upstream.aborted) {
      controller.abort(upstream.reason);
    } else {
      upstream.addEventListener('abort', onUpstreamAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
      upstream?.removeEventListener('abort', onUpstreamAbort);
    },
  };
}

export async function httpFetch(
  url: string | URL | Request,
  init?: RequestInit,
  opts?: HttpFetchOptions,
): Promise<Response> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = Math.max(0, opts?.retries ?? 0);

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const { signal, cleanup } = withTimeoutSignal(timeoutMs, init?.signal);

    try {
      return await fetch(url, {
        ...init,
        signal,
      });
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep((attempt + 1) * RETRY_BASE_DELAY_MS);
      }
    } finally {
      cleanup();
    }
  }

  throw lastError;
}
