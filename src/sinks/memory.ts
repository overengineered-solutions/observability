import type { EventSink, ObservabilityEvent } from '../types.js';

export function createMemorySink(): {
  sink: EventSink;
  emitted: ObservabilityEvent[];
} {
  const emitted: ObservabilityEvent[] = [];

  const sink: EventSink = {
    emit(event): void {
      emitted.push(event);
    },
  };

  return { sink, emitted };
}
