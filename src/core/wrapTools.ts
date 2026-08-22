import type { ToolFn, WrapToolOptions } from "./types.js";
import { wrapTool } from "./wrapTool.js";

/**
 * A map of tool name -> { fn, options }. Lets you define an agent's whole
 * toolset once and get back the same shape with every function wrapped,
 * instead of calling wrapTool individually for each one.
 *
 * Example:
 *   const tools = wrapTools({
 *     getWeather: { fn: getWeatherImpl, options: { timeoutMs: 4000 } },
 *     searchDocs: { fn: searchDocsImpl, options: { retry: { attempts: 2 } } },
 *   });
 *   // tools.getWeather and tools.searchDocs are now reliability-wrapped
 */
export function wrapTools<
  T extends Record<string, { fn: ToolFn<any, any>; options?: Omit<WrapToolOptions<any, any>, "name"> }>,
>(registry: T, shared?: Omit<WrapToolOptions<any, any>, "name">): { [K in keyof T]: ToolFn<unknown, unknown> } {
  const out = {} as { [K in keyof T]: ToolFn<unknown, unknown> };
  for (const key of Object.keys(registry)) {
    const entry = registry[key as keyof T];
    if (!entry) continue;
    out[key as keyof T] = wrapTool(entry.fn, {
      name: key,
      ...shared,
      ...entry.options,
    });
  }
  return out;
}
