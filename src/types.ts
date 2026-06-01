export type ApiShapeMismatchEvent = {
  kind: 'api_shape_mismatch';
  integration: string;
  endpoint: string;
  issues: Array<{ path: string[]; code: string; message: string }>;
  occurredAt: string;
  /** Optional attribution — the upstream client/connection identifier. */
  client?: string;
  /** Optional attribution — the tenant the call was made on behalf of. */
  tenantId?: string;
};

export type IterationCountEvent = {
  kind: 'iteration_count';
  integration: string;
  processed: number;
  expected: number;
  severity: 'info' | 'warn';
  occurredAt: string;
  /** Optional attribution — the upstream client/connection identifier. */
  client?: string;
  /** Optional attribution — the tenant the call was made on behalf of. */
  tenantId?: string;
};

export type ShapeObservedEvent = {
  kind: 'shape_observed';
  integration: string;
  endpoint: string;
  topLevelKeys: string[];
  arrayLengths: Record<string, number>;
  occurredAt: string;
  /** Optional attribution — the upstream client/connection identifier. */
  client?: string;
  /** Optional attribution — the tenant the call was made on behalf of. */
  tenantId?: string;
};

/**
 * Per-call timing telemetry for an external `httpFetch`. Emitted once per
 * call (success or final failure) when `integration` + `endpoint` + `sink`
 * are present. Carries attempt/latency data plus the transient-retry verdict
 * so repeated failures on the same (integration, endpoint) are observable.
 */
export type ApiTimingEvent = {
  kind: 'api_timing';
  integration: string;
  endpoint: string;
  /** Total attempts made, including the initial one (>= 1). */
  attempts: number;
  /** Wall-clock duration across all attempts, in milliseconds. */
  totalMs: number;
  /** HTTP status of the final attempt, if a response was received. */
  status?: number;
  /** True when more than one attempt was made. */
  retried: boolean;
  /** True when the final attempt produced an ok (2xx) response. */
  ok: boolean;
  /** Error constructor name when the call ended in a thrown error. */
  error_kind?: string;
  occurredAt: string;
  /** Optional attribution — the upstream client/connection identifier. */
  client?: string;
  /** Optional attribution — the tenant the call was made on behalf of. */
  tenantId?: string;
};

export type ObservabilityEvent =
  | ApiShapeMismatchEvent
  | IterationCountEvent
  | ShapeObservedEvent
  | ApiTimingEvent;

export interface EventSink {
  emit(event: ObservabilityEvent): void | Promise<void>;
}
