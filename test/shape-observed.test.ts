import { beforeEach, describe, expect, it } from 'vitest';

import { observeFirstCallShape, resetObservedShapes } from '../src/index';
import { createMemorySink } from '../src/sinks/memory';

describe('observeFirstCallShape', () => {
  beforeEach(() => resetObservedShapes());

  it('emits once per (integration, endpoint) tuple', () => {
    const { sink, emitted } = createMemorySink();
    observeFirstCallShape({
      integration: 'gh',
      endpoint: '/repos',
      payload: { items: [1, 2, 3], total: 3 },
      sink,
    });
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      kind: 'shape_observed',
      topLevelKeys: ['items', 'total'],
      arrayLengths: { items: 3 },
    });

    observeFirstCallShape({
      integration: 'gh',
      endpoint: '/repos',
      payload: { items: [9], total: 1 },
      sink,
    });
    expect(emitted).toHaveLength(1); // no second emission
  });

  it('emits for distinct endpoints', () => {
    const { sink, emitted } = createMemorySink();
    observeFirstCallShape({ integration: 'gh', endpoint: '/a', payload: {}, sink });
    observeFirstCallShape({ integration: 'gh', endpoint: '/b', payload: {}, sink });
    expect(emitted).toHaveLength(2);
  });
});
