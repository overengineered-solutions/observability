import type { EventSink, ObservabilityEvent } from '../types.js';

export type MemorySink = {
  sink: EventSink;
  emitted: ObservabilityEvent[];
  clear(): void;
};

/** Test-only sink that captures emitted events into an in-memory array. */
export function createMemorySink(): MemorySink {
  const emitted: ObservabilityEvent[] = [];
  return {
    sink: {
      emit(event: ObservabilityEvent): void {
        emitted.push(event);
      },
    },
    emitted,
    clear(): void {
      emitted.length = 0;
    },
  };
}
