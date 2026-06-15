import { readFileSync } from "node:fs";
import type { BrowserContext, Locator, Page } from "@playwright/test";

import { SEED_FILE, type SeedTenant } from "./global-setup";

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
  await fillFirst(
    scope,
    ["#state", 'input[autocomplete="shipping address-level1"]'],
    info.state,
  );
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
