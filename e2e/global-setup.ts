import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The 10 active storefront templates. Checkout/success logic is shared across all
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
  "pink",
] as const;

export type SeedTenant = {
  templateId: string;
  subdomain: string;
  businessId: string;
  productId: string;
  productSlug: string;
  productName: string;
  price: number;
  /**
   * A second, subscription-enabled product on the same tenant, present only
   * for the templates seed.ts turns the `subscriptions` flag on for
   * (`default`, `happy-bamboo`) — kept separate from the always-present
   * plain product above so specs can assert "no panel" on one product and
   * "panel + form" on the other, on the same tenant, without needing a
   * dedicated third business.
   */
  subscriptionProductId?: string;
  subscriptionProductSlug?: string;
  subscriptionProductName?: string;
};

export const SEED_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  ".seed-data.json",
);

// A pre-verified, credentialed better-auth user, seeded directly (see seed.ts)
// rather than through the real /sign-up flow — `requireEmailVerification: true`
// means a freshly signed-up user can't sign in until they click an emailed
// link, which no e2e spec can do. Better-auth users aren't tenant-scoped (one
// account works across every business subdomain), so this single seeded user
// is reused by every auth spec regardless of which tenant it signs in on.
export const SEED_USER = {
  email: "e2e-signed-in@test.dev",
  password: "E2eTest123!",
};

// Seeding touches the app's Prisma singleton (generated/prisma directory import +
// the `~` alias), which Playwright's ESM runner can't resolve — so run it through
// `tsx`, exactly like the `db:seed` script. The child writes SEED_FILE itself.
export default function globalSetup() {
  execSync("pnpm exec tsx e2e/seed.ts", {
    stdio: "inherit",
    env: process.env,
  });
}
