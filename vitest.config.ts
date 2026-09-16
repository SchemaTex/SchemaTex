import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Scratch copies under tmp/ are not part of the maintained test suite.
    include: ["tests/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
  },
});
