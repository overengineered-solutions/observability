import type { ZodType } from 'zod';

import type { ApiShapeMismatchEvent, EventSink } from './types.js';

interface ParseOptions {
  integration: string;
  endpoint: string;
  sink: EventSink;
}

function normalizeIssuePath(path: (string | number)[]): string {
  return path.length === 0 ? '(root)' : path.join('.');
}

export function parseExternal<T>(
  schema: ZodType<T>,
  raw: unknown,
  opts: ParseOptions,
): T {
  const parsed = schema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }

  const event: ApiShapeMismatchEvent = {
    kind: 'api_shape_mismatch',
    integration: opts.integration,
    endpoint: opts.endpoint,
    issues: parsed.error.issues.map((issue) => {
      const path = normalizeIssuePath(issue.path);
      return `${path}: ${issue.message}`;
    }),
  };

  void opts.sink.emit(event);

  throw new Error(
    `api shape mismatch for ${opts.integration} ${opts.endpoint}`,
  );
}

export async function parseJsonResponse<T>(
  res: Response,
  schema: ZodType<T>,
  opts: ParseOptions,
): Promise<T> {
  const raw = await res.json();
  return parseExternal(schema, raw, opts);
}
