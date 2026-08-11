import { expect, test } from "@playwright/test";

import { baseUrlFor, getTenant, signIn } from "./fixtures";
import { SEED_USER } from "./global-setup";

// If this file happens to run first against a stone-cold dev server (e.g. run
// in isolation via `pnpm test:e2e:run e2e/auth.default.spec.ts` rather than as
// part of the full suite), the very first navigation also pays for compiling
// middleware/instrumentation/the root layout — occasionally more than the
// global 30s navigationTimeout (playwright.config.ts). That's a cold-compile
// cost, not a hang, so give this file's navigations extra headroom rather than
// touching the shared global timeout.
test.use({ navigationTimeout: 60_000 });

// Before/after oracle for the upcoming @daveyplate/better-auth-ui → replacement
// migration. Every assertion targets roles, accessible labels, headings, and
// URLs — never the auth library's own markup, CSS classes, or `data-slot`
// internals — so this suite keeps passing across the migration and only fails
// if the actual user-facing contract (can sign in, lands where expected, stays
// signed in, can sign out) regresses.
//
// The credentials sign-in/sign-up forms sit behind better-auth's `captcha()`
// plugin (src/server/better-auth/config.tsx), which has no server-side dev
// bypass. In this suite that gate is a no-op: tests/helpers/test-env.ts sets
// `NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS=1`, so `useRecaptchaV3`
// (src/lib/captcha/use-recaptcha-v3.ts) stages the sentinel
// `RECAPTCHA_TEST_BYPASS_TOKEN` with no Google script load, and
// `verifyRecaptcha` (src/lib/captcha/verify-recaptcha.ts) accepts that exact
// token without a network call. See the `signIn` helper in ./fixtures — there
// is nothing left for a spec to solve or wait on.
const TEMPLATE = "default";

// This file still runs serial, but not because of the captcha: the sign-up
// tests below share module-level state (`signedUpAccount`, set by "sign up
// with valid details..." and read by "a freshly signed-up, unverified account
// cannot sign in") and rely on Playwright's serial-mode guarantee that a
// failure in one test skips the rest of the file rather than letting a later
// test run against unset state. See the comment at `signedUpAccount` below.
test.describe.configure({ mode: "serial" });

// The post-sign-in navigation is a client-side route change that the dev server
// may still be compiling — measured at ~19s for the homepage on a cold
// Turbopack cache, and longer right after a CSS change invalidates it. This is
// the window for "did we get where we were going", not a fixed wait.
const SIGN_IN_TIMEOUT = 90_000;

// Every credentialed test here still pays for whatever the dev server has to
// compile on the way (the captcha itself is a same-process sentinel bypass —
// see the note above, no network round-trip). The 60s default in
// playwright.config.ts is enough on a fully warm cache and not enough
// otherwise, which shows up as a test that dies mid-assertion and reads
// exactly like a broken sign-in.
//
// The `beforeAll` below removes most of that variance; this removes the rest.
// It buys headroom only — nothing here waits on a fixed delay, so a fast run is
// still a fast run.
test.beforeEach(({}, testInfo) => {
  testInfo.setTimeout(150_000);
});

// Warm every route these tests navigate to, before any of them run.
//
// This isn't an optimisation, it's what makes the suite deterministic. The dev
// server compiles each route on first hit, and the homepage in particular took
// ~19s to compile on a cold Turbopack cache. That cost otherwise lands *inside*
// a test — after `signIn()` has already spent time on a page load — and can
// overrun Playwright's 60s per-test timeout on its own. The failure then looks
// exactly like a broken sign-in (the URL simply never changes), which is badly
// misleading: the sign-in POST has in fact already returned 200 and set a
// session.
//
// Paying the compile cost once, up front and outside any assertion budget,
// removes that whole class of false negative.
test.beforeAll(async ({ playwright }) => {
  // Hooks inherit the 60s per-test timeout, which is not enough to compile six
  // routes from cold — this hook is deliberately absorbing that cost so the
  // tests don't have to.
  test.setTimeout(300_000);

  const base = baseUrlFor(getTenant(TEMPLATE));
  const ctx = await playwright.request.newContext();

  try {
    for (const path of [
      "/",
      "/auth/sign-in",
      "/auth/sign-up",
      "/auth/verify-email",
      "/account/settings",
      "/account/orders",
    ]) {
      // A 3xx/4xx is fine — we only care that the route got compiled.
      await ctx
        .get(`${base}${path}`, { timeout: 120_000, failOnStatusCode: false })
        .catch(() => undefined);
    }
  } finally {
    await ctx.dispose();
  }
});

