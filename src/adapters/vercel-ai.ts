import { wrapTool } from "../core/wrapTool.js";
import type { WrapToolOptions } from "../core/types.js";

/**
 * Vercel AI SDK's `tool()` helper takes { description, parameters, execute }.
 * This adapter wraps just the `execute` function and hands back a
 * drop-in replacement to spread back into your tool() call:
 *
 *   const getWeather = tool({
 *     description: "...",
 *     parameters: weatherSchema,
 *     execute: wrapVercelAiExecute("getWeather", rawExecute, { timeoutMs: 4000 }),
 *   });
 */
export function wrapVercelAiExecute<Args, Result>(
  name: string,
  execute: (args: Args) => Promise<Result>,
  options: Omit<WrapToolOptions<Args, Result>, "name"> = {},
): (args: Args) => Promise<Result> {
  const wrapped = wrapTool(execute, { name, ...options });
  return (args: Args) => wrapped(args);
}
