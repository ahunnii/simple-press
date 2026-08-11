import { readFileSync } from "node:fs";
import type { BrowserContext, Locator, Page } from "@playwright/test";

import type { SeedTenant } from "./global-setup";

import { SEED_FILE } from "./global-setup";

let cache: SeedTenant[] | null = null;

/** Look up a seeded tenant (written by global-setup) by template id. */
export function getTenant(templateId: string): SeedTenant {
  cache ??= JSON.parse(readFileSync(SEED_FILE, "utf8")) as SeedTenant[];
  const tenant = cache.find((t) => t.templateId === templateId);
  if (!tenant) throw new Error(`No seeded tenant for template "${templateId}"`);
  return tenant;
}

/** Storefront base URL for a tenant (Chromium resolves *.localhost to loopback). */
export function baseUrlFor(tenant: SeedTenant): string {
  return `http://${tenant.subdomain}.localhost:3000`;
}

/**
 * Pre-populate the localStorage cart before navigation, so a spec can land
 * straight on /checkout with a hydrated cart (mirrors cart-context's storage key
 * and item shape). Use this for the cross-template smoke; the default happy-path
 * adds to cart through the real product-page UI instead.
 */
export async function seedCart(
  context: BrowserContext,
  tenant: SeedTenant,
  quantity = 1,
): Promise<void> {
  const item = {
    productId: tenant.productId,
    variantId: null,
    productName: tenant.productName,
    variantName: null,
    price: tenant.price,
    compareAtPrice: null,
    quantity,
    imageUrl: null,
    sku: null,
    maxInventory: 50,
  };
  await context.addInitScript((cartItem) => {
    window.localStorage.setItem("shopping-cart", JSON.stringify([cartItem]));
  }, item);
}

/**
 * Set a controlled React <input> value via the native setter + input/change
 * events. Fallback for inputs that exist but Playwright won't `.fill()` because
 * they have zero rendered width (some templates, e.g. elegant, collapse
 * full-width fields in their checkout layout).
 */
