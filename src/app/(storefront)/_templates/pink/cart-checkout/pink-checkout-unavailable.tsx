import Link from "next/link";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
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
 * `checkout.unavailable` is hideable per the assignment. Since this
 * component IS the entire page's content when Stripe isn't connected,
 * hiding it can't mean "render nothing" (a blank page would strand every
 * shopper who lands on an unconfigured store's checkout) — "hidden" here
 * means "use the built-in fallback copy instead of the owner's", not "show
 * nothing". The section root is still gated so the hide toggle in the
 * platform-admin advanced editor does something observable.
 */
export async function PinkCheckoutUnavailable() {
  const business = await api.business.simplifiedGet().catch(() => null);
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const visible = isSectionVisible(customFields, "pink", "checkout.unavailable");

  const f = visible
    ? resolveFields(customFields, [
        "pink.checkout.unavailable-heading",
        "pink.checkout.unavailable-body",
        "pink.checkout.unavailable-cta",
      ])
    : {};

  const heading = visible
    ? (f["pink.checkout.unavailable-heading"] ?? FALLBACK_HEADING)
    : FALLBACK_HEADING;
  const body = visible
    ? (f["pink.checkout.unavailable-body"] ?? FALLBACK_BODY)
    : FALLBACK_BODY;
  const cta = visible
    ? (f["pink.checkout.unavailable-cta"] ?? FALLBACK_CTA)
    : FALLBACK_CTA;

  return (
    <div {...sectionGroupAttr("checkout", "unavailable")}>
      <PinkPageHeader
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Checkout" }]}
        heading={heading}
        headingFieldKey={visible ? "pink.checkout.unavailable-heading" : undefined}
        intro={body}
        introFieldKey={visible ? "pink.checkout.unavailable-body" : undefined}
      />
      <div className="flex justify-center px-5 py-16 md:px-10">
        <div
          className="flex max-w-[420px] flex-col items-center p-10 text-center"
          style={{ background: "var(--pink-panel)", border: "1px solid var(--pink-line)" }}
        >
          <Link
            href="/shop"
            className="pink-btn pink-btn-solid"
            {...(visible ? fieldAttr("pink.checkout.unavailable-cta") : {})}
          >
            {cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
