import { z } from "zod";
import { wrapTool, consoleLogger } from "../src/index.js";

// A flaky "tool" your agent might call — imagine this hits a weather API
// that times out or 500s occasionally.
async function getWeatherRaw(args: { city: string }) {
  if (Math.random() < 0.5) throw new Error("upstream API 500");
  return { city: args.city, tempC: 21 };
}

const getWeather = wrapTool(getWeatherRaw, {
  name: "getWeather",
  schema: z.object({ city: z.string().min(1) }),
  timeoutMs: 5000,
  retry: { attempts: 3, backoff: "exponential", baseDelayMs: 200 },
  circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 30_000 },
  fallback: async (args) => ({ city: args.city, tempC: null, note: "weather unavailable" }),
  onEvent: consoleLogger(),
});

const result = await getWeather({ city: "Indore" });
console.log("Final result:", result);