test("signed-out visit to /account/settings redirects to sign-in", async ({
  page,
}) => {
  const tenant = getTenant(TEMPLATE);
  const base = baseUrlFor(tenant);

  await page.goto(`${base}/account/settings`);
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});

test("sign in with a seeded, verified user succeeds and lands on the app", async ({
  page,
}) => {
  const tenant = getTenant(TEMPLATE);
  const base = baseUrlFor(tenant);

  await signIn(page, base, SEED_USER);

  // No redirectTo was given, so the app's default post-login destination ("/")
  // is reached.
  await expect(page).toHaveURL(`${base}/`, { timeout: SIGN_IN_TIMEOUT });

  // Confirm a real session was actually established (not just a client-side
  // route change that happens to land on "/"): a protected route should now
  // render instead of bouncing back to sign-in.
  await page.goto(`${base}/account/settings`);
  await expect(page).toHaveURL(`${base}/account/settings`);
});

test("sign in honours ?redirectTo=", async ({ page }) => {
  const tenant = getTenant(TEMPLATE);
  const base = baseUrlFor(tenant);

  await signIn(page, base, SEED_USER, "/account/orders");

  await expect(page).toHaveURL(`${base}/account/orders`, {
    timeout: SIGN_IN_TIMEOUT,
  });
});

test("/account/settings renders the account settings UI for the signed-in user", async ({
  page,
}) => {
  const tenant = getTenant(TEMPLATE);
  const base = baseUrlFor(tenant);

  await signIn(page, base, SEED_USER);
  await expect(page).toHaveURL(`${base}/`, { timeout: SIGN_IN_TIMEOUT });
  await page.goto(`${base}/account/settings`);

  // App-owned page heading (src/app/(storefront)/_templates/default/account/
  // default-account-layout.tsx) — not library markup, so this survives the
  // migration regardless of what the settings form itself looks like after.
  await expect(
    page.getByRole("heading", { name: "Settings", level: 1 }),
  ).toBeVisible();

  // App-owned account nav (same file) — confirms the account chrome rendered,
  // not just a bare page.
  const accountNav = page.getByRole("navigation", { name: "Account navigation" });
  await expect(accountNav.getByRole("link", { name: "Orders" })).toBeVisible();
  await expect(
    accountNav.getByRole("link", { name: "Security" }),
  ).toBeVisible();

  // The settings form itself is library-rendered and will be replaced by the
  // migration, but "a labeled Name field pre-filled with the signed-in user's
  // name" and "a labeled Email field pre-filled with their email" are the
  // minimum any account-settings UI must show, and confirm this is really
  // *this* user's data rendering — not a static template or someone else's
  // session. Matching by accessible label keeps this independent of the
  // library that owns the field's markup.
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("E2E Signed-In User");
  // The email field's accessible name isn't reliably "Email" in the current
  // library (no associated <label>), so match on the structural HTML
  // `type="email"` contract instead — the same fallback style
  // fixtures.ts:fillCheckout already relies on for form fields across
  // templates.
  await expect(page.locator('input[type="email"]')).toHaveValue(
    SEED_USER.email,
  );
});

test("sign out returns to a signed-out state", async ({ page }) => {
  const tenant = getTenant(TEMPLATE);
  const base = baseUrlFor(tenant);

  await signIn(page, base, SEED_USER);
  await expect(page).toHaveURL(`${base}/`, { timeout: SIGN_IN_TIMEOUT });

  await page.goto(`${base}/auth/sign-out`);
  await expect(page).toHaveURL(`${base}/auth/sign-in`);

  // Confirm the session is actually gone, not just a one-off page render: the
  // protected route redirects again.
  await page.goto(`${base}/account/settings`);
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});

// --- Sign-up ---------------------------------------------------------------
//
// The sign-up form (src/components/auth/sign-up.tsx) sits behind the same
// captcha gate as sign-in (also a no-op sentinel bypass here — see the note
// above). Server config has `requireEmailVerification: true`
// (src/server/better-auth/config.tsx), so a successful sign-up does NOT
// establish a session — the component's `onSuccess` handler stashes the email
// in sessionStorage and navigates to the verify-email view instead of signing
// the user in. These specs extend the same before/after oracle to sign-up's
// submit path.
//
// A genuinely unique email is required on every run, not just distinct from
// the seed data: because `requireEmailVerification` is true, better-auth
// deliberately returns a generic "success" response for a sign-up against an
// email that already exists (account-enumeration prevention — see
// `shouldReturnGenericDuplicateResponse` in better-auth's sign-up handler), so
// re-running this spec with a stale/reused email would still land on
// verify-email and make the assertion below pass vacuously. global-setup only
// resets the `e2e-` tenant businesses and the single SEED_USER between runs
// (see e2e/seed.ts) — it never touches accounts created through this test —
// so the timestamp+random suffix below is what actually guarantees
// uniqueness across repeated invocations, not the test DB being reset.
function uniqueSignUpEmail(): string {
  return `e2e-signup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.dev`;
}

