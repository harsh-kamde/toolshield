export class ToolShieldError extends Error {
  readonly tool: string;
  constructor(message: string, tool: string) {
    super(message);
    this.name = "ToolShieldError";
    this.tool = tool;
  }
}

export class ToolTimeoutError extends ToolShieldError {
  readonly timeoutMs: number;
  constructor(tool: string, timeoutMs: number) {
    super(`Tool "${tool}" timed out after ${timeoutMs}ms`, tool);
    this.name = "ToolTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export class ToolValidationError extends ToolShieldError {
  readonly cause?: unknown;
  constructor(tool: string, cause: unknown) {
    super(`Tool "${tool}" received invalid arguments`, tool);
    this.name = "ToolValidationError";
    this.cause = cause;
  }
}

export class ToolExecutionError extends ToolShieldError {
  readonly cause: unknown;
  constructor(tool: string, cause: unknown) {
    const causeMsg = cause instanceof Error ? cause.message : String(cause);
    super(`Tool "${tool}" failed: ${causeMsg}`, tool);
    this.name = "ToolExecutionError";
    this.cause = cause;
  }
}

export class CircuitOpenError extends ToolShieldError {
  constructor(tool: string) {
    super(
      `Circuit for tool "${tool}" is open — too many recent failures, calls are being short-circuited`,
      tool,
    );
    this.name = "CircuitOpenError";
  }
}

export class AllAttemptsFailedError extends ToolShieldError {
  readonly attempts: unknown[];
  constructor(tool: string, attempts: unknown[]) {
    super(
      `Tool "${tool}" failed after ${attempts.length} attempt(s) and no fallback was provided or fallback also failed`,
      tool,
    );
    this.name = "AllAttemptsFailedError";
    this.attempts = attempts;
  }
}
