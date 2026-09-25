import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";

type Props = {
  /**
   * Passed by `BambooCheckoutPage`'s guard, which already holds the
   * business. Omitted by `checkout/page.tsx`, which renders
   * `<t.CheckoutUnavailable />` with no props at all — see the note below.
   */
  customFields?: unknown;
};

/**
 * Checkout unavailable — design.md § Layout authority: Operate surfaces
 * (cart/checkout/account) stay hard-edged and businesslike, no wave
 * dividers. Rendered inside `BambooLayout`, which already owns the skip
 * link, header, `<main>` and footer, so this is inner content only.
 *
 * The route renders it with zero props, so when none are given the
 * component reads the tenant itself through the tRPC server caller purely
 * so the owner's own copy resolves. The `.catch` matters: if that read
 * fails for any reason, `resolveFields` substitutes the field defaults and
 * the shopper still gets a finished screen instead of a broken page.
 *
 * The full-bleed forest slab reuses the dark treatment the inline block
 * this replaces already established (nav bar, value band, footer all use
 * the same `--bam-forest` surface), sized and typed to the "state-consistent
 * typography" rule: the h1 matches `BambooCheckoutPage`'s own h1 exactly
 * (`font-serif text-3xl font-bold tracking-tight md:text-4xl`).
 */
export async function BambooCheckoutUnavailable({ customFields }: Props = {}) {
  const resolved =
    customFields !== undefined
      ? customFields
      : ((await api.business.simplifiedGet().catch(() => null))?.siteContent
          ?.customFields ?? undefined);

  const f = resolveFields(resolved, [
    "bamboo.checkout.unavailable-heading",
    "bamboo.checkout.unavailable-body",
    "bamboo.checkout.unavailable-cta",
  ]);

  const body = f["bamboo.checkout.unavailable-body"] ?? "";
  const ctaText = f["bamboo.checkout.unavailable-cta"] ?? "";

  return (
    <PageTransition>
      <section
        className="flex min-h-[50vh] flex-1 items-center justify-center bg-[var(--bam-forest)] p-4"
        {...sectionGroupAttr("checkout", "unavailable")}
      >
        <FadeIn direction="up" className="max-w-md text-center">
          <h1
            className="font-serif text-3xl font-bold tracking-tight text-[var(--bam-cream)] md:text-4xl"
            {...fieldAttr("bamboo.checkout.unavailable-heading")}
          >
            {f["bamboo.checkout.unavailable-heading"] ?? ""}
          </h1>

          {body ? (
            <p
              className="mt-4 text-[var(--bam-cream)]/70"
              {...fieldAttr("bamboo.checkout.unavailable-body")}
            >
              {body}
            </p>
          ) : null}

          {ctaText ? (
            <Button
              size="lg"
              asChild
              className="group mt-8 rounded-full bg-[var(--bam-cream)] text-[var(--bam-forest)] hover:bg-[var(--bam-cream-deep)]"
            >
              <Link href="/shop">
                <span {...fieldAttr("bamboo.checkout.unavailable-cta")}>
                  {ctaText}
                </span>
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </Button>
          ) : null}
        </FadeIn>
      </section>
    </PageTransition>
  );
}
