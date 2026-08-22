import type { OnEvent, ToolShieldEvent } from "../core/types.js";

/**
 * A ready-made onEvent handler that pretty-prints to the console.
 * Useful for local dev; swap for your own onEvent to pipe events into
 * Datadog, OpenTelemetry, or wherever your traces already go.
 */
export function consoleLogger(): OnEvent {
  return (event: ToolShieldEvent) => {
    const time = new Date(event.timestamp).toISOString();
    const parts = [`[toolshield] ${time} ${event.tool} ${event.type}`];
    if (event.attempt) parts.push(`attempt=${event.attempt}`);
    if (event.durationMs !== undefined) parts.push(`${event.durationMs}ms`);
    if (event.error) {
      const msg = event.error instanceof Error ? event.error.message : String(event.error);
      parts.push(`error="${msg}"`);
    }
    // eslint-disable-next-line no-console
    console.log(parts.join(" "));
  };
}
