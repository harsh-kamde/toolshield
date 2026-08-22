/**
 * A tool function is any async function an agent calls: (args) => result.
 * ToolShield wraps these without caring where the args came from
 * (OpenAI function call, Anthropic tool_use block, manual invocation, etc).
 */
export type ToolFn<Args, Result> = (args: Args) => Promise<Result>;

export type BackoffStrategy = "fixed" | "exponential";

export interface RetryOptions {
  /** Max number of attempts including the first call. Default: 3 */
  attempts?: number;
  /** Backoff strategy between attempts. Default: "exponential" */
  backoff?: BackoffStrategy;
  /** Base delay in ms used by the backoff calculation. Default: 250 */
  baseDelayMs?: number;
  /** Upper bound for any single delay. Default: 10_000 */
  maxDelayMs?: number;
  /** Add random jitter (0–100% of computed delay) to avoid thundering herd. Default: true */
  jitter?: boolean;
  /**
   * Decide whether a given error should trigger a retry.
   * Default: retries on ToolTimeoutError and ToolExecutionError,
   * never on ToolValidationError (bad input won't fix itself on retry).
   */
  retryOn?: (error: unknown, attempt: number) => boolean;
}

export interface CircuitBreakerOptions {
  /** Consecutive failures before the circuit opens. Default: 5 */
  failureThreshold?: number;
  /** How long the circuit stays open before allowing a trial call. Default: 30_000 */
  resetTimeoutMs?: number;
  /** Successes required in half-open state before fully closing. Default: 1 */
  successThreshold?: number;
}

export type FallbackFn<Args, Result> = (
  args: Args,
  error: unknown,
) => Promise<Result> | Result;

export interface ToolShieldEvent {
  type:
    | "attempt"
    | "retry"
    | "timeout"
    | "success"
    | "failure"
    | "fallback"
    | "circuit_open"
    | "circuit_half_open"
    | "circuit_close"
    | "validation_error";
  tool: string;
  attempt?: number;
  /** ms elapsed for this attempt, when applicable */
  durationMs?: number;
  error?: unknown;
  timestamp: number;
}

export type OnEvent = (event: ToolShieldEvent) => void;

/** Minimal structural interface so any schema library (zod, valibot, etc.)
 *  can be plugged in without adding it as a hard dependency. */
export interface ArgsValidator<Args> {
  parse(input: unknown): Args;
}

export interface WrapToolOptions<Args, Result> {
  /** Name used in events/logs and circuit breaker bucketing. Required. */
  name: string;
  /** Optional schema to validate/coerce raw args before the tool runs. */
  schema?: ArgsValidator<Args>;
  /** Per-attempt timeout in ms. Omit to disable. */
  timeoutMs?: number;
  retry?: RetryOptions;
  circuitBreaker?: CircuitBreakerOptions | false;
  /** Called only after retries (and circuit breaker) are exhausted. */
  fallback?: FallbackFn<Args, Result>;
  onEvent?: OnEvent;
}
