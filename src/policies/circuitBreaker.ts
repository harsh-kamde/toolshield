import type { CircuitBreakerOptions, OnEvent } from "../core/types.js";
import { CircuitOpenError } from "../core/errors.js";

type CircuitState = "closed" | "open" | "half_open";

export interface ResolvedCircuitBreakerOptions extends Required<CircuitBreakerOptions> {}

export function resolveCircuitBreakerOptions(
  opts?: CircuitBreakerOptions,
): ResolvedCircuitBreakerOptions {
  return {
    failureThreshold: opts?.failureThreshold ?? 5,
    resetTimeoutMs: opts?.resetTimeoutMs ?? 30_000,
    successThreshold: opts?.successThreshold ?? 1,
  };
}

/**
 * One CircuitBreaker instance is created per wrapped tool (see wrapTool.ts),
 * so state is scoped to that tool automatically — no global registry needed
 * unless the same underlying function is wrapped multiple times independently.
 */
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private openedAt = 0;

  constructor(
    private readonly toolName: string,
    private readonly opts: ResolvedCircuitBreakerOptions,
    private readonly onEvent?: OnEvent,
  ) {}

  /** Call before attempting the tool. Throws CircuitOpenError if calls should be blocked. */
  assertCanProceed(): void {
    if (this.state === "open") {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.opts.resetTimeoutMs) {
        this.state = "half_open";
        this.consecutiveSuccesses = 0;
        this.emit("circuit_half_open");
      } else {
        throw new CircuitOpenError(this.toolName);
      }
    }
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    if (this.state === "half_open") {
      this.consecutiveSuccesses += 1;
      if (this.consecutiveSuccesses >= this.opts.successThreshold) {
        this.state = "closed";
        this.emit("circuit_close");
      }
    }
  }

  recordFailure(): void {
    if (this.state === "half_open") {
      // A single failure in half-open state re-opens the circuit immediately.
      this.trip();
      return;
    }
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.opts.failureThreshold) {
      this.trip();
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  private trip(): void {
    this.state = "open";
    this.openedAt = Date.now();
    this.consecutiveFailures = 0;
    this.emit("circuit_open");
  }

  private emit(type: "circuit_open" | "circuit_half_open" | "circuit_close"): void {
    this.onEvent?.({ type, tool: this.toolName, timestamp: Date.now() });
  }
}