const SIGN_UP_PASSWORD = "E2eSignUp123!";

// Set by the first sign-up test and read by the "cannot sign in unverified"
// test below. Safe across the two: `test.describe.configure({ mode: "serial" })`
// above means Playwright skips later tests in this file entirely if an
// earlier one fails, so by the time the sign-in test runs, this is guaranteed
// to be populated.
let signedUpAccount: { email: string; password: string } | undefined;

test("sign up with valid details lands on the verify-email view", async ({
  page,
}) => {
  const tenant = getTenant(TEMPLATE);
  const base = baseUrlFor(tenant);
  const email = uniqueSignUpEmail();

  await page.goto(`${base}/auth/sign-up`);
  await page.getByLabel(/^name$/i).fill("E2E Sign-Up User");
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(SIGN_UP_PASSWORD);

  // Terms-of-service consent gate (the `termsAccepted` field in
  // src/components/auth/sign-up.tsx) — matched by its accessible name (the
  // rendered label text), not any library markup.
  //
  // This locator REQUIRES that only one such checkbox exists. A second consent
  // checkbox with the same label used to be declared in providers.tsx, which
  // made this a strict-mode violation on two matches. Don't reintroduce one.
  await page
    .getByRole("checkbox", { name: /I agree to SimplePress/i })
    .check();

  await page.getByRole("button", { name: /sign\s?up/i }).click();

  // The app-owned contract for an unverified sign-up is "you land on the
  // verify-email view" — not "you're signed in". Allow a query string
  // (getAuthLinkURL may append redirectTo).
  await expect(page).toHaveURL(/\/auth\/verify-email(\?.*)?$/, {
    timeout: SIGN_IN_TIMEOUT,
  });

  signedUpAccount = { email, password: SIGN_UP_PASSWORD };
});

test("the terms checkbox is required to sign up", async ({ page }) => {
  const tenant = getTenant(TEMPLATE);
  const base = baseUrlFor(tenant);
  const email = uniqueSignUpEmail();

  await page.goto(`${base}/auth/sign-up`);
  await page.getByLabel(/^name$/i).fill("E2E Sign-Up User");
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(SIGN_UP_PASSWORD);

  // Deliberately leave the terms checkbox unchecked, then try to submit
  // anyway.
  await page.getByRole("button", { name: /sign\s?up/i }).click();

  // The checkbox is `required` (the `termsAccepted` field in
  // src/components/auth/sign-up.tsx). Radix forwards
  // `required` to a hidden native `<input type="checkbox">` it renders for
  // form participation, so the browser's own constraint validation blocks the
  // form's `submit` event before React's `onSubmit` handler ever runs — no
  // request is sent. The only externally-observable proof of that is a
  // no-op, so assert we're still on the sign-up view with the same in-progress
  // form (not a fresh/reset one).
  await expect(page).toHaveURL(/\/auth\/sign-up$/);
  await expect(page.getByLabel(/^email$/i)).toHaveValue(email);
});

test("a freshly signed-up, unverified account cannot sign in", async ({
  page,
}) => {
  if (!signedUpAccount) {
    throw new Error(
      "signedUpAccount was not set by the earlier sign-up test — serial mode " +
        "should make this unreachable unless that test was skipped or removed.",
    );
  }

  const tenant = getTenant(TEMPLATE);
  const base = baseUrlFor(tenant);

  await signIn(page, base, signedUpAccount);

  // better-auth's EMAIL_NOT_VERIFIED error path (src/components/auth/sign-in.tsx
  // `onError`) redirects straight to the verify-email view rather than
  // surfacing an error toast and staying on sign-in — but either way, no
  // session is established. Assert the actual redirect behaviour rather than
  // an assumed "stays put" one.
  await expect(page).toHaveURL(/\/auth\/verify-email(\?.*)?$/, {
    timeout: SIGN_IN_TIMEOUT,
  });

  // Confirm no session was actually established (not just that the redirect
  // hasn't caught up yet): a protected route still bounces to sign-in.
  await page.goto(`${base}/account/settings`);
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});
