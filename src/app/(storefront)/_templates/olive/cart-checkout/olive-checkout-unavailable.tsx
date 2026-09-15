import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import {
  OliveButton,
  OliveLeafMark,
  OliveReveal,
  OliveSection,
} from "../shared";

type Props = {
  /**
   * Passed by `OliveCheckoutPage`'s defensive guard, which already holds the
   * business. Omitted by `checkout/page.tsx`, which renders
   * `<t.CheckoutUnavailable />` with no props at all — see the note below.
   */
  customFields?: unknown;
};

/**
 * Checkout unavailable — design.md → "checkout.unavailable". Rendered inside
 * `OliveLayout`, which already owns the skip link, header, `<main>` and
 * footer, so this is inner content only and carries the page's single `h1`.
 *
 * The route renders it with zero props, so when none are given the component
 * reads the tenant itself through the tRPC server caller (the same pattern
 * pink's equivalent uses) purely so the owner's own copy resolves. The
 * `.catch` matters: if that read fails for any reason, `resolveFields`
 * substitutes the field defaults and the shopper still gets a finished card
 * instead of a broken page.
 *
 * The shape is the ghost card — the template's one way of drawing an absence
 * on purpose. An unconfigured checkout is exactly that.
 */
export async function OliveCheckoutUnavailable({ customFields }: Props = {}) {
  const resolved =
    customFields !== undefined
      ? customFields
      : ((await api.business.simplifiedGet().catch(() => null))?.siteContent
          ?.customFields ?? undefined);

  const f = resolveFields(resolved, [
    "olive.checkout.unavailable-heading",
    "olive.checkout.unavailable-body",
    "olive.checkout.unavailable-cta",
  ]);

  const body = f["olive.checkout.unavailable-body"] ?? "";

  return (
    <OliveSection
      bleed
      tone="paper"
      aria-labelledby="olive-checkout-unavailable-heading"
      {...sectionGroupAttr("checkout", "unavailable")}
    >
      <OliveReveal className="mx-auto w-full max-w-[36rem]">
        <div className="olive-ghost-card">
          <span
            className="flex items-center"
            style={{ color: "var(--olive-leaf)" }}
          >
            <OliveLeafMark size={22} />
          </span>

          <h1
            id="olive-checkout-unavailable-heading"
            className="olive-h1"
            {...fieldAttr("olive.checkout.unavailable-heading")}
          >
            {f["olive.checkout.unavailable-heading"] ?? ""}
          </h1>

          {body ? (
            <p
              className="max-w-[46ch] text-[0.9375rem] leading-relaxed"
              style={{ color: "var(--olive-ink-soft)" }}
              {...fieldAttr("olive.checkout.unavailable-body")}
            >
              {body}
            </p>
          ) : null}

          <OliveButton
            variant="secondary"
            href="/shop"
            className="mt-1"
            data-sp-field="olive.checkout.unavailable-cta"
          >
            {f["olive.checkout.unavailable-cta"] ?? ""}
          </OliveButton>
        </div>
      </OliveReveal>
    </OliveSection>
  );
}
