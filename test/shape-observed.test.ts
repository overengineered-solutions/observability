import { describe, expect, it } from 'vitest';

import { observeFirstCallShape } from '../src/shape-observed.js';
import { createMemorySink } from '../src/sinks/memory.js';

describe('observeFirstCallShape', () => {
  it('emits once per integration/endpoint tuple', () => {
    const { sink, emitted } = createMemorySink();

    observeFirstCallShape(
      { result: [1, 2], messages: [], success: true },
      {
        integration: 'cloudflare',
        endpoint: 'GET /zones?test=once',
        sink,
      },
    );

    observeFirstCallShape(
      { result: [1], messages: [1], success: true },
      {
        integration: 'cloudflare',
        endpoint: 'GET /zones?test=once',
        sink,
      },
    );

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual({
      kind: 'shape_observed',
      integration: 'cloudflare',
      endpoint: 'GET /zones?test=once',
      topLevelKeys: ['messages', 'result', 'success'],
      arrayLengths: {
        messages: 0,
        result: 2,
      },
    });
  });
});
