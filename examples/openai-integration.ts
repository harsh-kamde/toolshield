import { z } from "zod";
import { wrapOpenAITool } from "../src/adapters/openai.js";

const searchSchema = z.object({ query: z.string() });

const searchDocs = wrapOpenAITool(
  {
    type: "function",
    function: {
      name: "search_docs",
      description: "Search internal documentation",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  async (args: z.infer<typeof searchSchema>) => {
    // ... real implementation calling your search backend
    return { results: [`Result for "${args.query}"`] };
  },
  {
    schema: searchSchema,
    timeoutMs: 4000,
    retry: { attempts: 2 },
    fallback: async () => ({ results: [], note: "search temporarily unavailable" }),
  },
);

// Pass `searchDocs.definition` in your `tools` array when calling the OpenAI API.
// When a tool_call for "search_docs" comes back, call:
//   const result = await searchDocs.handle(toolCall.function.arguments);
// `arguments` can be the raw JSON string OpenAI sends — it's coerced automatically.

export { searchDocs };
