import { afterEach, describe, expect, it, vi } from 'vitest';

import { httpFetch } from '../src/index';
import { createMemorySink } from '../src/sinks/memory';
import type { ApiTimingEvent } from '../src/index';

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

/** Build a minimal Response-like object with the fields httpFetch reads. */
function makeRes(status: number): Response {
  return new Response(status === 204 ? null : 'body', { status });
}

describe('httpFetch — retry on transient status', () => {
  it('retries 429 with backoff and makes N total attempts, then returns the ok response', async () => {
    const statuses = [429, 429, 200];
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      const status = statuses[calls] ?? 200;
      calls += 1;
      return makeRes(status);
    }) as typeof fetch;

    const res = await httpFetch(
      'https://example.test/x',
      {},
      { retries: 2, backoffMs: 1 },
    );

    expect(calls).toBe(3); // initial + 2 retries
    expect(res.status).toBe(200);
  });

  it('retries 408 then succeeds', async () => {
    const statuses = [408, 200];
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      const status = statuses[calls] ?? 200;
      calls += 1;
      return makeRes(status);
    }) as typeof fetch;

    const res = await httpFetch(
      'https://example.test/x',
      {},
      { retries: 3, backoffMs: 1 },
    );

    expect(calls).toBe(2);
    expect(res.status).toBe(200);
  });

  it('stops at the retry ceiling and returns the last transient response', async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      calls += 1;
      return makeRes(503);
    }) as typeof fetch;

    const res = await httpFetch(
      'https://example.test/x',
      {},
      { retries: 2, backoffMs: 1 },
    );

    expect(calls).toBe(3); // initial + 2 retries, all 503
    expect(res.status).toBe(503);
  });

  it('does NOT retry a non-transient 4xx (404)', async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      calls += 1;
      return makeRes(404);
    }) as typeof fetch;

    const res = await httpFetch(
      'https://example.test/x',
      {},
      { retries: 3, backoffMs: 1 },
    );

    expect(calls).toBe(1);
    expect(res.status).toBe(404);
  });

  it('honors retries: 0 by default — 0.1 backward-compat (single attempt on 503)', async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      calls += 1;
      return makeRes(503);
    }) as typeof fetch;

    const res = await httpFetch('https://example.test/x');

    expect(calls).toBe(1);
    expect(res.status).toBe(503);
  });
});

describe('httpFetch — AbortSignal.any() merging', () => {
  it('aborts the in-flight request when the caller signal fires', async () => {
    // Skip if the runtime lacks AbortSignal.any (the merge falls back to
    // timeout-only and this contract cannot hold).
    const hasAny =
      typeof (AbortSignal as { any?: unknown }).any === 'function';
    if (!hasAny) return;

    globalThis.fetch = vi.fn((_url, init?: RequestInit) => {
      const signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
        // Never resolves on its own — only the caller's abort ends it.
      });
    }) as typeof fetch;

    const controller = new AbortController();
    const p = httpFetch(
      'https://example.test/slow',
      { signal: controller.signal },
      { timeoutMs: 10_000, retries: 0 },
    );

    // Abort from the caller side mid-flight.
    controller.abort();

    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('still works when no caller signal is supplied', async () => {
    globalThis.fetch = vi.fn(async (_url, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return makeRes(200);
    }) as typeof fetch;

    const res = await httpFetch('https://example.test/x');
    expect(res.status).toBe(200);
  });
});

describe('httpFetch — ApiTimingEvent emission', () => {
  it('emits one api_timing event with attempts/totalMs/context when integration+endpoint+sink present', async () => {
    const statuses = [500, 200];
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      const status = statuses[calls] ?? 200;
      calls += 1;
      return makeRes(status);
    }) as typeof fetch;

    const { sink, emitted } = createMemorySink();
    const res = await httpFetch(
      'https://example.test/x',
      {},
      {
        retries: 2,
        backoffMs: 1,
        integration: 'vercel',
        endpoint: 'GET /v9/projects',
        sink,
        tenantId: 'oes-self',
        client: 'conn-123',
      },
    );

    expect(res.status).toBe(200);
    expect(emitted).toHaveLength(1);
    const ev = emitted[0] as ApiTimingEvent;
    expect(ev.kind).toBe('api_timing');
    expect(ev.integration).toBe('vercel');
    expect(ev.endpoint).toBe('GET /v9/projects');
    expect(ev.attempts).toBe(2); // 500 then 200
    expect(ev.retried).toBe(true);
    expect(ev.ok).toBe(true);
    expect(ev.status).toBe(200);
    expect(typeof ev.totalMs).toBe('number');
    expect(ev.totalMs).toBeGreaterThanOrEqual(0);
    expect(ev.tenantId).toBe('oes-self');
    expect(ev.client).toBe('conn-123');
  });

  it('emits an api_timing event with ok=false + error_kind when the request throws', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('network down');
    }) as typeof fetch;

    const { sink, emitted } = createMemorySink();
    await expect(
      httpFetch(
        'https://example.test/x',
        {},
        {
          retries: 1,
          backoffMs: 1,
          integration: 'github',
          endpoint: 'GET /repos',
          sink,
        },
      ),
    ).rejects.toThrow(/network down/);

    expect(emitted).toHaveLength(1);
    const ev = emitted[0] as ApiTimingEvent;
    expect(ev.ok).toBe(false);
    expect(ev.attempts).toBe(2); // initial + 1 retry, both throw
    expect(ev.error_kind).toBe('TypeError');
    expect(ev.retried).toBe(true);
  });

  it('does NOT emit when integration/endpoint/sink are absent (legacy callers)', async () => {
    globalThis.fetch = vi.fn(async () => makeRes(200)) as typeof fetch;

    const { sink, emitted } = createMemorySink();
    // No integration/endpoint → no emission even with a sink present.
    await httpFetch('https://example.test/x', {}, { sink });
    expect(emitted).toHaveLength(0);
  });
});
