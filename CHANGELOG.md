v0.3.0 — 2026-08-18 — `./shapes` subpath: Cloudflare + Resend response schemas. Additive.
  - (review pass, same day) README documents the `./shapes` subpath; per-schema tests added (24 total) with fixtures captured from the live Cloudflare v4 + Resend APIs; schemas verified as a deliberate minimal subset against real responses (`.passthrough()` tolerates the ~20 unlisted fields).
  - New `@overengineered-solutions/observability/shapes` entry point exporting `CloudflareZoneSchema`, `CloudflareDnsRecordSchema`, `CloudflareVerifyTokenSchema`, `ZonesListResponseSchema` and `EmailSendResponseSchema`, for use as the `schema` argument to `parseExternal` / `parseJsonResponse`.
  - Salvaged from a v0.1.0 working copy found untracked in the `ui` repo — a second, divergent master of this package. That copy has been deleted; this repo is the only one.
  - Its Vercel / Supabase-mgmt / GitHub shapes were deliberately NOT salvaged: the estate exited those vendors, and a schema for an API nobody calls is upkeep that reads as coverage.
  - Deliberately a SUBPATH, not a main-entry export: these are the only modules that import `zod` as a value. The package entry keeps `zod` a type-only peer, so `import '@overengineered-solutions/observability'` stays runtime-zod-free (verified against the built `dist`).

v0.2.0 — 2026-06-01 — `httpFetch` resilience + timing telemetry. All additive / backward-compatible.
  - `httpFetch`: retry transient statuses (default 408/429/500/502/503/504, overridable via `retryOnStatus`) with exponential backoff + jitter. Default `retries` stays `0`, so 0.1 callers retry nothing and behave identically.
  - `httpFetch`: merge a caller-supplied `init.signal` with the internal timeout signal via `AbortSignal.any()` so either source can abort the in-flight request (falls back to timeout-only where `AbortSignal.any` is unavailable).
  - `httpFetch`: emit one best-effort `api_timing` event (attempts, totalMs, status, retried, ok, error_kind) to `sink` when `integration` + `endpoint` + `sink` are present. Emission never masks the underlying request or throw.
  - New `ApiTimingEvent` added to the `ObservabilityEvent` union and exported from the entry point.
  - Optional `{ client, tenantId }` attribution context added to `httpFetch`, `parseExternal`, `logIteration`, and `observeFirstCallShape` options and threaded onto their emitted events.

v0.1.0 — 2026-05-31 — initial publish.
