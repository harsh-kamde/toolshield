import { wrapTool } from "../core/wrapTool.js";
import type { WrapToolOptions } from "../core/types.js";

/**
 * Anthropic tool definitions look like:
 *   { name, description, input_schema }
 * and the model returns a tool_use content block with `input` already
 * parsed as an object (unlike OpenAI, no JSON-string coercion needed).
 * This adapter wraps the handler and returns a ready-to-use
 * `toToolResultBlock` helper for building the tool_result message back.
 */
export function wrapAnthropicTool<Args, Result>(
  definition: { name: string; description?: string; input_schema?: unknown },
  handler: (args: Args) => Promise<Result>,
  options: Omit<WrapToolOptions<Args, Result>, "name"> = {},
) {
  const name = definition.name;
  const wrapped = wrapTool(handler, { name, ...options });

  return {
    definition,
    /** Call this with the tool_use block's `input` field. */
    async handle(input: Args): Promise<Result> {
      return wrapped(input);
    },
    /** Convenience: builds a well-formed tool_result content block, converting failures to `is_error`. */
    async toToolResultBlock(toolUseId: string, input: Args) {
      try {
        const result = await wrapped(input);
        return {
          type: "tool_result" as const,
          tool_use_id: toolUseId,
          content: typeof result === "string" ? result : JSON.stringify(result),
        };
      } catch (err) {
        return {
          type: "tool_result" as const,
          tool_use_id: toolUseId,
          content: err instanceof Error ? err.message : String(err),
          is_error: true,
        };
      }
    },
  };
}
