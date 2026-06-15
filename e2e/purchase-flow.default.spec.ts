import { expect, test } from "@playwright/test";

import {
  baseUrlFor,
  fillCheckout,
  getTenant,
  SAMPLE_CHECKOUT,
  stubStripe,
  SUBMIT_NAME,
} from "./fixtures";

// Full happy path on the `default` template, driven entirely through the real
// browser UI: product page → add to cart → checkout form → (stubbed) Stripe
// redirect → order-success render. This exercises the app-owned glue that only
// exists live — add-to-cart, localStorage cart hydration, the create-session
// round-trip, the redirect, and the success page reading session_id.
test("default: add to cart → checkout → order success", async ({ page }) => {
  const tenant = getTenant("default");
  const base = baseUrlFor(tenant);

  // Product page → add to cart.
  await page.goto(`${base}/shop/${tenant.productSlug}`);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("button", { name: "Added to bag" })).toBeVisible();

  // Cart persists in localStorage; land on checkout with a hydrated cart.
  await page.goto(`${base}/checkout`);
  await expect(
    page.getByRole("button", { name: SUBMIT_NAME }),
  ).toBeVisible();

  const stub = stubStripe(page, {
    sessionId: "cs_test_e2e_default",
    customerEmail: SAMPLE_CHECKOUT.email,
  });

  await fillCheckout(page, SAMPLE_CHECKOUT);
  await page.getByRole("button", { name: SUBMIT_NAME }).click();

  // Redirected (in-app, via stubbed relative sessionUrl) to the success page.
  await expect(page).toHaveURL(/\/order\/success/);
  await expect(page.getByText("Order Confirmed!")).toBeVisible();
  await expect(page.getByText(SAMPLE_CHECKOUT.email)).toBeVisible();

  // The app POSTed the real cart + contact info to create-session.
  const body = stub.createSessionBody as {
    items: { productId: string }[];
    customerInfo: { email: string };
  };
  expect(body.items[0]?.productId).toBe(tenant.productId);
  expect(body.customerInfo.email).toBe(SAMPLE_CHECKOUT.email);
});
