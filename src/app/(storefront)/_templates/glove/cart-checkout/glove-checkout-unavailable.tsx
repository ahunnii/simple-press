import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import { GloveButton } from "../shared/glove-button";
import { GloveHandIcon } from "../shared/glove-hand-icon";
import { GloveMistPanel } from "../shared/glove-mist-panel";
import { GloveSection } from "../shared/glove-section";
import { GLOVE_STEP_FIELD_LIST } from "./checkout-fields";
import { GloveCheckoutSteps } from "./glove-checkout-steps";

type Props = {
  /**
   * Passed by `GloveCheckoutPage`'s guard, which already holds the business.
   * Omitted by `checkout/page.tsx`, which renders `<t.CheckoutUnavailable />`
   * with no props at all; the component then reads the tenant itself.
   */
  customFields?: unknown;
};

/**
 * Checkout unavailable: shown instead of the form when the store has no
 * payment connection. Renders inside the template layout, so this is inner
 * content only: the shared progress band (step 2) over a designed mist panel
 * with the glove glyph, message, a shop button and a contact link. If the
 * tenant read fails, `resolveFields` falls back to the field defaults so the
 * shopper still gets a finished screen.
 */
export async function GloveCheckoutUnavailable({ customFields }: Props = {}) {
  const resolved =
    customFields !== undefined
      ? customFields
      : ((await api.business.simplifiedGet().catch(() => null))?.siteContent
          ?.customFields ?? undefined);

  const f = resolveFields(resolved, [
    ...GLOVE_STEP_FIELD_LIST,
    "glove.checkout.unavailable-heading",
    "glove.checkout.unavailable-body",
    "glove.checkout.unavailable-cta",
    "glove.checkout.unavailable-contact",
  ]);

  const heading = f["glove.checkout.unavailable-heading"] ?? "";
  const body = (f["glove.checkout.unavailable-body"] ?? "").trim();
  const ctaText = (f["glove.checkout.unavailable-cta"] ?? "").trim();
  const contactText = (f["glove.checkout.unavailable-contact"] ?? "").trim();

  return (
    <>
      <GloveCheckoutSteps
        current={2}
        labels={{
          cart: f["glove.checkout.step-cart"] ?? "",
          checkout: f["glove.checkout.step-checkout"] ?? "",
          complete: f["glove.checkout.step-complete"] ?? "",
        }}
      />
      <GloveSection
        sectionAttrs={sectionGroupAttr("checkout", "unavailable")}
        aria-labelledby="glove-unavailable-heading"
      >
        <GloveMistPanel className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-14 text-center md:px-12 md:py-20">
          <GloveHandIcon className="size-20 text-[var(--glove-primary)]" />
          <h1
            id="glove-unavailable-heading"
            className="glove-display text-[28px] leading-tight font-medium text-[var(--glove-ink)] md:text-[38px]"
            {...fieldAttr("glove.checkout.unavailable-heading")}
          >
            {heading}
          </h1>
          {body ? (
            <p
              className="max-w-md text-[16px] text-[var(--glove-text)]"
              {...fieldAttr("glove.checkout.unavailable-body")}
            >
              {body}
            </p>
          ) : null}
          {ctaText || contactText ? (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              {ctaText ? (
                <GloveButton href="/shop" variant="woo">
                  <span {...fieldAttr("glove.checkout.unavailable-cta")}>
                    {ctaText}
                  </span>
                </GloveButton>
              ) : null}
              {contactText ? (
                <GloveButton href="/contact" variant="wooOutline">
                  <span {...fieldAttr("glove.checkout.unavailable-contact")}>
                    {contactText}
                  </span>
                </GloveButton>
              ) : null}
            </div>
          ) : null}
        </GloveMistPanel>
      </GloveSection>
    </>
  );
}
