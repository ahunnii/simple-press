import Link from "next/link";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";

type Props = {
  /**
   * Passed by `PollenCheckoutPage`'s guard, which already holds the
   * business. Omitted by `checkout/page.tsx`, which renders
   * `<t.CheckoutUnavailable />` with no props at all — see the note below.
   */
  customFields?: unknown;
};

/**
 * Checkout unavailable — pollen's look (cream/forest palette, rounded-md
 * buttons) reusing the copy and layout of the dev-only "Checkout Unavailable"
 * screen this replaces (previously inlined in `pollen-checkout-page.tsx`).
 * Rendered inside `PollenLayout`, which already owns the skip link, header,
 * `<main>` and footer, so this is inner content only — `pt-24` clears the
 * fixed header the same way `PollenGeneralLayout` does.
 *
 * The route renders it with zero props, so when none are given the
 * component reads the tenant itself through the tRPC server caller purely so
 * the owner's own copy resolves. The `.catch` matters: if that read fails for
 * any reason, `resolveFields` substitutes the field defaults and the
 * shopper still gets a finished screen instead of a broken page.
 */
export async function PollenCheckoutUnavailable({
  customFields,
}: Props = {}) {
  const resolved =
    customFields !== undefined
      ? customFields
      : ((await api.business.simplifiedGet().catch(() => null))?.siteContent
          ?.customFields ?? undefined);

  const f = resolveFields(resolved, [
    "pollen.checkout.unavailable-heading",
    "pollen.checkout.unavailable-body",
    "pollen.checkout.unavailable-cta",
  ]);

  const body = f["pollen.checkout.unavailable-body"] ?? "";
  const ctaText = f["pollen.checkout.unavailable-cta"] ?? "";

  return (
    <PageTransition>
      <section
        className="flex min-h-[50vh] flex-col items-center justify-center px-4 pt-24 pb-16 text-center"
        {...sectionGroupAttr("checkout", "unavailable")}
      >
        <FadeIn direction="up" className="max-w-md">
          <h1
            {...fieldAttr("pollen.checkout.unavailable-heading")}
            className="text-2xl font-bold text-[#2a351f]"
          >
            {f["pollen.checkout.unavailable-heading"] ?? ""}
          </h1>

          {body ? (
            <p
              {...fieldAttr("pollen.checkout.unavailable-body")}
              className="mt-4 text-[#4c566a]"
            >
              {body}
            </p>
          ) : null}

          {ctaText ? (
            <Link
              href="/shop"
              className="mt-8 inline-block rounded-md bg-[#215935] px-6 py-2.5 font-semibold text-white hover:bg-[#1a4729]"
            >
              <span {...fieldAttr("pollen.checkout.unavailable-cta")}>
                {ctaText}
              </span>
            </Link>
          ) : null}
        </FadeIn>
      </section>
    </PageTransition>
  );
}
