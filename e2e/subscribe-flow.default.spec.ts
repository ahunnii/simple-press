import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

import {
  baseUrlFor,
  fillSubscribeForm,
  getTenant,
  SAMPLE_CHECKOUT,
  stubStripeSubscription,
} from "./fixtures";

// Coverage for the Subscribe lane (docs/../plan "Product Subscriptions" —
// see the plan doc referenced in the task): product-page panel → /subscribe
// checkout-prep form → (stubbed) Stripe redirect → /subscribe/success, plus
// the email-lookup manage entry point and a flag-off negative case. This is
// a *parallel* suite to purchase-flow.default.spec.ts /
// checkout.cross-template.spec.ts — it never touches the one-time
// create-session route or its stub, and the `default` tenant's plain
// (non-subscription) product used by those specs is untouched here too.
//
// Seeded by e2e/seed.ts: the `default` and `happy-bamboo` e2e tenants get
// the `subscriptions` flag turned on plus a second, subscription-enabled
// product (`tenant.subscriptionProductSlug`) alongside the always-present
// plain one (`tenant.productSlug`) — see SeedTenant's doc comment in
// e2e/global-setup.ts.
const TEMPLATE = "default";

test.describe("subscribe flow (default template)", () => {
  test("a product without subscriptions shows no Subscribe panel", async ({
    page,
  }) => {
    const tenant = getTenant(TEMPLATE);
    const base = baseUrlFor(tenant);

    await page.goto(`${base}/shop/${tenant.productSlug}`);
    await expect(
      page.getByRole("button", { name: "Add to cart" }),
    ).toBeVisible();

    await expect(page.getByText(/subscribe & save/i)).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Subscribe", exact: true }),
    ).toHaveCount(0);
  });

  test("subscription product shows the panel; picking week:2 lands on /subscribe", async ({
    page,
  }) => {
    const tenant = getTenant(TEMPLATE);
    if (!tenant.subscriptionProductSlug) {
      throw new Error(`no seeded subscription product for ${TEMPLATE}`);
    }
    const base = baseUrlFor(tenant);

    await page.goto(`${base}/shop/${tenant.subscriptionProductSlug}`);

    await expect(page.getByText("Subscribe & save 10%")).toBeVisible();
    // The two configured cadences (see SUBSCRIPTION_PRODUCT_INTERVALS in
    // e2e/seed.ts), rendered as their catalog shortLabels.
    await expect(page.getByText("Monthly", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Every 2 weeks", { exact: true }).first(),
    ).toBeVisible();

    // Choosing the cadence toggles the radio via the wrapping <label>.
    await page.getByText("Every 2 weeks", { exact: true }).first().click();
    await page.getByRole("link", { name: "Subscribe", exact: true }).click();

    await expect(page).toHaveURL(/\/subscribe\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get("product")).toBe(
      tenant.subscriptionProductSlug,
    );
    expect(url.searchParams.get("interval")).toBe("week:2");
  });

  test("fill + submit the subscribe form → success page (generic thank-you)", async ({
    page,
  }) => {
    const tenant = getTenant(TEMPLATE);
    if (!tenant.subscriptionProductSlug) {
      throw new Error(`no seeded subscription product for ${TEMPLATE}`);
    }
    const base = baseUrlFor(tenant);

    const stub = stubStripeSubscription(page, {
      sessionId: "cs_test_e2e_subscribe_default",
      customerEmail: SAMPLE_CHECKOUT.email,
    });

    await page.goto(
      `${base}/subscribe?product=${tenant.subscriptionProductSlug}&variant=&interval=week%3A2&qty=1`,
    );
    await expect(
      page.getByRole("heading", { name: tenant.subscriptionProductName }),
    ).toBeVisible();

    await fillSubscribeForm(page, SAMPLE_CHECKOUT);

    // The store's shippingType is the schema default "free", so the live
    // shipping quote resolves immediately without waiting on an address —
    // still, don't read the summary while it's mid-flight.
    await expect(page.getByText(/calculating…/i)).toHaveCount(0);

    await expect(page.getByText("Per-delivery total")).toBeVisible();
    await expect(page.getByText(/every 2 weeks/i).first()).toBeVisible();

    await page
      .getByRole("button", { name: /continue to secure checkout/i })
      .click();

    await expect(page).toHaveURL(/\/subscribe\/success/);
    await expect(page.getByRole("heading", { name: "Thanks!" })).toBeVisible();

    // The app posted the real form fields — price/discount/shipping are never
    // in this body (server-derived), only ids/cadence/quantity/contact.
    const body = stub.createSessionBody as {
      productId: string;
      intervalKey: string;
      quantity: number;
      deliveryMethod: string;
      customerInfo: {
        email: string;
        name: string;
        phone: string;
        shippingAddress: Record<string, unknown>;
      };
    };
    expect(body.productId).toBe(tenant.subscriptionProductId);
    expect(body.intervalKey).toBe("week:2");
    expect(body.quantity).toBe(1);
    expect(body.deliveryMethod).toBe("ship");
    expect(body.customerInfo.email).toBe(SAMPLE_CHECKOUT.email);
    expect(body.customerInfo.name).toBe(SAMPLE_CHECKOUT.name);
    expect(body.customerInfo.phone).toBe(SAMPLE_CHECKOUT.phone);
    expect(body.customerInfo.shippingAddress).toMatchObject({
      line1: SAMPLE_CHECKOUT.line1,
      city: SAMPLE_CHECKOUT.city,
      state: SAMPLE_CHECKOUT.state,
      postalCode: SAMPLE_CHECKOUT.postal,
      country: "US",
    });
  });

  test("/subscriptions/manage renders the lookup form and shows the opaque confirmation", async ({
    page,
  }) => {
    const tenant = getTenant(TEMPLATE);
    const base = baseUrlFor(tenant);

    await page.goto(`${base}/subscriptions/manage`);
    await expect(
      page.getByRole("heading", { name: /manage your subscription/i }),
    ).toBeVisible();

    await page.getByLabel(/email address/i).fill(SAMPLE_CHECKOUT.email);
    await page
      .getByRole("button", { name: /email me my subscription links/i })
      .click();

    // Deliberately opaque — same "check your email" copy whether or not the
    // address has any subscriptions on this store (subscription.ts router,
    // requestManageLinks).
    await expect(page.getByRole("status")).toContainText(/check your email/i);
  });
});

