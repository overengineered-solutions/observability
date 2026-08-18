export interface ApiShapeMismatchEvent {
  kind: 'api_shape_mismatch';
  integration: string;
  endpoint: string;
  issues: string[];
}

export interface IterationCountEvent {
  kind: 'iteration_count';
  integration: string;
  processed: number;
  expected: number;
}

export interface ShapeObservedEvent {
  kind: 'shape_observed';
  integration: string;
  endpoint: string;
  topLevelKeys: string[];
  arrayLengths: Record<string, number>;
}

export type ObservabilityEvent =
  | ApiShapeMismatchEvent
  | IterationCountEvent
  | ShapeObservedEvent;

export interface EventSink {
  emit(event: ObservabilityEvent): Promise<void> | void;
}
