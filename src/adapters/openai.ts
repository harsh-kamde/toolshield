import { wrapTool } from "../core/wrapTool.js";
import { coerceJsonArgs } from "../validation/schemaValidator.js";
import type { WrapToolOptions } from "../core/types.js";

/**
 * OpenAI tool definitions look like:
 *   { type: "function", function: { name, description, parameters }, }
 * plus a separate `execute`/handler you call yourself when a tool_call
 * comes back. This adapter wraps that handler in place, and also handles
 * OpenAI's tool_calls[].function.arguments arriving as a JSON string.
 */
export function wrapOpenAITool<Args, Result>(
  definition: {
    type: "function";
    function: { name: string; description?: string; parameters?: unknown };
  },
  handler: (args: Args) => Promise<Result>,
  options: Omit<WrapToolOptions<Args, Result>, "name"> = {},
) {
  const name = definition.function.name;
  const wrapped = wrapTool(handler, { name, ...options });

  return {
    definition,
    /** Call this with the raw string OpenAI returns in tool_calls[].function.arguments. */
    async handle(rawArguments: string | Args): Promise<Result> {
      const parsed = coerceJsonArgs(rawArguments);
      return wrapped(parsed);
    },
  };
}
