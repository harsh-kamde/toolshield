import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "adapters/openai": "src/adapters/openai.ts",
    "adapters/anthropic": "src/adapters/anthropic.ts",
    "adapters/vercel-ai": "src/adapters/vercel-ai.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
});
