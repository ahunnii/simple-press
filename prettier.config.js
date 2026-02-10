/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
const config = {
  plugins: [
    "@ianvs/prettier-plugin-sort-imports",
    "prettier-plugin-tailwindcss",
  ],
  // Import order: types first per group, then React, Next, generated, third-party,
  // then internal ~ (types → env → lib → server → trpc → hooks → components → providers → app), then relative.
  importOrder: [
    "<TYPES>",
    "^(react/(.*)$)|^(react$)|^(react-native(.*)$)",
    "^(next/(.*)$)|^(next$)",
    "^generated/(.*)$",
    "<THIRD_PARTY_MODULES>",
    "",
    "<TYPES>^[.|..|~]",
    "^~/types/(.*)$",
    "^~/env(.*)$",
    "^~/lib/(.*)$",
    "^~/server/(.*)$",
    "^~/trpc/(.*)$",
    "^~/hooks/(.*)$",
    "^~/components/ui/(.*)$",
    "^~/components/inputs/(.*)$",
    "^~/components/layout/(.*)$",
    "^~/components/(.*)$",
    "^~/providers/(.*)$",
    "^~/app/(.*)$",
    "^~/styles/(.*)$",
    "",
    "^[../]",
    "^[./]",
  ],
  importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"],
  importOrderTypeScriptVersion: "5.0.0",
};

export default config;
