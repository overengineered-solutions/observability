import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { parseExternal } from '../src/index';
import { createMemorySink } from '../src/sinks/memory';

describe('parseExternal', () => {
  const SCHEMA = z.object({ id: z.string(), count: z.number() });

  it('returns parsed data on valid input', () => {
    const { sink, emitted } = createMemorySink();
    const result = parseExternal(SCHEMA, { id: 'a', count: 1 }, {
      integration: 'test',
      endpoint: '/x',
      sink,
    });
    expect(result.id).toBe('a');
    expect(result.count).toBe(1);
    expect(emitted).toHaveLength(0);
  });

  it('throws + emits api_shape_mismatch on invalid input', () => {
    const { sink, emitted } = createMemorySink();
    expect(() =>
      parseExternal(SCHEMA, { id: 'a' /* missing count */ }, {
        integration: 'test',
        endpoint: '/x',
        sink,
      }),
    ).toThrow(/shape mismatch/);
    expect(emitted).toHaveLength(1);
    expect(emitted[0].kind).toBe('api_shape_mismatch');
  });
});
