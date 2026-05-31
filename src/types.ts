export type ApiShapeMismatchEvent = {
  kind: 'api_shape_mismatch';
  integration: string;
  endpoint: string;
  issues: Array<{ path: string[]; code: string; message: string }>;
  occurredAt: string;
};

export type IterationCountEvent = {
  kind: 'iteration_count';
  integration: string;
  processed: number;
  expected: number;
  severity: 'info' | 'warn';
  occurredAt: string;
};

export type ShapeObservedEvent = {
  kind: 'shape_observed';
  integration: string;
  endpoint: string;
  topLevelKeys: string[];
  arrayLengths: Record<string, number>;
  occurredAt: string;
};

export type ObservabilityEvent =
  | ApiShapeMismatchEvent
  | IterationCountEvent
  | ShapeObservedEvent;

export interface EventSink {
  emit(event: ObservabilityEvent): void | Promise<void>;
}
