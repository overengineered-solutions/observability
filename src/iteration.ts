import type { EventSink, IterationCountEvent } from './types.js';

export type LogIterationOptions = {
  integration: string;
  processed: number;
  expected: number;
  sink?: EventSink;
  /** Optional attribution — upstream client/connection identifier. */
  client?: string;
  /** Optional attribution — tenant the call is made on behalf of. */
  tenantId?: string;
};

/**
 * Iteration-boundary count logger. Always emits an `iteration_count` event;
 * severity is `'warn'` on the silent-zero pattern (expected > 0, processed
 * === 0) and `'info'` otherwise. The silent-zero pattern is the highest-
 * priority failure mode this package guards against — see the doctrine
 * section "Observability doctrine — silent-zero is the failure mode".
 */
export function logIteration(opts: LogIterationOptions): void {
  const silentZero = opts.expected > 0 && opts.processed === 0;
  const event: IterationCountEvent = {
    kind: 'iteration_count',
    integration: opts.integration,
    processed: opts.processed,
    expected: opts.expected,
    severity: silentZero ? 'warn' : 'info',
    occurredAt: new Date().toISOString(),
    client: opts.client,
    tenantId: opts.tenantId,
  };
  try {
    opts.sink?.emit(event);
  } catch {
    // best-effort observability — never mask the iterating caller's flow.
  }
}
