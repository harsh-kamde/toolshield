# toolshield    

[![npm version](https://img.shields.io/npm/v/toolshield.svg)](https://www.npmjs.com/package/toolshield)
[![CI](https://github.com/harsh-kamde/toolshield/actions/workflows/ci.yml/badge.svg)](https://github.com/harsh-kamde/toolshield/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A reliability layer for AI agent tool calls. Wraps any tool function with
validation, timeouts, retries with backoff, a circuit breaker, and
fallbacks — provider-agnostic, works with OpenAI, Anthropic, the Vercel AI
SDK, LangChain, or a hand-rolled agent loop.

## Why

Tool calls fail in every agent that ships to production: the upstream API
times out, the model hands back malformed arguments, a dependency goes down
for ten minutes. Most teams hand-roll retry loops per tool. `toolshield`
gives you one wrapper that handles all of it consistently.

```ts
import { wrapTool } from "toolshield";
import { z } from "zod";

const getWeather = wrapTool(getWeatherImpl, {
  name: "getWeather",
  schema: z.object({ city: z.string() }),
  timeoutMs: 5000,
  retry: { attempts: 3, backoff: "exponential" },
  circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 30_000 },
  fallback: async (args) => ({ city: args.city, tempC: null }),
});

const result = await getWeather({ city: "Indore" });
```

## Install

```bash
npm install toolshield
# zod is optional, only needed if you pass a `schema`
npm install zod
```

## What it does, in order

1. **Validate** — if a `schema` is provided, raw args are parsed before
   anything runs. Invalid args throw immediately and are never retried.
2. **Circuit breaker check** — if the breaker for this tool is open
   (too many recent failures), the call short-circuits instantly without
   hitting the real function.
3. **Attempt loop** — runs the tool, racing it against `timeoutMs` if set.
   On failure, retries with backoff up to `retry.attempts`.
4. **Fallback** — if every attempt fails, runs `fallback(args, lastError)`
   if provided. Otherwise throws `AllAttemptsFailedError`.

## API

### `wrapTool(fn, options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | required | Used in events, errors, circuit breaker bucketing |
| `schema` | `{ parse(input): Args }` | — | Any zod-shaped validator |
| `timeoutMs` | `number` | — | Per-attempt timeout |
| `retry.attempts` | `number` | `3` | Total attempts including the first |
| `retry.backoff` | `"fixed" \| "exponential"` | `"exponential"` | Delay growth |
| `retry.baseDelayMs` | `number` | `250` | Base delay |
| `retry.maxDelayMs` | `number` | `10000` | Delay cap |
| `retry.jitter` | `boolean` | `true` | Randomize delay to avoid thundering herd |
| `retry.retryOn` | `(err, attempt) => boolean` | skip validation errors | Custom retry eligibility |
| `circuitBreaker.failureThreshold` | `number` | `5` | Consecutive failures before opening |
| `circuitBreaker.resetTimeoutMs` | `number` | `30000` | Time before a trial call is allowed |
| `circuitBreaker` | `false` | — | Disable entirely |
| `fallback` | `(args, error) => Result` | — | Last resort after all attempts fail |
| `onEvent` | `(event) => void` | — | Observability hook, see below |

### `wrapTools(registry, sharedOptions?)`

Wrap a whole tool registry in one call:

```ts
const tools = wrapTools(
  {
    getWeather: { fn: getWeatherImpl, options: { timeoutMs: 3000 } },
    searchDocs: { fn: searchDocsImpl, options: { retry: { attempts: 2 } } },
  },
  { onEvent: consoleLogger() }, // shared defaults, overridden per-tool
);
```

### Errors

All failures are normalized so you can branch on type regardless of the
underlying provider or cause:

- `ToolValidationError` — args failed schema validation (never retried)
- `ToolTimeoutError` — an attempt exceeded `timeoutMs`
- `ToolExecutionError` — the tool function threw
- `CircuitOpenError` — the breaker is open, call was short-circuited
- `AllAttemptsFailedError` — every attempt (and fallback, if any) failed

### Observability

Pass `onEvent` to receive a structured event for every attempt, retry,
timeout, success, failure, fallback, and circuit state change:

```ts
import { consoleLogger } from "toolshield";
wrapTool(fn, { name: "x", onEvent: consoleLogger() });
```

Or write your own `onEvent` to pipe into OpenTelemetry, Datadog, or
whatever you already use.

## Provider adapters

```ts
import { wrapOpenAITool } from "toolshield/adapters/openai";
import { wrapAnthropicTool } from "toolshield/adapters/anthropic";
import { wrapVercelAiExecute } from "toolshield/adapters/vercel-ai";
```

See `examples/openai-integration.ts` for a full walkthrough. Anthropic's
adapter also exposes `toToolResultBlock()`, which builds a ready-to-send
`tool_result` content block and converts failures into `is_error: true`
blocks automatically.

## Architecture

```
src/
  core/
    types.ts        shared type definitions
    errors.ts        normalized error classes
    wrapTool.ts       composes validation -> circuit breaker -> retry -> fallback
    wrapTools.ts      batch wrapper for a whole tool registry
  policies/
    retry.ts          backoff calculation + retry eligibility
    timeout.ts         Promise.race against a deadline
    circuitBreaker.ts  closed / open / half-open state machine
  validation/
    schemaValidator.ts  schema-agnostic validation + JSON-string coercion
  observability/
    logger.ts          ready-made console event logger
  adapters/
    openai.ts          OpenAI function-calling shape
    anthropic.ts        Anthropic tool_use / tool_result shape
    vercel-ai.ts        Vercel AI SDK tool() execute wrapper
```

Each policy module (`retry`, `timeout`, `circuitBreaker`) is independent
and unit-testable on its own; `wrapTool` is purely composition. Adapters
are thin — they never re-implement policy, only translate a provider's
tool-definition shape to and from the core `wrapTool` call.

## Development

```bash
npm install
npm run test        # vitest
npm run typecheck    # tsc --noEmit
npm run build        # tsup -> dist/ (ESM + CJS + .d.ts)
```

## License

MIT
