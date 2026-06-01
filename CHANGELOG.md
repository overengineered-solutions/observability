v0.2.0 — 2026-06-01 — `httpFetch` resilience + timing telemetry. All additive / backward-compatible.
  - `httpFetch`: retry transient statuses (default 408/429/500/502/503/504, overridable via `retryOnStatus`) with exponential backoff + jitter. Default `retries` stays `0`, so 0.1 callers retry nothing and behave identically.
  - `httpFetch`: merge a caller-supplied `init.signal` with the internal timeout signal via `AbortSignal.any()` so either source can abort the in-flight request (falls back to timeout-only where `AbortSignal.any` is unavailable).
  - `httpFetch`: emit one best-effort `api_timing` event (attempts, totalMs, status, retried, ok, error_kind) to `sink` when `integration` + `endpoint` + `sink` are present. Emission never masks the underlying request or throw.
  - New `ApiTimingEvent` added to the `ObservabilityEvent` union and exported from the entry point.
  - Optional `{ client, tenantId }` attribution context added to `httpFetch`, `parseExternal`, `logIteration`, and `observeFirstCallShape` options and threaded onto their emitted events.

v0.1.0 — 2026-05-31 — initial publish.
