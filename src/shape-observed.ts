import type { EventSink, ShapeObservedEvent } from './types.js';

const observed = new Set<string>();

export type ObserveFirstCallShapeOptions = {
  integration: string;
  endpoint: string;
  payload: unknown;
  sink?: EventSink;
  /** Optional attribution — upstream client/connection identifier. */
  client?: string;
  /** Optional attribution — tenant the call is made on behalf of. */
  tenantId?: string;
};

/**
 * Emit one `shape_observed` event on the FIRST successful call to a given
 * (integration, endpoint) tuple in this process; subsequent calls no-op.
 * Used to surface the actual top-level keys + per-array lengths so a
 * Zod-mismatched payload can be debugged from a known-good baseline.
 *
 * Values are redacted by shape — we report keys and array sizes, never
 * scalar values. Safe to wire into prod request paths.
 */
export function observeFirstCallShape(opts: ObserveFirstCallShapeOptions): void {
  const tupleKey = `${opts.integration}::${opts.endpoint}`;
  if (observed.has(tupleKey)) return;
  observed.add(tupleKey);

  const { topLevelKeys, arrayLengths } = describeShape(opts.payload);
  const event: ShapeObservedEvent = {
    kind: 'shape_observed',
    integration: opts.integration,
    endpoint: opts.endpoint,
    topLevelKeys,
    arrayLengths,
    occurredAt: new Date().toISOString(),
    client: opts.client,
    tenantId: opts.tenantId,
  };
  try {
    opts.sink?.emit(event);
  } catch {
    // best-effort
  }
}

/** Reset the observed set — primarily for tests. */
export function resetObservedShapes(): void {
  observed.clear();
}

function describeShape(payload: unknown): {
  topLevelKeys: string[];
  arrayLengths: Record<string, number>;
} {
  if (payload === null || typeof payload !== 'object') {
    return { topLevelKeys: [], arrayLengths: {} };
  }
  const obj = payload as Record<string, unknown>;
  const topLevelKeys = Object.keys(obj).sort();
  const arrayLengths: Record<string, number> = {};
  for (const k of topLevelKeys) {
    const v = obj[k];
    if (Array.isArray(v)) arrayLengths[k] = v.length;
  }
  return { topLevelKeys, arrayLengths };
}
