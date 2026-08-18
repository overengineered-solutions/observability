import { describe, expect, it } from 'vitest';

import { logIteration } from '../src/iteration.js';
import { createMemorySink } from '../src/sinks/memory.js';

describe('logIteration', () => {
  it('emits on silent-zero (expected > 0 and processed === 0)', () => {
    const { sink, emitted } = createMemorySink();

    logIteration({
      integration: 'cloudflare',
      sink,
      processed: 0,
      expected: 12,
    });

    expect(emitted).toEqual([
      {
        kind: 'iteration_count',
        integration: 'cloudflare',
        processed: 0,
        expected: 12,
      },
    ]);
  });

  it('does not emit when processed is greater than zero', () => {
    const { sink, emitted } = createMemorySink();

    logIteration({
      integration: 'cloudflare',
      sink,
      processed: 3,
      expected: 12,
    });

    expect(emitted).toHaveLength(0);
  });
});
