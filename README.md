# @overengineered-solutions/observability

Observability-doctrine wrappers — Zod-parse, first-call shape, iteration counts. Prevents the silent-zero failure mode.

Encodes the doctrine from OES sibling repos' CLAUDE.md → "Observability doctrine — silent-zero is the failure mode" mechanically: every external API wrapper Zod-parses its responses, surfaces the response shape on first call, logs processed-vs-expected counts at iteration boundaries, and never silently coerces a payload of the wrong shape.

## Install

```sh
pnpm add @overengineered-solutions/observability zod
```

`zod >=3.22.0` is a required peer.

## Usage

```ts
import { z } from 'zod';
import {
  parseExternal,
  logIteration,
  observeFirstCallShape,
  type EventSink,
} from '@overengineered-solutions/observability';

const RepoSchema = z.object({ id: z.number(), name: z.string() });

// 1) Zod-parse every external response. On mismatch: emits api_shape_mismatch
//    to the sink and throws — never returns a silently-coerced response.
const repo = parseExternal(RepoSchema, await res.json(), {
  integration: 'github',
  endpoint: '/repos/{owner}/{repo}',
  sink,
});

// 2) First-call shape observability. Auto-suppresses after first call per
//    (integration, endpoint) tuple. Safe to wire into prod request paths.
observeFirstCallShape({
  integration: 'github',
  endpoint: '/repos/{owner}/{repo}',
  payload: await res.json(),
  sink,
});

// 3) Iteration-boundary counts. severity='warn' when expected>0 && processed===0
//    (the silent-zero pattern this package guards against).
logIteration({
  integration: 'github',
  processed: rows.length,
  expected: total,
  sink,
});
```

## EventSink

Provide your own sink (any object with `emit(event)`) to forward observability events into your audit log / Sentry / supabase outbox / etc. A tiny `createMemorySink()` factory is exported under `@overengineered-solutions/observability/sinks/memory` for tests.

## License

MIT
