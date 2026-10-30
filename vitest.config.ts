import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^schematex$/, replacement: new URL("./src/index.ts", import.meta.url).pathname },
      { find: "@/lib/examples-source", replacement: new URL("./website/lib/examples-source.ts", import.meta.url).pathname },
    ],
  },
  test: {
    // Scratch copies under tmp/ are not part of the maintained test suite.
    include: ["tests/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
  },
});
