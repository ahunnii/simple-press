import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";

type Props = {
  /**
   * Passed by `HappyBambooCheckoutPage`'s guard, which already holds the
   * business. Omitted by `checkout/page.tsx`, which renders
   * `<t.CheckoutUnavailable />` with no props at all.
   */
  customFields?: unknown;
};

/**
 * Checkout unavailable — shown instead of the checkout form when the store
 * has no Stripe account. Rendered inside `HappyBambooLayout` (header, `<main>`,
 * footer), so this is inner content only.
 *
 * With no props the component reads the tenant itself through the tRPC server
 * caller so the owner's copy resolves. If that read fails, `resolveFields`
 * falls back to the field defaults and the shopper still gets a finished
 * screen.
 *
 * Layout follows the template's other operate-surface states (the empty
 * cart): centred icon disc, heading, muted body, primary button. The h1 uses
 * the same classes as `HappyBambooCheckoutPage`'s own "Checkout" heading.
 */
export async function HappyBambooCheckoutUnavailable({
  customFields,
}: Props = {}) {
  const resolved =
    customFields !== undefined
      ? customFields
      : ((await api.business.simplifiedGet().catch(() => null))?.siteContent
          ?.customFields ?? undefined);

  const f = resolveFields(resolved, [
    "happy-bamboo.checkout.unavailable-heading",
    "happy-bamboo.checkout.unavailable-body",
    "happy-bamboo.checkout.unavailable-cta",
  ]);

  const heading = f["happy-bamboo.checkout.unavailable-heading"] ?? "";
  const body = (f["happy-bamboo.checkout.unavailable-body"] ?? "").trim();
  const ctaText = (f["happy-bamboo.checkout.unavailable-cta"] ?? "").trim();

  return (
    <PageTransition>
      <section
        className="mx-auto flex min-h-[50vh] max-w-7xl flex-col items-center justify-center px-4 py-24 text-center lg:px-8"
        {...sectionGroupAttr("checkout", "unavailable")}
      >
        <FadeIn direction="up" className="max-w-md">
          <div className="bg-secondary mx-auto flex size-20 items-center justify-center rounded-full">
            <Leaf className="text-primary size-8" aria-hidden="true" />
          </div>
          <h1
            className="text-foreground mt-6 font-serif text-3xl font-bold tracking-tight md:text-4xl"
            {...fieldAttr("happy-bamboo.checkout.unavailable-heading")}
          >
            {heading}
          </h1>

          {body ? (
            <p
              className="text-muted-foreground mx-auto mt-3 max-w-md"
              {...fieldAttr("happy-bamboo.checkout.unavailable-body")}
            >
              {body}
            </p>
          ) : null}

          {ctaText ? (
            <Button className="group mt-8" size="lg" asChild>
              <Link href="/shop">
                <span {...fieldAttr("happy-bamboo.checkout.unavailable-cta")}>
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
