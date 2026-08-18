import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { parseExternal } from '../src/parse.js';
import { createMemorySink } from '../src/sinks/memory.js';

describe('parseExternal', () => {
  it('returns parsed data on valid input', () => {
    const schema = z.object({ id: z.string() });
    const { sink, emitted } = createMemorySink();

    const parsed = parseExternal(schema, { id: 'abc' }, {
      integration: 'github',
      endpoint: 'GET /repos/{owner}/{repo}',
      sink,
    });

    expect(parsed).toEqual({ id: 'abc' });
    expect(emitted).toHaveLength(0);
  });

  it('throws and emits shape mismatch event on invalid input', () => {
    const schema = z.object({ id: z.string() });
    const { sink, emitted } = createMemorySink();

    expect(() => {
      parseExternal(schema, { id: 123 }, {
        integration: 'github',
        endpoint: 'GET /repos/{owner}/{repo}',
        sink,
      });
    }).toThrow(/api shape mismatch/i);

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      kind: 'api_shape_mismatch',
      integration: 'github',
      endpoint: 'GET /repos/{owner}/{repo}',
    });

    const event = emitted[0];
    if (event.kind === 'api_shape_mismatch') {
      expect(event.issues.length).toBeGreaterThan(0);
    }
  });
});
