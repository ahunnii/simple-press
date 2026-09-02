import Link from "next/link";

import { cn } from "~/lib/utils";

import { BambooEdge } from "../shared/bamboo-edge";
import { BambooGlyph } from "../shared/bamboo-glyph";
import { BambooReveal } from "../shared/bamboo-reveal";

/**
 * BambooCheckoutUnavailable — rendered by `src/app/(storefront)/checkout/page.tsx`
 * as `<t.CheckoutUnavailable />` (NO props) when the store has not connected
 * Stripe. It renders *inside* `BambooLayout`, which already supplies the skip
 * link, header, `<main id="bamboo-main-content">` and footer — so this
 * component contributes inner content only, never a page shell.
 *
 * Messaging intent matches `DefaultCheckoutUnavailable`: this is a store
 * configuration problem, not a shopper mistake, and it must not dead-end.
 */
export function BambooCheckoutUnavailable() {
  // Fragment keeps the edge a direct sibling of the section under <main> (a
  // column flex container), so its mt-auto pins the edge to the bottom of
  // main.
  return (
    <>
      <section className="mx-auto flex min-h-[calc(100svh-var(--bamboo-header-offset))] w-full max-w-2xl flex-col justify-center px-4 pt-10 pb-[12vh] lg:px-8">
        <BambooReveal>
          <div className="bamboo-torn-card text-center">
            <BambooGlyph
              id="s-wreath"
              className="mx-auto mb-5 w-[76px] opacity-90"
            />
            <h1 className="font-heading text-[clamp(1.85rem,3.6vw,2.5rem)] leading-[1.1] font-bold tracking-tight text-[var(--bamboo-pine)]">
              Checkout unavailable
            </h1>
            <p className="mx-auto mt-4 max-w-md text-[1.02rem] leading-relaxed text-[var(--bamboo-ink-soft)]">
              This store can&apos;t take payments right now — payment processing
              hasn&apos;t been set up yet. Please contact the store owner, and
              everything you were looking at is still here when you come back.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/shop"
                className={cn("bamboo-btn", "bamboo-btn-primary")}
              >
                Keep browsing
              </Link>
              <Link href="/" className={cn("bamboo-btn", "bamboo-btn-ghost")}>
                Back to home
              </Link>
            </div>
          </div>
        </BambooReveal>
      </section>
      <BambooEdge from="paper" to="pine" variant="c" />
    </>
  );
}
