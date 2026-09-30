import Link from "next/link";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";

type Props = {
  /**
   * Passed by `NoiseCheckoutPage`'s guard, which already holds the business.
   * Omitted by `checkout/page.tsx`, which renders `<t.CheckoutUnavailable />`
   * with no props at all — see the note below.
   */
  customFields?: unknown;
};

/**
 * Checkout unavailable — rendered inside `NoiseLayout` (which owns the skip
 * link, header, `<main>` and footer) when the store hasn't connected Stripe.
 * Same paper surface, mono small label and italic serif h1 as
 * `NoiseCheckoutPage`'s own header, and the same `vn-stamp` button as the
 * cart/checkout empty states.
 *
 * The route renders it with zero props, so when none are given the
 * component reads the tenant itself through the tRPC server caller purely
 * so the owner's own copy resolves. The `.catch` matters: if that read
 * fails for any reason, `resolveFields` substitutes the field defaults and
 * the shopper still gets a finished screen instead of a broken page.
 */
export async function NoiseCheckoutUnavailable({ customFields }: Props = {}) {
  const resolved =
    customFields !== undefined
      ? customFields
      : ((await api.business.simplifiedGet().catch(() => null))?.siteContent
          ?.customFields ?? undefined);

  const f = resolveFields(resolved, [
    "noise.checkout.unavailable-heading",
    "noise.checkout.unavailable-body",
    "noise.checkout.unavailable-cta",
  ]);

  const heading = f["noise.checkout.unavailable-heading"] ?? "";
  const body = f["noise.checkout.unavailable-body"] ?? "";
  const ctaText = f["noise.checkout.unavailable-cta"] ?? "";

  return (
    <PageTransition>
      <section
        className="border-foreground flex min-h-[60vh] flex-col items-center justify-center border-b-2 px-7 py-32 text-center"
        style={{ background: "var(--vn-paper)" }}
        {...sectionGroupAttr("checkout", "unavailable")}
      >
        <FadeIn
          direction="up"
          className="flex max-w-[34rem] flex-col items-center gap-6"
        >
          <p
            className="font-mono text-[10px] tracking-[0.28em] uppercase"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Checkout
          </p>
          <h1
            className="font-serif leading-none tracking-tight italic"
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              letterSpacing: "-0.025em",
            }}
            {...fieldAttr("noise.checkout.unavailable-heading")}
          >
            {heading}
          </h1>
          {body ? (
            <p
              className="max-w-[46ch] font-sans text-sm leading-relaxed"
              style={{ color: "var(--vn-steel-mist)" }}
              {...fieldAttr("noise.checkout.unavailable-body")}
            >
              {body}
            </p>
          ) : null}
          {ctaText ? (
            <Link
              href="/shop"
              className="vn-stamp vn-stamp-solid mt-2 text-[10.5px]"
            >
              <span {...fieldAttr("noise.checkout.unavailable-cta")}>
                {ctaText}
              </span>{" "}
              →
            </Link>
          ) : null}
        </FadeIn>
      </section>
    </PageTransition>
  );
}
