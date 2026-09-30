import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";

import { resolveFields } from "..";

type Props = {
  /**
   * Passed by `DarkTrendCheckoutPage`'s guard, which already holds the
   * business. Omitted by `checkout/page.tsx`, which renders
   * `<t.CheckoutUnavailable />` with no props at all — see the note below.
   */
  customFields?: unknown;
};

/**
 * Checkout unavailable — rendered inside `DarkTrendLayout` (header, `<main>`,
 * footer) when the store hasn't connected online payments, so this is inner
 * content only.
 *
 * The route renders it with zero props, so when none are given the
 * component reads the tenant itself through the tRPC server caller purely
 * so the owner's own copy resolves. The `.catch` matters: if that read
 * fails for any reason, `resolveFields` substitutes the field defaults and
 * the shopper still gets a finished screen instead of a broken page.
 *
 * Visual language follows the rest of dark-trend: the `#1A1A1A` slab the
 * inline block this replaces used, and the violet button from the homepage
 * featured-product block.
 */
export async function DarkTrendCheckoutUnavailable({
  customFields,
}: Props = {}) {
  const resolved =
    customFields !== undefined
      ? customFields
      : ((await api.business.simplifiedGet().catch(() => null))?.siteContent
          ?.customFields ?? undefined);

  const f = resolveFields(resolved, [
    "dark-trend.checkout.unavailable-heading",
    "dark-trend.checkout.unavailable-body",
    "dark-trend.checkout.unavailable-cta",
  ]);

  const body = (f["dark-trend.checkout.unavailable-body"] ?? "").trim();
  const ctaText = (f["dark-trend.checkout.unavailable-cta"] ?? "").trim();

  return (
    <section
      {...sectionGroupAttr("checkout", "unavailable")}
      className="flex min-h-[50vh] flex-1 items-center justify-center bg-[#1A1A1A] px-4 py-24"
    >
      <div className="max-w-md text-center">
        <h1
          {...fieldAttr("dark-trend.checkout.unavailable-heading")}
          className="text-3xl font-bold tracking-tight text-white md:text-5xl"
        >
          {f["dark-trend.checkout.unavailable-heading"] ?? ""}
        </h1>

        {body ? (
          <p
            {...fieldAttr("dark-trend.checkout.unavailable-body")}
            className="mt-4 leading-relaxed whitespace-pre-line text-white/70"
          >
            {body}
          </p>
        ) : null}

        {ctaText ? (
          <Link
            href="/shop"
            className="group mt-8 inline-flex items-center gap-2 rounded-md bg-violet-600 px-6 py-3 text-sm font-bold tracking-wider text-white uppercase transition-colors hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1A1A] focus-visible:outline-none"
          >
            <span {...fieldAttr("dark-trend.checkout.unavailable-cta")}>
              {ctaText}
            </span>
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
