import type { EventSink, IterationCountEvent } from './types.js';

interface LogIterationOptions {
  integration: string;
  sink: EventSink;
  processed: number;
  expected: number;
}

export function logIteration(opts: LogIterationOptions): void {
  if (opts.expected > 0 && opts.processed === 0) {
    const event: IterationCountEvent = {
      kind: 'iteration_count',
      integration: opts.integration,
      processed: opts.processed,
      expected: opts.expected,
    };

    void opts.sink.emit(event);
  }
}
