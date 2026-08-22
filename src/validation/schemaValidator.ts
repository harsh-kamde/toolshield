import type { ArgsValidator } from "../core/types.js";
import { ToolValidationError } from "../core/errors.js";

/**
 * Runs the schema's .parse() and normalizes any thrown error into a
 * ToolValidationError. Works with zod out of the box (ZodSchema.parse),
 * and with anything else that exposes a structurally compatible
 * `.parse(input): Output` method — valibot, arktype wrappers, or a
 * hand-written validator all satisfy ArgsValidator.
 */
export function validateArgs<Args>(
  schema: ArgsValidator<Args> | undefined,
  rawArgs: unknown,
  toolName: string,
): Args {
  if (!schema) return rawArgs as Args;
  try {
    return schema.parse(rawArgs);
  } catch (err) {
    throw new ToolValidationError(toolName, err);
  }
}

/**
 * Common LLM tool-call quirk: some providers/models emit arguments as a
 * JSON string rather than a parsed object, especially under streaming.
 * Call this before validateArgs when args might arrive unparsed.
 */
export function coerceJsonArgs(rawArgs: unknown): unknown {
  if (typeof rawArgs !== "string") return rawArgs;
  try {
    return JSON.parse(rawArgs);
  } catch {
    // Not valid JSON — let schema validation surface a clear error
    // instead of failing silently here.
    return rawArgs;
  }
}
