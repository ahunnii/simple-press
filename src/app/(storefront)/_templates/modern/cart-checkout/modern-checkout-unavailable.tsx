import Link from "next/link";
import { ArrowRight, CreditCard } from "lucide-react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";

import { resolveFields } from "..";

type Props = {
  /**
   * Optional pre-loaded `siteContent.customFields`. Omitted by
   * `checkout/page.tsx`, which renders `<t.CheckoutUnavailable />` with no
   * props at all — see the note below.
   */
  customFields?: unknown;
};

/**
 * Checkout unavailable — shown instead of checkout when the store hasn't
 * connected online payments. Rendered inside `ModernLayout` (header, main,
 * footer), so this is inner content only, laid out like modern's cart and
 * checkout pages: a bordered title band, then a centered message block in
 * the same style as the empty cart.
 *
 * The route renders it with zero props, so when none are given the
 * component reads the tenant itself through the tRPC server caller purely
 * so the owner's own copy resolves. If that read fails, `resolveFields`
 * falls back to the field defaults and the shopper still gets a finished
 * screen.
 */
export async function ModernCheckoutUnavailable({ customFields }: Props = {}) {
  const resolved =
    customFields !== undefined
      ? customFields
      : ((await api.business.simplifiedGet().catch(() => null))?.siteContent
          ?.customFields ?? undefined);

  const f = resolveFields(resolved, [
    "modern.checkout.unavailable-heading",
    "modern.checkout.unavailable-body",
    "modern.checkout.unavailable-cta",
    "modern.checkout.unavailable-cta-link",
  ]);

  const heading = f["modern.checkout.unavailable-heading"] ?? "";
  const body = (f["modern.checkout.unavailable-body"] ?? "").trim();
  const ctaText = (f["modern.checkout.unavailable-cta"] ?? "").trim();
  const ctaLink = (f["modern.checkout.unavailable-cta-link"] ?? "").trim();

  return (
    <div
      className="bg-background"
      {...sectionGroupAttr("checkout", "unavailable")}
    >
      <div className="border-border border-b">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <h1
            {...fieldAttr("modern.checkout.unavailable-heading")}
            className="text-foreground font-serif text-4xl md:text-5xl"
          >
            {heading}
          </h1>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-md py-20 text-center">
          <CreditCard
            aria-hidden="true"
            className="text-muted-foreground/40 mx-auto h-12 w-12"
          />
          {body ? (
            <p
              {...fieldAttr("modern.checkout.unavailable-body")}
              className="text-muted-foreground mt-6 text-sm leading-relaxed whitespace-pre-line"
            >
              {body}
            </p>
          ) : null}
          {ctaText ? (
            <Link
              href={ctaLink.length > 0 ? ctaLink : "/shop"}
              className="bg-primary text-primary-foreground mt-8 inline-flex items-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
            >
              <span {...fieldAttr("modern.checkout.unavailable-cta")}>
                {ctaText}
              </span>
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
