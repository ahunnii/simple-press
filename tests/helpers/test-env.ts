/**
 * Test environment defaults. Imported (via setup files / global-setup) BEFORE any
 * `~/server/*` module loads, so the env-dependent singletons (Prisma, Stripe,
 * Resend, better-auth) can construct. Real env always wins via `??=`, so CI and
 * local overrides (e.g. a different test DATABASE_URL) take precedence.
 *
 * No network calls are made in tests — the dummy keys exist only so eager client
 * constructors don't throw at import time.
 */
// NODE_ENV is already "test" under Vitest (and is a read-only type), so it is
// not set here.
process.env.SKIP_ENV_VALIDATION ??= "1";

// Point at the throwaway Postgres from docker-compose.test.yml (port 5433).
process.env.DATABASE_URL ??=
  "postgresql://test:test@localhost:5433/simplepress_test";

// Valid-format AES-GCM-256 key for prisma-field-encryption. Round-trips within
// the test DB only — not a secret.
process.env.PRISMA_FIELD_ENCRYPTION_KEY ??=
  "k1.aesgcm256.Z-dIebDKfyUXib7eZbXsTRvY9yEsn6uHBVEZ2oW60-A";

// Dummy placeholders for vars read at module-import time.
const DUMMIES: Record<string, string> = {
  STRIPE_SECRET_KEY: "sk_test_dummy",
  STRIPE_WEBHOOK_SECRET: "whsec_dummy",
  BETTER_AUTH_BASE_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "test-secret",
  BETTER_AUTH_DISCORD_ID: "dummy",
  BETTER_AUTH_DISCORD_SECRET: "dummy",
  RESEND_API_KEY: "re_dummy",
  DISCORD_WEBHOOK_URL: "https://discord.test/webhook",
  UMAMI_BASE_URL: "http://localhost:3001",
  MINIO_ACCESS_KEY: "dummy",
  MINIO_SECRET_KEY: "dummy",
  INVITATION_CODE: "dummy",
  HCAPTCHA_SECRET_KEY: "dummy",
  VPS_IP: "127.0.0.1",
  SIMPLEPRESS_HASH_SECRET: "test-hash-secret",
  ARTISANAL_FUTURES_API_URL: "http://localhost:4000",
  NEXT_PUBLIC_PLATFORM_DOMAIN: "simplepress.test",
  NEXT_PUBLIC_STORAGE_URL: "http://localhost:9000",
  NEXT_PUBLIC_STORAGE_BUCKET_NAME: "test",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_dummy",
  NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID: "ca_dummy",
  NEXT_PUBLIC_ENABLE_UMAMI: "false",
  NEXT_PUBLIC_UMAMI_WEBSITE_ID: "dummy",
  NEXT_PUBLIC_HELP_URL: "http://localhost/help",
  NEXT_PUBLIC_EMAIL_FROM_NOREPLY: "noreply@test.dev",
  NEXT_PUBLIC_EMAIL_FROM_ORDERS: "orders@test.dev",
  NEXT_PUBLIC_EMAIL_FROM_SUPPORT: "support@test.dev",
  NEXT_PUBLIC_HCAPTCHA_SITE_KEY: "dummy",
};

for (const [key, value] of Object.entries(DUMMIES)) {
  process.env[key] ??= value;
}
