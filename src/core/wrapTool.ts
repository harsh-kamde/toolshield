import type { OnEvent, ToolFn, WrapToolOptions } from "./types.js";
import { AllAttemptsFailedError, ToolExecutionError, ToolValidationError, ToolTimeoutError } from "./errors.js";
import { computeDelay, resolveRetryOptions, sleep } from "../policies/retry.js";
import { withTimeout } from "../policies/timeout.js";
import { CircuitBreaker, resolveCircuitBreakerOptions } from "../policies/circuitBreaker.js";
import { validateArgs } from "../validation/schemaValidator.js";

/**
 * Wraps any async tool function with validation, a per-attempt timeout,
 * retries with backoff, an optional circuit breaker, and an optional
 * fallback. Returns a drop-in replacement function with the same call
 * signature as the original — nothing about your agent loop has to change.
 *
 * Failure ordering per call:
 *   1. Validate args (never retried — bad input stays bad input)
 *   2. Circuit breaker check (short-circuits instantly if open)
 *   3. Attempt loop: run -> on failure, retry with backoff up to `attempts`
 *   4. If all attempts fail: run fallback if provided, else throw
 */
export function wrapTool<Args, Result>(
  fn: ToolFn<Args, Result>,
  options: WrapToolOptions<Args, Result>,
): ToolFn<unknown, Result> {
  const { name, schema, timeoutMs, fallback, onEvent } = options;
  const retryOpts = resolveRetryOptions(options.retry);

  const breaker =
    options.circuitBreaker === false
      ? null
      : new CircuitBreaker(name, resolveCircuitBreakerOptions(options.circuitBreaker || {}), onEvent);

  return async (rawArgs: unknown): Promise<Result> => {
    const args = validateArgs(schema, rawArgs, name);

    breaker?.assertCanProceed();

    const attemptErrors: unknown[] = [];

    for (let attempt = 1; attempt <= retryOpts.attempts; attempt += 1) {
      const startedAt = Date.now();
      emit(onEvent, { type: "attempt", tool: name, attempt, timestamp: startedAt });

      try {
        const result = await withTimeout(() => fn(args), timeoutMs, name);
        breaker?.recordSuccess();
        emit(onEvent, {
          type: "success",
          tool: name,
          attempt,
          durationMs: Date.now() - startedAt,
          timestamp: Date.now(),
        });
        return result;
      } catch (rawErr) {
        const err = normalizeError(rawErr, name);
        attemptErrors.push(err);
        breaker?.recordFailure();

        emit(onEvent, {
          type: "failure",
          tool: name,
          attempt,
          durationMs: Date.now() - startedAt,
          error: err,
          timestamp: Date.now(),
        });

        const isLastAttempt = attempt >= retryOpts.attempts;
        const shouldRetry = !isLastAttempt && retryOpts.retryOn(err, attempt);

        if (!shouldRetry) break;

        const delay = computeDelay(retryOpts, attempt);
        emit(onEvent, { type: "retry", tool: name, attempt: attempt + 1, timestamp: Date.now() });
        await sleep(delay);
      }
    }

    if (fallback) {
      try {
        const result = await fallback(args, attemptErrors[attemptErrors.length - 1]);
        emit(onEvent, { type: "fallback", tool: name, timestamp: Date.now() });
        return result;
      } catch (fallbackErr) {
        attemptErrors.push(fallbackErr);
      }
    }

    throw new AllAttemptsFailedError(name, attemptErrors);
  };
}

function normalizeError(err: unknown, toolName: string): Error {
  if (err instanceof ToolTimeoutError || err instanceof ToolValidationError) return err;
  if (err instanceof Error) return new ToolExecutionError(toolName, err);
  return new ToolExecutionError(toolName, err);
}

function emit(onEvent: OnEvent | undefined, event: Parameters<OnEvent>[0]): void {
  onEvent?.(event);
}
