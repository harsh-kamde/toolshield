export { wrapTool } from "./core/wrapTool.js";
export { wrapTools } from "./core/wrapTools.js";

export {
  ToolShieldError,
  ToolTimeoutError,
  ToolValidationError,
  ToolExecutionError,
  CircuitOpenError,
  AllAttemptsFailedError,
} from "./core/errors.js";

export type {
  ToolFn,
  WrapToolOptions,
  RetryOptions,
  CircuitBreakerOptions,
  FallbackFn,
  ToolShieldEvent,
  OnEvent,
  ArgsValidator,
  BackoffStrategy,
} from "./core/types.js";

export { coerceJsonArgs } from "./validation/schemaValidator.js";
export { consoleLogger } from "./observability/logger.js";
