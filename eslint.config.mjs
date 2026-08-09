// Minimal ESLint flat config (root, so eslint resolves it from CWD when the
// code-hooks pre-commit runs `npx eslint` at the repo root). Parse-only
// baseline: TypeScript/TSX via the typescript-eslint parser, no enforced
// rules. fforge never had ESLint configured, so this lets the nodejs lint
// stage run (and catch syntax errors) without churning existing frontend
// code. Tighten rules in a dedicated lint PR.
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    files: ["frontend/src/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {},
  },
  {
    ignores: [
      "frontend/dist/**",
      "frontend/wailsjs/**",
      "frontend/vite.config.ts",
      "**/*.json",
      "**/*.cjs",
      "**/*.mjs",
      "**/.gitignore",
    ],
  },
);
