import { describe, expect, it } from 'vitest';

import { logIteration } from '../src/index';
import { createMemorySink } from '../src/sinks/memory';

describe('logIteration', () => {
  it('emits warn severity on silent-zero (expected>0, processed===0)', () => {
    const { sink, emitted } = createMemorySink();
    logIteration({ integration: 'cron', processed: 0, expected: 5, sink });
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      kind: 'iteration_count',
      severity: 'warn',
    });
  });

  it('emits info severity when processed > 0', () => {
    const { sink, emitted } = createMemorySink();
    logIteration({ integration: 'cron', processed: 3, expected: 5, sink });
    expect(emitted[0]).toMatchObject({
      kind: 'iteration_count',
      severity: 'info',
    });
  });

  it('emits info severity when expected === 0', () => {
    const { sink, emitted } = createMemorySink();
    logIteration({ integration: 'cron', processed: 0, expected: 0, sink });
    expect(emitted[0]).toMatchObject({ severity: 'info' });
  });
});
