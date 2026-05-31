import type { ZodType } from 'zod';

import type { ApiShapeMismatchEvent, EventSink } from './types.js';

export type ParseExternalOptions = {
  integration: string;
  endpoint: string;
  sink?: EventSink;
};

/**
 * Validate a durable / external response payload against a Zod schema (R4.6 +
 * R4.8). On shape mismatch, emits a structured `api_shape_mismatch` event to
 * the sink (best-effort) and throws — never silently coerces a response of
 * the wrong shape.
 *
 * Observability is intentionally sink-routed, NOT recursive. The sink
 * receives the event; it must not call back into parseExternal for the
 * `api_shape_mismatch` event itself (loop guard).
 */
export function parseExternal<T>(
  schema: ZodType<T>,
  raw: unknown,
  opts: ParseExternalOptions,
): T {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  const event: ApiShapeMismatchEvent = {
    kind: 'api_shape_mismatch',
    integration: opts.integration,
    endpoint: opts.endpoint,
    issues: result.error.issues.map((i) => ({
      path: i.path.map(String),
      code: i.code,
      message: i.message,
    })),
    occurredAt: new Date().toISOString(),
  };
  try {
    opts.sink?.emit(event);
  } catch {
    // sink failures must not mask the original shape-mismatch throw.
  }
  throw new Error(
    `[${opts.integration}] ${opts.endpoint} shape mismatch (${event.issues.length} issue(s))`,
  );
}

/**
 * Same as parseExternal but reads a fetch Response JSON body first.
 */
export async function parseJsonResponse<T>(
  res: Response,
  schema: ZodType<T>,
  opts: ParseExternalOptions,
): Promise<T> {
  const raw: unknown = await res.json();
  return parseExternal(schema, raw, opts);
}
