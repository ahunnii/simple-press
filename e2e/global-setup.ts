import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The 9 active storefront templates. Checkout/success logic is shared across all
// of them — only rendering differs — so each tenant is one render/wiring skin of
// the same purchase flow.
export const TEMPLATES = [
  "default",
  "modern",
  "bamboo",
  "happy-bamboo",
  "elegant",
  "pollen",
  "noise",
  "dark-trend",
  "sledge",
] as const;

export type SeedTenant = {
  templateId: string;
  subdomain: string;
  businessId: string;
  productId: string;
  productSlug: string;
  productName: string;
  price: number;
};

export const SEED_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  ".seed-data.json",
);

// Seeding touches the app's Prisma singleton (generated/prisma directory import +
// the `~` alias), which Playwright's ESM runner can't resolve — so run it through
// `tsx`, exactly like the `db:seed` script. The child writes SEED_FILE itself.
export default function globalSetup() {
  execSync("pnpm exec tsx e2e/seed.ts", {
    stdio: "inherit",
    env: process.env,
  });
}
