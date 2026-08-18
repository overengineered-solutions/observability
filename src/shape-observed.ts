import type { EventSink, ShapeObservedEvent } from './types.js';

interface ObserveFirstCallShapeOptions {
  integration: string;
  endpoint: string;
  sink: EventSink;
}

const seenByTuple = new Set<string>();

function tupleKey(integration: string, endpoint: string): string {
  return `${integration}::${endpoint}`;
}

function extractTopLevelKeys(raw: unknown): string[] {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return Object.keys(raw).sort();
  }

  return [];
}

function extractArrayLengths(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const entries = Object.entries(raw)
    .filter(([, value]) => Array.isArray(value))
    .map(([key, value]) => [key, value.length] as const)
    .sort(([a], [b]) => a.localeCompare(b));

  return Object.fromEntries(entries);
}

export function observeFirstCallShape(
  raw: unknown,
  opts: ObserveFirstCallShapeOptions,
): void {
  const key = tupleKey(opts.integration, opts.endpoint);
  if (seenByTuple.has(key)) {
    return;
  }

  seenByTuple.add(key);

  const event: ShapeObservedEvent = {
    kind: 'shape_observed',
    integration: opts.integration,
    endpoint: opts.endpoint,
    topLevelKeys: extractTopLevelKeys(raw),
    arrayLengths: extractArrayLengths(raw),
  };

  void opts.sink.emit(event);
}
