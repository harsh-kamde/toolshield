import { wrapTools, consoleLogger } from "../src/index.js";

async function getWeatherImpl(args: { city: string }) {
  return { city: args.city, tempC: 20 };
}

async function searchDocsImpl(args: { query: string }) {
  return { results: [`Result for "${args.query}"`] };
}

// Define shared defaults once, then override per-tool as needed.
const tools = wrapTools(
  {
    getWeather: { fn: getWeatherImpl, options: { timeoutMs: 3000 } },
    searchDocs: { fn: searchDocsImpl, options: { retry: { attempts: 2 } } },
  },
  { onEvent: consoleLogger(), circuitBreaker: { failureThreshold: 5 } },
);

const weather = await tools.getWeather({ city: "Indore" });
const docs = await tools.searchDocs({ query: "onboarding" });

console.log(weather, docs);
