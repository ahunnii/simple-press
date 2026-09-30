import Link from "next/link";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import {
  SLEDGE_PAGE_CONTAINER,
  SLEDGE_PAGE_CONTENT_PADDING,
  SledgePageHeader,
} from "../shared/sledge-page-layout";

type Props = {
  /**
   * Optional — `checkout/page.tsx` renders `<t.CheckoutUnavailable />` with
   * no props at all, so when omitted the component reads the tenant itself.
   */
  customFields?: unknown;
};

/**
 * Checkout unavailable — rendered inside `SledgeLayout` when the store
 * hasn't connected online payments. Uses the same page header as the
 * checkout and cart pages (big uppercase title, soft intro line) with one
 * `sl-btn` back to the shop, so it reads as a finished sledge page rather
 * than an error.
 *
 * The self-fetch `.catch` matters: if the read fails, `resolveFields`
 * substitutes the field defaults and the shopper still gets a complete
 * screen.
 */
export async function SledgeCheckoutUnavailable({ customFields }: Props = {}) {
  const resolved =
    customFields !== undefined
      ? customFields
      : ((await api.business.simplifiedGet().catch(() => null))?.siteContent
          ?.customFields ?? undefined);

  const f = resolveFields(resolved, [
    "sledge.checkout.unavailable-heading",
    "sledge.checkout.unavailable-body",
    "sledge.checkout.unavailable-cta",
  ]);
  const heading = f["sledge.checkout.unavailable-heading"] ?? "";
  const body = (f["sledge.checkout.unavailable-body"] ?? "").trim();
  const ctaText = (f["sledge.checkout.unavailable-cta"] ?? "").trim();

  return (
    <PageTransition>
      <div
        {...sectionGroupAttr("checkout", "unavailable")}
        className="flex min-h-[50vh] flex-col"
      >
        <SledgePageHeader
          title={heading}
          intro={body}
          titleFieldKey="sledge.checkout.unavailable-heading"
          introFieldKey="sledge.checkout.unavailable-body"
        />
        {ctaText ? (
          <div
            className={cn(SLEDGE_PAGE_CONTAINER, SLEDGE_PAGE_CONTENT_PADDING)}
          >
            <Link href="/shop" className="sl-btn text-xs">
              <span {...fieldAttr("sledge.checkout.unavailable-cta")}>
                {ctaText}
              </span>{" "}
              →
            </Link>
          </div>
        ) : null}
      </div>
    </PageTransition>
  );
}