// happy-bamboo variant of the panel → /subscribe navigation above, cheap
// because it's the exact same shared SubscribePanel/subscribe-form
// components — only the product-page chrome around them differs.
test("happy-bamboo: subscription product shows the panel and links to /subscribe", async ({
  page,
}) => {
  const tenant = getTenant("happy-bamboo");
  if (!tenant.subscriptionProductSlug) {
    throw new Error("no seeded subscription product for happy-bamboo");
  }
  const base = baseUrlFor(tenant);

  await page.goto(`${base}/shop/${tenant.subscriptionProductSlug}`);

  await expect(page.getByText("Subscribe & save 10%")).toBeVisible();
  await page.getByRole("link", { name: "Subscribe", exact: true }).click();

  await expect(page).toHaveURL(/\/subscribe\?/);
  const url = new URL(page.url());
  expect(url.searchParams.get("product")).toBe(tenant.subscriptionProductSlug);
});

// Flag-off negative case. There's no existing spec that mutates seeded state
// mid-suite (every other spec only reads the seed via getTenant), so this
// establishes the pattern via a tiny tsx script in the same spirit as
// e2e/find-order.ts — see e2e/set-feature-flag.ts's doc comment. Isolated in
// its own describe so the beforeAll/afterAll pair only brackets this one
// test; run with `--workers=1` (see docs/testing.md) this can never overlap
// another test touching the same tenant.
test.describe("subscribe flow — subscriptions flag off", () => {
  const tenant = getTenant(TEMPLATE);

  test.beforeAll(() => {
    execFileSync(
      "pnpm",
      [
        "exec",
        "tsx",
        "e2e/set-feature-flag.ts",
        tenant.subdomain,
        "subscriptions",
        "false",
      ],
      { stdio: "inherit" },
    );
  });

  test.afterAll(() => {
    execFileSync(
      "pnpm",
      [
        "exec",
        "tsx",
        "e2e/set-feature-flag.ts",
        tenant.subdomain,
        "subscriptions",
        "true",
      ],
      { stdio: "inherit" },
    );
  });

  test("product page shows no panel and /subscribe 404s", async ({ page }) => {
    if (!tenant.subscriptionProductSlug) {
      throw new Error(`no seeded subscription product for ${TEMPLATE}`);
    }
    const base = baseUrlFor(tenant);

    await page.goto(`${base}/shop/${tenant.subscriptionProductSlug}`);
    await expect(page.getByText(/subscribe & save/i)).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Subscribe", exact: true }),
    ).toHaveCount(0);

    const response = await page.goto(
      `${base}/subscribe?product=${tenant.subscriptionProductSlug}&interval=month:1&qty=1`,
    );
    expect(response?.status()).toBe(404);
  });
});
