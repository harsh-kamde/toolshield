import type { RetryOptions } from "../core/types.js";
import { ToolValidationError } from "../core/errors.js";

export interface ResolvedRetryOptions extends Required<Omit<RetryOptions, "retryOn">> {
  retryOn: (error: unknown, attempt: number) => boolean;
}

const defaultRetryOn = (error: unknown): boolean => {
  // Bad input won't fix itself on retry — never retry validation errors.
  if (error instanceof ToolValidationError) return false;
  return true;
};

export function resolveRetryOptions(opts?: RetryOptions): ResolvedRetryOptions {
  return {
    attempts: opts?.attempts ?? 3,
    backoff: opts?.backoff ?? "exponential",
    baseDelayMs: opts?.baseDelayMs ?? 250,
    maxDelayMs: opts?.maxDelayMs ?? 10_000,
    jitter: opts?.jitter ?? true,
    retryOn: opts?.retryOn ?? defaultRetryOn,
  };
}

/** Computes the delay before the given attempt (1-indexed retry count, i.e. 1 = first retry). */
export function computeDelay(opts: ResolvedRetryOptions, retryCount: number): number {
  const raw =
    opts.backoff === "fixed"
      ? opts.baseDelayMs
      : opts.baseDelayMs * 2 ** (retryCount - 1);

  const capped = Math.min(raw, opts.maxDelayMs);
  if (!opts.jitter) return capped;

  // Full jitter: random value between 0 and the capped delay.
  return Math.random() * capped;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
