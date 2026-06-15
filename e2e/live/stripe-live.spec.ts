import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

import {
  baseUrlFor,
  fillCheckout,
  getTenant,
  SAMPLE_CHECKOUT,
} from "../fixtures";

// REAL Stripe test-mode money path. Unlike the stubbed suite, nothing is
// intercepted: the app creates a real Checkout Session on the test connected
// account, we pay on the hosted checkout.stripe.com page with a test card, and
// the order is created asynchronously by the Stripe webhook (forwarded to
// localhost by `stripe listen` via scripts/e2e-stripe.sh). Runs only when a test
// connected account is configured.
test.skip(
  !process.env.E2E_STRIPE_ACCOUNT_ID,
  "real Stripe test mode not configured (E2E_STRIPE_ACCOUNT_ID unset)",
);

/** Poll the webhook-created order by Stripe session id (via the tsx DB helper). */
function findOrder(
  sessionId: string,
): { paymentStatus: string; customerEmail: string; total: number } | null {
  try {
    const out = execFileSync(
      "pnpm",
      ["exec", "tsx", "e2e/find-order.ts", sessionId],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return JSON.parse(out) as {
      paymentStatus: string;
      customerEmail: string;
      total: number;
    };
  } catch {
    return null; // not created yet (exit 1) → caller retries
  }
}

test("default: real Stripe checkout → paid → webhook creates order", async ({
  page,
}) => {
  const tenant = getTenant("default");
  const base = baseUrlFor(tenant);

  // Real UI: product page → add to cart → checkout → submit (no stub).
  await page.goto(`${base}/shop/${tenant.productSlug}`);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("button", { name: "Added to bag" })).toBeVisible();

  await page.goto(`${base}/checkout`);
  await fillCheckout(page, SAMPLE_CHECKOUT);
  await page.getByRole("button", { name: /continue to payment/i }).click();

  // Land on the real hosted Checkout page. The DOM is external/brittle: it may
  // present several payment methods (card fields only render after picking Card),
  // accessible names rather than fixed ids, and rejects the seed's 555 phone.
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 45_000 });

  // Select the Card method if methods are offered as a list (the radio is hidden
  // behind a styled label → force-click), then wait for the card field to render.
  const cardRadio = page.getByRole("radio", { name: /^card$/i });
  if ((await cardRadio.count()) > 0) {
    await cardRadio.first().click({ force: true }).catch(() => undefined);
  }

  // Replace the prefilled phone (Stripe flags the seed's 555 number as invalid).
  const phone = page.getByRole("textbox", { name: /phone/i });
  if ((await phone.count()) > 0) {
    await phone.first().fill("+14155550123").catch(() => undefined);
  }

  // Card fields — same-origin in the main frame, else a Stripe Elements iframe.
  // Give them a beat to render after selecting the Card method.
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

  // The real submit (not the "Pay with card" accordion header) carries this testid.
  await page.locator('[data-testid="hosted-payment-submit-button"]').click();

  // Redirect back to the storefront success page.
  await page.waitForURL(/\/order\/success/, { timeout: 60_000 });
  await expect(page.getByText("Order Confirmed!")).toBeVisible();

  const sessionId = new URL(page.url()).searchParams.get("session_id");
  expect(sessionId).toBeTruthy();

  // The order is created by the webhook (1-5s). Poll the DB until it appears.
  let order: ReturnType<typeof findOrder> = null;
  await expect
    .poll(() => (order = findOrder(sessionId!)) !== null, {
      timeout: 30_000,
      intervals: [1000, 2000, 3000],
    })
    .toBe(true);

  expect(order!.paymentStatus).toBe("paid");
  expect(order!.customerEmail).toBe(SAMPLE_CHECKOUT.email);
  expect(order!.total).toBeGreaterThanOrEqual(2500);
});
