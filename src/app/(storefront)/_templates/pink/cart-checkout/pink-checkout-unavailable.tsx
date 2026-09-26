import Link from "next/link";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import { PinkPageHeader } from "../shared/pink-page-header";

const FALLBACK_HEADING = "Checkout is closed right now";
const FALLBACK_BODY =
  "We're not able to take payments at the moment. Get in touch and we'll sort it out with you directly.";
const FALLBACK_CTA = "Back to shop";

/**
 * Checkout-unavailable — design.md → "Checkout unavailable [extrapolated]":
 * reuses `PinkPageHeader` (dark) for the heading + intro, then a centered
 * paper CTA panel below, echoing `PinkEmptyState`'s visual weight.
 *
 * Rendered by `checkout/page.tsx` as `<t.CheckoutUnavailable />` with
 * **zero props** (the route already knows Stripe isn't connected), so this
 * is the one component in this build that self-fetches the tenant via the
 * tRPC server caller — the same pattern several templates' footer/homepage
 * components already use to read business data outside the normal prop
 * chain — purely so the owner's field copy can still be resolved.
 *
 * `checkout.unavailable` is not hideable: this component IS the whole page
 * when Stripe isn't connected, so hiding it would strand every shopper who
 * lands on an unconfigured store's checkout.
 */
export async function PinkCheckoutUnavailable() {
  const business = await api.business.simplifiedGet().catch(() => null);
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "pink.checkout.unavailable-heading",
    "pink.checkout.unavailable-body",
    "pink.checkout.unavailable-cta",
  ]);

  const heading = f["pink.checkout.unavailable-heading"] ?? FALLBACK_HEADING;
  const body = f["pink.checkout.unavailable-body"] ?? FALLBACK_BODY;
  const cta = f["pink.checkout.unavailable-cta"] ?? FALLBACK_CTA;

  return (
    <div {...sectionGroupAttr("checkout", "unavailable")}>
      <PinkPageHeader
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Checkout" }]}
        heading={heading}
        headingFieldKey="pink.checkout.unavailable-heading"
        intro={body}
        introFieldKey="pink.checkout.unavailable-body"
      />
      <div className="flex justify-center px-5 py-16 md:px-10">
        <div
          className="flex max-w-[420px] flex-col items-center p-10 text-center"
          style={{
            background: "var(--pink-panel)",
            border: "1px solid var(--pink-line)",
          }}
        >
          <Link
            href="/shop"
            className="pink-btn pink-btn-solid"
            {...fieldAttr("pink.checkout.unavailable-cta")}
          >
            {cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
