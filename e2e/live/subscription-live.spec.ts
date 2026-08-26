import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

import {
  baseUrlFor,
  fillSubscribeForm,
  getTenant,
  SAMPLE_CHECKOUT,
} from "../fixtures";

// REAL Stripe test-mode money path for the Subscribe (recurring) lane — the
// subscription-mode sibling of ../live/stripe-live.spec.ts's one-time
// checkout test. Nothing is intercepted: the app creates a real
// subscription-mode Checkout Session on the test connected account, we pay
// on the hosted checkout.stripe.com page with a test card, and the
// Subscription row + first Order are created asynchronously by the Stripe
// webhook's subscription branches (`checkout.session.completed` →
// `active`, then `invoice.paid` → the Order, both forwarded to localhost by
// `stripe listen` — see scripts/e2e-stripe.sh, which already forwards
// Connect events via `--forward-connect-to`, required here for the same
// reason as the one-time suite: this is a direct charge on the connected
// account).
//
// NOT run as part of this task (per the task's "Live (optional, user-run)"
// row) — needs real Stripe test keys the agent doesn't have. To run:
//
//   1. Create/reuse a gitignored .env.e2e.local with TEST credentials:
//        STRIPE_SECRET_KEY=sk_test_...
//        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
//        E2E_STRIPE_ACCOUNT_ID=acct_...   # charges-enabled TEST connected account
//   2. pnpm test:e2e:stripe
//      (scripts/e2e-stripe.sh boots the DB, seeds — e2e/seed.ts assigns
//      E2E_STRIPE_ACCOUNT_ID to the `default` tenant's stripeAccountId and
//      also seeds its subscription-enabled product, see e2e/seed.ts's
//      SUBSCRIPTION_TEMPLATE_IDS — captures the webhook secret, starts
//      `stripe listen`, and runs every spec under e2e/live/, including this
//      one and stripe-live.spec.ts.)
//   3. On the Stripe test connected account, no extra setup is required
//      beyond what stripe-live.spec.ts already needs
//      (Checkout + a card payment method) — subscriptions billed as direct
//      charges don't need a separate product/price in the Stripe dashboard;
//      `createSubscriptionCheckoutSession` builds `price_data` inline (see
//      the plan's "no Stripe Product/Price cache" decision).
//
// Unverified (sandbox QA item, same status as the plan's §16 risks): whether
// the hosted Checkout page's DOM differs at all between payment-mode and
// subscription-mode for a card payment (the `[data-testid="hosted-payment-
// submit-button"]` selector below is assumed stable across both — carried
// over unchanged from stripe-live.spec.ts, not independently confirmed).
test.skip(
  !process.env.E2E_STRIPE_ACCOUNT_ID,
  "real Stripe test mode not configured (E2E_STRIPE_ACCOUNT_ID unset)",
);

/**
 * Poll for the Subscription row (by Checkout Session id) once it reaches
 * `status: "active"`, AND the first `Order` the `invoice.paid` webhook
 * branch creates for it (`stripeInvoiceId` set) — see
 * e2e/find-subscription.ts. Returns null (not yet ready — caller retries)
 * rather than throwing, mirroring findOrder in stripe-live.spec.ts.
 */
function findSubscription(sessionId: string): {
  subscription: { id: string; status: string };
  order: { stripeInvoiceId: string | null; total: number };
} | null {
  try {
    const out = execFileSync(
      "pnpm",
      ["exec", "tsx", "e2e/find-subscription.ts", sessionId],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return JSON.parse(out) as {
      subscription: { id: string; status: string };
      order: { stripeInvoiceId: string | null; total: number };
    };
  } catch {
    return null; // not created/activated yet (exit 1) → caller retries
  }
}

test("default: real Stripe subscription checkout → active → webhook creates order", async ({
  page,
}) => {
  const tenant = getTenant("default");
  if (!tenant.subscriptionProductSlug) {
    throw new Error(
      "no seeded subscription product for default — check e2e/seed.ts's SUBSCRIPTION_TEMPLATE_IDS",
    );
  }
  const base = baseUrlFor(tenant);

  // Real UI: product page → Subscribe panel → /subscribe → fill + submit
  // (no stub — this hits the real create-session route).
  await page.goto(`${base}/shop/${tenant.subscriptionProductSlug}`);
  await page.getByRole("link", { name: "Subscribe", exact: true }).click();
  await expect(page).toHaveURL(/\/subscribe\?/);

  await fillSubscribeForm(page, SAMPLE_CHECKOUT);
  await expect(page.getByText(/calculating…/i)).toHaveCount(0);
  await page
    .getByRole("button", { name: /continue to secure checkout/i })
    .click();

  // Land on the real hosted Checkout page (subscription mode). Same brittle-
  // DOM caveats as stripe-live.spec.ts: several payment methods may be
  // offered, the seed's 555 phone is rejected, card fields only render after
  // picking Card.
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 45_000 });

  const cardRadio = page.getByRole("radio", { name: /^card$/i });
  if ((await cardRadio.count()) > 0) {
    await cardRadio
      .first()
      .click({ force: true })
      .catch(() => undefined);
  }

  const phone = page.getByRole("textbox", { name: /phone/i });
  if ((await phone.count()) > 0) {
    await phone
      .first()
      .fill("+14155550123")
      .catch(() => undefined);
  }

  const mainCard = page.getByRole("textbox", { name: /card number/i });
  await mainCard
    .first()
    .waitFor({ timeout: 20_000 })
    .catch(() => undefined);
  const cardScope =
    (await mainCard.count()) > 0
      ? page
      : page.frameLocator(
          'iframe[title*="card" i], iframe[name^="__privateStripeFrame"]',
        );
  await cardScope
    .getByRole("textbox", { name: /card number/i })
    .fill("4242 4242 4242 4242");
  await cardScope.getByRole("textbox", { name: /expir/i }).fill("12 / 34");
  await cardScope
    .getByRole("textbox", { name: /cvc|security code/i })
    .fill("123");

  await page.locator('[data-testid="hosted-payment-submit-button"]').click();

  // Redirect back to the storefront success page. Unlike the stubbed spec,
  // `pending_subscription_session` really is set (by the real create-session
  // route), so this renders the "You're subscribed!" detail card once the
  // webhook's checkout.session.completed handler has run — but that race is
  // exactly what the DB poll below is for, not this page render.
  await page.waitForURL(/\/subscribe\/success/, { timeout: 60_000 });

  const sessionId = new URL(page.url()).searchParams.get("session_id");
  expect(sessionId).toBeTruthy();

  // Two async webhook steps have to land: checkout.session.completed (→
  // Subscription.status "active") and invoice.paid (→ the first Order, with
  // stripeInvoiceId set). Poll until both are true.
  let result: ReturnType<typeof findSubscription> = null;
  await expect
    .poll(() => (result = findSubscription(sessionId!)) !== null, {
      timeout: 45_000,
      intervals: [1000, 2000, 3000, 5000],
    })
    .toBe(true);

  expect(result!.subscription.status).toBe("active");
  expect(result!.order.stripeInvoiceId).toBeTruthy();
  expect(result!.order.total).toBeGreaterThan(0);
});
