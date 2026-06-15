import { expect, test } from "@playwright/test";

import {
  baseUrlFor,
  fillCheckout,
  getTenant,
  SAMPLE_CHECKOUT,
  seedCart,
  stubStripe,
  SUBMIT_NAME,
} from "./fixtures";
import { TEMPLATES } from "./global-setup";

// The checkout/success flow is shared logic across all templates — only the
// rendering differs. So this is N render/wiring smokes of one flow: pre-seed the
// cart, land on /checkout, submit (Stripe stubbed), and confirm each template's
// success page renders. The `default` template's full UI path (incl. add-to-cart)
// is covered separately in purchase-flow.default.spec.ts.
for (const templateId of TEMPLATES) {
  test(`${templateId}: checkout form submits and renders order success`, async ({
    context,
    page,
  }) => {
    const tenant = getTenant(templateId);
    const base = baseUrlFor(tenant);

    await seedCart(context, tenant);
    await page.goto(`${base}/checkout`);

    // Scope field-filling to the visible checkout form (the one holding the
    // email field), so a stray duplicate (e.g. a hidden responsive copy or a
    // newsletter input elsewhere on the page) can't shadow our fields. The
    // submit button is resolved at page level because some templates (modern)
    // render it outside the <form>, associated via the `form` attribute.
    const form = page
      .locator("form")
      .filter({ has: page.locator('#email, input[type="email"]') })
      .filter({ visible: true })
      .first();
    const submit = page.getByRole("button", { name: SUBMIT_NAME });
    await expect(submit).toBeVisible();

    const stub = stubStripe(page, {
      sessionId: `cs_test_e2e_${templateId}`,
      customerEmail: SAMPLE_CHECKOUT.email,
    });

    await fillCheckout(form, SAMPLE_CHECKOUT);
    await submit.click();

    await expect(page).toHaveURL(/\/order\/success/);
    await expect(
      page.getByText(/order confirmed|order placed|thank you/i).first(),
    ).toBeVisible();

    // The submit really hit create-session with the seeded product.
    const body = stub.createSessionBody as {
      items: { productId: string }[];
    };
    expect(body.items[0]?.productId).toBe(tenant.productId);
  });
}
