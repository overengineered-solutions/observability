# @overengineered-solutions/observability

Observability doctrine wrappers for external API calls. This package standardizes three guardrails:

- Parse every external response through Zod and emit a shape-mismatch event before throwing.
- Observe first-call payload shape per integration/endpoint tuple.
- Emit iteration-count events so silent-zero behavior (expected > 0, processed = 0) is visible.

## Install

```bash
pnpm add @overengineered-solutions/observability zod
```

## Zod Parse Pattern

```ts
import { z } from 'zod';
import { parseExternal } from '@overengineered-solutions/observability';

const RepoSchema = z.object({ id: z.number(), name: z.string() });
const raw = await fetch('https://api.github.com/repos/owner/repo').then((r) => r.json());

const repo = parseExternal(RepoSchema, raw, {
  integration: 'github',
  endpoint: 'GET /repos/{owner}/{repo}',
  sink,
});
```

When parse fails, `parseExternal` emits an `api_shape_mismatch` event and throws.

## Wire A Sink

```ts
import type { EventSink } from '@overengineered-solutions/observability';

const sink: EventSink = {
  emit(event) {
    console.log(JSON.stringify(event));
  },
};
```

Use `createMemorySink()` from `@overengineered-solutions/observability/sinks/memory` for tests.