async function reactSet(loc: Locator, value: string): Promise<void> {
  await loc.evaluate((el, val) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, val);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

/** Fill the first matching selector; returns false if none are present. */
async function fillFirst(
  scope: Page | Locator,
  selectors: string[],
  value: string,
): Promise<boolean> {
  // Prefer a real, visible fill. Some templates render responsive duplicates of
  // the form (one hidden via CSS); target only the visible match.
  for (const sel of selectors) {
    const loc = scope.locator(sel).filter({ visible: true }).first();
    if ((await loc.count()) > 0) {
      await loc.fill(value);
      return true;
    }
  }
  // Fallback: the field exists but isn't "visible" (e.g. collapsed to 0 width).
  for (const sel of selectors) {
    const loc = scope.locator(sel).first();
    if ((await loc.count()) > 0) {
      await reactSet(loc, value);
      return true;
    }
  }
  return false;
}

/** Resolve the owning `Page` for a fill scope that may be a `Locator`. */
function pageOf(scope: Page | Locator): Page {
  return "page" in scope && typeof scope.page === "function"
    ? scope.page()
    : (scope as Page);
}

// Mirrors src/lib/geo/regions.ts's US_STATES (code -> full name). Duplicated
// here (rather than imported) to keep this test helper self-contained; the
// checkout form's <SelectItem value={opt.code}>{opt.name}</SelectItem> renders
// the code as the option's `value` but the full name as its visible/accessible
// text, which is what Playwright's `getByRole("option", { name })` matches on.
const US_STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

/**
 * Set the checkout "State / Province" field. Every shared checkout form
 * (default/elegant/pollen/happy-bamboo/bamboo/sledge/noise/dark-trend) renders
 * it as a shadcn/Radix `<Select>` — `#state` is a `<button role="combobox">`
 * trigger, not an `<input>`, so `.fill()` throws ("Element is not an <input>,
 * <textarea> or [contenteditable] element"). The `modern` template renders a
 * plain native `<select id="state">` instead.
 *
 * Both cases share the same underlying option data
 * (`getRegionOptions` in src/lib/geo/regions.ts): the option `value` is the
 * two-letter code (e.g. "MI") but its rendered/accessible text is the full
 * name (e.g. "Michigan").
 *
 * Returns false if no `#state` element is present, so callers can fall back.
 */
async function selectState(
  scope: Page | Locator,
  code: string,
): Promise<boolean> {
  const trigger = scope.locator("#state").first();
  if ((await trigger.count()) === 0) return false;

  const tagName = await trigger.evaluate((el) => el.tagName.toLowerCase());
  if (tagName === "select") {
    // Native <select> (modern template) — Playwright's selectOption works
    // directly, matching by option value (the state code).
    await trigger.selectOption(code);
    return true;
  }

  // Radix Select combobox trigger: open the listbox, then click the option by
  // its accessible name (the full state name). The listbox is portaled to
  // document.body, so option lookups must go through the root Page, not
  // `scope` (which may be a Locator scoped to the <form>).
  //
  // Some templates (default/bamboo/elegant) render a sticky element that
  // overlaps the trigger, so a plain pointer click is intercepted by a div.
  // Scroll it into view and open via keyboard (focus + Enter) which Radix
  // Select honors and which sidesteps the pointer-intercept entirely.
  await trigger.scrollIntoViewIfNeeded();
  await trigger.focus();
  await trigger.press("Enter");
  const page = pageOf(scope);
  const option = page.getByRole("option", { name: US_STATE_NAMES[code] ?? code, exact: true });
  // Fall back to a forced pointer click if the keyboard open didn't surface it.
  if ((await option.count()) === 0) {
    await trigger.click({ force: true });
  }
  await option.click();
  return true;
}

export type CheckoutInfo = {
  email: string;
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  postal: string;
};

/**
 * Fill the required checkout fields. Every template shares the same field ids
 * (#email/#name/#phone/#address-line1/#city/#state/#postal) except `modern`,
 * which splits the name into given-name/family-name and uses autocomplete tokens
 * for the address — the fallbacks below cover that without per-template branching.
 * `#state` is a Select (Radix combobox on most templates, native <select> on
 * `modern`), not a text input — see `selectState`.
 */
export async function fillCheckout(
  scope: Page | Locator,
  info: CheckoutInfo,
): Promise<void> {
  await fillFirst(scope, ["#email", 'input[autocomplete="email"]'], info.email);

  const filledName = await fillFirst(scope, ["#name"], info.name);
  if (!filledName) {
    const [first, ...rest] = info.name.split(" ");
    await fillFirst(
      scope,
      ['input[autocomplete="given-name"]'],
      first ?? "Test",
    );
    await fillFirst(
      scope,
      ['input[autocomplete="family-name"]'],
      rest.join(" ") || "Buyer",
    );
  }

  await fillFirst(scope, ["#phone", 'input[autocomplete="tel"]'], info.phone);
  await fillFirst(
    scope,
    ["#address-line1", 'input[autocomplete="shipping address-line1"]'],
    info.line1,
  );
  await fillFirst(
    scope,
    ["#city", 'input[autocomplete="shipping address-level2"]'],
    info.city,
  );
  const filledState = await selectState(scope, info.state);
  if (!filledState) {
    // Fallback for any template that renders State as a plain text input
    // instead of a Select (none currently do, but keeps this resilient).
    await fillFirst(
      scope,
      ["#state", 'input[autocomplete="shipping address-level1"]'],
      info.state,
    );
  }
  await fillFirst(
    scope,
    ["#postal", 'input[autocomplete="shipping postal-code"]'],
    info.postal,
  );
}

/** The shared submit button text across all 9 templates' checkout forms. */
export const SUBMIT_NAME = /continue to payment/i;

export const SAMPLE_CHECKOUT: CheckoutInfo = {
  email: "e2e-buyer@test.dev",
  name: "Test Buyer",
  phone: "5551234567",
  line1: "123 Test St",
  city: "Detroit",
  state: "MI",
  postal: "48201",
};

export type StripeStub = { sessionId: string; customerEmail: string };

/**
 * Stub the two Stripe-touching endpoints so no real Stripe is hit:
 *  - POST /api/stripe/create-session → returns a *relative* sessionUrl pointing
 *    at /order/success, so the app's `window.location.href = sessionUrl` redirect
 *    navigates in-app (exercising the real redirect + success render).
 *  - GET  /api/stripe/session       → returns the order summary the success page
 *    renders.
 * Returns a getter for the captured create-session request body so specs can
 * assert the app sent the right payload.
 */
export function stubStripe(page: Page, stub: StripeStub) {
  let capturedBody: unknown = null;

  void page.route("**/api/stripe/create-session", async (route) => {
    capturedBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sessionUrl: `/order/success?session_id=${stub.sessionId}`,
        sessionId: stub.sessionId,
      }),
    });
  });

  void page.route("**/api/stripe/session**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        customer_email: stub.customerEmail,
        amount_total: 2500,
        currency: "usd",
        payment_status: "paid",
      }),
    });
  });

  return {
    get createSessionBody() {
      return capturedBody;
    },
  };
}

/**
 * Drive a real credentialed sign-in through the actual UI: fill email/password
 * by their accessible label (stable across any auth-UI-library swap) and
 * submit. No captcha-solving step is needed: better-auth's `captcha()` plugin
 * (src/server/better-auth/config.tsx) enforces verification unconditionally on
 * `/sign-in/email`, but the e2e env (tests/helpers/test-env.ts) sets
 * `NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS=1`, which makes `useRecaptchaV3`
 * (src/lib/captcha/use-recaptcha-v3.ts) stage the sentinel
 * `RECAPTCHA_TEST_BYPASS_TOKEN` instead of loading Google's script, and
 * `verifyRecaptcha` (src/lib/captcha/verify-recaptcha.ts) accept that exact
 * token without calling Google. The Better Auth UI captcha plugin picks the
 * staged token up automatically via its `x-captcha-response` header, so there
 * is nothing for this helper to click or wait on. The submit button's
 * accessible name varies by library/localization (currently "Login"), so
 * match loosely rather than on exact copy.
 */
export async function signIn(
  page: Page,
  base: string,
  creds: { email: string; password: string },
  redirectTo?: string,
): Promise<void> {
  const url = redirectTo
    ? `${base}/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`
    : `${base}/auth/sign-in`;
  await page.goto(url);
  await page.getByLabel(/^email$/i).fill(creds.email);
  await page.getByLabel(/^password$/i).fill(creds.password);
  await page.getByRole("button", { name: /log\s?in|sign\s?in/i }).click();
}
