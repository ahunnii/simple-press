import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default tseslint.config(
  {
    ignores: [".next"],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  // ─── Vendored Better Auth UI components ────────────────────────────────────
  // These files are copied verbatim from the Better Auth UI shadcn registry
  // (https://better-auth-ui.com/r/{style}/{name}.json) and are re-fetched on
  // upgrade. Upstream lints with biome, which does not enforce this repo's
  // stricter type-aware rules, so a stock copy trips ~100 errors here.
  //
  // We relax rather than rewrite deliberately. `prefer-nullish-coalescing` in
  // particular is NOT a safe mechanical fix in this code: patterns like
  // `user.name || user.email` intentionally fall back on the empty string, and
  // `??` would change what renders (avatar initials, display names, email
  // fallbacks). Keeping these files byte-identical to upstream also keeps
  // registry re-adds a clean diff instead of a merge.
  //
  // Locally authored files under these paths (see e.g. the captcha widget) are
  // exempted below so they still get the full ruleset.
  {
    files: ["src/components/auth/**/*.{ts,tsx}", "src/lib/auth/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/non-nullable-type-assertion-style": "off",
    },
  },
  // Locally authored files that happen to live under the vendored paths above.
  // These are ours, not upstream's, so they get the full ruleset back. Add new
  // hand-written auth components here (or keep them out of `components/auth/`).
  {
    files: [
      "src/components/auth/captcha/**/*.{ts,tsx}",
      "src/components/auth/auth-error-alert.tsx",
      "src/lib/auth/auth-error-messages.ts",
      "src/lib/auth/auth-error-messages.test.ts",
    ],
    rules: {
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/no-empty-function": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/no-base-to-string": "error",
      "@typescript-eslint/non-nullable-type-assertion-style": "error",
    },
  },
  // shadcn's combobox primitive, added as a registry dependency of
  // `additional-field`. Same reasoning as above.
  {
    files: ["src/components/ui/combobox.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
);
