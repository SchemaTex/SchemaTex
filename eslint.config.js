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
      // 200+ existing `x!` sites guard upstream — keep visible, don't block CI.
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  }
);
