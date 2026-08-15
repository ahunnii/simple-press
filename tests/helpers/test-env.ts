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

// Point at the throwaway Postgres from docker-compose.test.yml.
//
// The port is overridable via TEST_PG_PORT because 5433 (the historical
// hard-coded default) is not reliably free — on at least one dev machine here
// it is held by an unrelated project's Postgres, and the failure mode was ugly:
// the DSN still *looked* right, so `prisma db push --accept-data-loss` in
// global-setup.ts was aimed at a stranger's database. TEST_PG_PORT is read by
// docker-compose.test.yml and scripts/e2e-pg.sh too, so one value moves the
// container, the e2e cluster, and this DSN together — they can no longer drift
// apart, which is what made the old failure possible.
//
// `??=` means a fully-specified DATABASE_URL still wins over all of this.
const TEST_PG_PORT = process.env.TEST_PG_PORT ?? "5436";

process.env.DATABASE_URL ??= `postgresql://test:test@localhost:${TEST_PG_PORT}/simplepress_test`;

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
  // better-auth's captcha() plugin (src/server/better-auth/config.tsx) enforces
  // verification unconditionally on /sign-in/email, /sign-up/email, and
  // /request-password-reset — there is no NODE_ENV or missing-key bypass on the
  // server side. Google publishes no "always passes" test keypair for
  // reCAPTCHA v3 (the well-known 6LeIxAcTAAAAAJcZ… pair is v2-only and won't
  // load against the v3 script), so instead of pointing at a real Google
  // keypair, NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS below activates an explicit
  // sentinel bypass built for exactly this: `useRecaptchaV3`
  // (src/lib/captcha/use-recaptcha-v3.ts) stages a fixed token
  // (RECAPTCHA_TEST_BYPASS_TOKEN) instead of loading Google's script, and
  // `verifyRecaptcha` (src/lib/captcha/verify-recaptcha.ts) accepts that exact
  // token without calling Google — both gated on
  // `NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS === "1"` AND `NODE_ENV !==
  // "production"`, so it cannot activate in a deployed build even if this var
  // leaked into one. RECAPTCHA_SECRET_KEY/NEXT_PUBLIC_RECAPTCHA_SITE_KEY below
  // are therefore never actually sent to Google in tests — they exist only
  // because src/env.js requires non-empty values at import time. See
  // e2e/auth.default.spec.ts, which is the first spec to actually drive a
  // credentialed sign-in through this gate.
  RECAPTCHA_SECRET_KEY: "test-recaptcha-secret-unused",
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
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "test-recaptcha-site-key-unused",
  // The var that actually matters — see the comment on RECAPTCHA_SECRET_KEY
  // above. Both env.js (below) and use-recaptcha-v3.ts / verify-recaptcha.ts
  // require this exact string; anything else leaves the bypass off.
  NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS: "1",
};

for (const [key, value] of Object.entries(DUMMIES)) {
  process.env[key] ??= value;
}
