# @overengineered-solutions/observability

Observability-doctrine wrappers — Zod-parse, first-call shape, iteration counts. Prevents the silent-zero failure mode.

Encodes the doctrine from OES sibling repos' CLAUDE.md → "Observability doctrine — silent-zero is the failure mode" mechanically: every external API wrapper Zod-parses its responses, surfaces the response shape on first call, logs processed-vs-expected counts at iteration boundaries, and never silently coerces a payload of the wrong shape.

## Install

```sh
pnpm add @overengineered-solutions/observability zod
```

`zod >=3.22.0` is a required peer.

## Usage

```ts
import { z } from 'zod';
import {
  parseExternal,
  logIteration,
  observeFirstCallShape,
  type EventSink,
} from '@overengineered-solutions/observability';

const RepoSchema = z.object({ id: z.number(), name: z.string() });

// 1) Zod-parse every external response. On mismatch: emits api_shape_mismatch
//    to the sink and throws — never returns a silently-coerced response.
const repo = parseExternal(RepoSchema, await res.json(), {
  integration: 'github',
  endpoint: '/repos/{owner}/{repo}',
  sink,
});

// 2) First-call shape observability. Auto-suppresses after first call per
//    (integration, endpoint) tuple. Safe to wire into prod request paths.
observeFirstCallShape({
  integration: 'github',
  endpoint: '/repos/{owner}/{repo}',
  payload: await res.json(),
  sink,
});

// 3) Iteration-boundary counts. severity='warn' when expected>0 && processed===0
//    (the silent-zero pattern this package guards against).
logIteration({
  integration: 'github',
  processed: rows.length,
  expected: total,
  sink,
});
```

## httpFetch — resilient external fetch + timing telemetry

`httpFetch(url, init?, opts?)` is a thin `fetch` wrapper with an
`AbortController` timeout and optional retry. It returns the `Response`
unchanged, so it is a drop-in for `fetch` at the callsite.

```ts
import { httpFetch, type ApiTimingEvent } from '@overengineered-solutions/observability';

const res = await httpFetch(
  'https://api.vendor.com/v1/things',
  { method: 'POST', body, signal: callerSignal },
  {
    timeoutMs: 15_000,
    retries: 2,                 // default 0 — see backward-compat note below
    backoffMs: 500,             // base for exponential backoff
    integration: 'vendor',      // enables the api_timing event…
    endpoint: 'POST /v1/things',
    sink,                       // …when integration + endpoint + sink all present
    tenantId: 'oes-self',       // optional attribution
    client: 'conn-123',         // optional attribution
  },
);
```

Behavior (all additive over 0.1):

- **Retries.** When `retries > 0`, transient statuses are retried with
  exponential backoff (`backoffMs * 2^attempt` + jitter). The retriable set
  defaults to `[408, 429, 500, 502, 503, 504]` and is overridable via
  `retryOnStatus`. Retriable network errors (the timeout `AbortError` and a
  fetch `TypeError`) are retried too. Non-transient 4xx are returned
  immediately — they don't recover by retrying. After the retry ceiling the
  last response is returned (or the last error thrown).
- **Backward-compatible default.** `retries` defaults to `0`, so existing 0.1
  callers passing only `{ integration, endpoint, sink }` (or nothing) make a
  single attempt and behave identically. `retryOnStatus` has no effect when
  `retries` is `0`.
- **AbortSignal merging.** A caller-supplied `init.signal` is merged with the
  internal timeout signal via `AbortSignal.any()`, so either source can abort
  the in-flight request. Where `AbortSignal.any` is unavailable, it falls back
  to the timeout signal alone.
- **`api_timing` telemetry.** When `integration` + `endpoint` + `sink` are all
  present, exactly one best-effort `ApiTimingEvent` is emitted per call
  (`attempts`, `totalMs`, `status`, `retried`, `ok`, `error_kind`, plus
  `client` / `tenantId`). Emission is wrapped — a throwing sink never masks the
  request result or its error.

## Attribution context

`httpFetch`, `parseExternal`, `logIteration`, and `observeFirstCallShape` all
accept optional `client?` and `tenantId?` fields. When set, they are threaded
onto the emitted event so downstream sinks can attribute observability events
to a tenant / upstream connection. Omitting them is fully backward-compatible.

## EventSink

Provide your own sink (any object with `emit(event)`) to forward observability events into your audit log / Sentry / supabase outbox / etc. The sink receives any `ObservabilityEvent` — `api_shape_mismatch`, `iteration_count`, `shape_observed`, or `api_timing`. A tiny `createMemorySink()` factory is exported under `@overengineered-solutions/observability/sinks/memory` for tests.

## Response shapes — `/shapes`

Ready-made Zod schemas for the external APIs this estate still calls, exported from a subpath so `zod` stays
out of the main entry's runtime graph (the entry treats it as a type-only peer). Feed them to `parseExternal`
/ `parseJsonResponse`:

```ts
import { parseJsonResponse } from '@overengineered-solutions/observability';
import { EmailSendResponseSchema, ZonesListResponseSchema } from '@overengineered-solutions/observability/shapes';

const { id } = await parseJsonResponse(res, EmailSendResponseSchema, { integration: 'resend', endpoint: '/emails' });
```

Exported: `EmailSendResponseSchema` (Resend `POST /emails`); `CloudflareZoneSchema`, `CloudflareDnsRecordSchema`,
`CloudflareVerifyTokenSchema`, `ZonesListResponseSchema` (Cloudflare API v4). Vercel / Supabase-mgmt / GitHub
shapes were intentionally not carried over — the estate exited those vendors.

## License

MIT
