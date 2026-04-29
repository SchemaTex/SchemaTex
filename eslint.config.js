import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    ignores: ["dist/", "node_modules/", "*.config.*"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // The codebase uses `x!` pervasively (200+ sites) to assert non-null
      // after upstream guards in hand-written parsers / layout engines.
      // Bulk-rewriting to `?.` would risk silently swallowing real bugs in
      // working code; downgrade to warn so the surface is visible without
      // permablocking CI. See chore(lint-cleanup) PR for context.
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  }
);
