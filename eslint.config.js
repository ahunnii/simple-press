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
      // ── Formatter-safe conditional classNames ──────────────────────────────
      //
      // `prettier-plugin-tailwindcss` (see prettier.config.js) STRIPS the
      // leading space out of a string interpolated into a `className` template
      // literal. Verified against this repo's own config:
      //
      //   in   className={`vii-reveal-group${on ? " is-visible" : ""}`}
      //   out  className={`vii-reveal-group${on ? "is-visible" : ""}`}
      //
      // The emitted class is then the single token `vii-reveal-groupis-visible`,
      // which matches NEITHER class. This is silent and survives review, because
      // the source you wrote was correct — the formatter broke it afterwards, and
      // re-adding the space just gets stripped again on the next format run.
      //
      // It has bitten real commerce code: it killed `.pink-input` on every
      // invalid field in pink's checkout (the input lost its background, border,
      // padding and width at the moment the shopper needed guidance), and it
      // disabled vii's reveal group on the checkout form, leaving the fieldset
      // holding a `required` phone input at `opacity: 0` — where native
      // constraint validation cancels submit before React's `onSubmit` ever
      // runs, so the shopper sees nothing happen at all.
      //
      // Use `cn()` from `~/lib/utils` instead — separate arguments can never be
      // concatenated, and the plugin understands the call:
      //
      //   className={cn("vii-reveal-group", on && "is-visible")}
      //
      // This rule targets the trap specifically: a space-prefixed string literal
      // inside a className template literal. That is the shape a developer writes
      // when they are trying to do the right thing, and the only shape the
      // formatter silently corrupts.
      //
      // 2026-08-14: two more shapes of the same trap were found, both invisible
      // to the original single selector above. First, the "nested conditional"
      // form —
      //
      //   className={`base${className ? ` ${className}` : ""}`}
      //
      // — puts the leading space inside the INNER template literal's first
      // quasi, which is a `TemplateElement`, not a `Literal`. The original
      // selector only ever matched `Literal`, so it never saw this shape at
      // all — 15 sites across the repo used it, formatter-safe today only by
      // accident (the plugin still strips the space; the string just happens
      // to render "basefoo" until `className` is actually passed, so it's
      // easy to ship without noticing). Second, a variable-assignment form —
      //
      //   const frameClassName = `base${className ? ` ${className}` : ""}`;
      //
      // — where the template literal is the initializer of a `VariableDeclarator`
      // rather than the value of a JSX attribute, so no `JSXAttribute`-rooted
      // selector can ever reach it, plain or nested. Both gaps are closed below
      // with two additional selectors apiece (plain + nested, JSXAttribute +
      // VariableDeclarator). The attribute-name test was also broadened from
      // the literal `'className'` to `/[Cc]lassName$/` so it also catches
      // props like `frameClassName` or `innerClassName` — free prevention,
      // confirmed against the only two other `*ClassName`-taking template
      // literals in the repo (both already formatter-safe; the broadened
      // regex still matches bare `className` since `/$/` requires nothing
      // after it).
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXAttribute[name.name=/[Cc]lassName$/] TemplateLiteral Literal[value=/^\\s/]",
          message:
            'prettier-plugin-tailwindcss strips this leading space, merging the class into the preceding one (e.g. `foo` + ` bar` becomes `foobar`, matching neither). This also applies to the nested-conditional form (`${cond ? ` bar` : ""}`) and to templates assigned to a `*ClassName` variable before being passed to JSX — the space is stripped in all of these. Use cn() from ~/lib/utils: cn("foo", cond && "bar").',
        },
        {
          selector:
            "JSXAttribute[name.name=/[Cc]lassName$/] TemplateLiteral TemplateLiteral[quasis.0.value.raw=/^\\s/]",
          message:
            'prettier-plugin-tailwindcss strips this leading space, merging the class into the preceding one (e.g. `foo` + ` bar` becomes `foobar`, matching neither). This also applies to the nested-conditional form (`${cond ? ` bar` : ""}`) and to templates assigned to a `*ClassName` variable before being passed to JSX — the space is stripped in all of these. Use cn() from ~/lib/utils: cn("foo", cond && "bar").',
        },
        {
          selector:
            "VariableDeclarator[id.name=/[Cc]lassName$/] TemplateLiteral Literal[value=/^\\s/]",
          message:
            'prettier-plugin-tailwindcss strips this leading space, merging the class into the preceding one (e.g. `foo` + ` bar` becomes `foobar`, matching neither). This also applies to the nested-conditional form (`${cond ? ` bar` : ""}`) and to templates assigned to a `*ClassName` variable before being passed to JSX — the space is stripped in all of these. Use cn() from ~/lib/utils: cn("foo", cond && "bar").',
        },
        {
          selector:
            "VariableDeclarator[id.name=/[Cc]lassName$/] TemplateLiteral TemplateLiteral[quasis.0.value.raw=/^\\s/]",
          message:
            'prettier-plugin-tailwindcss strips this leading space, merging the class into the preceding one (e.g. `foo` + ` bar` becomes `foobar`, matching neither). This also applies to the nested-conditional form (`${cond ? ` bar` : ""}`) and to templates assigned to a `*ClassName` variable before being passed to JSX — the space is stripped in all of these. Use cn() from ~/lib/utils: cn("foo", cond && "bar").',
        },
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
