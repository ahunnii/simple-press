import { Phone } from "lucide-react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import { UmscButton } from "../shared/umsc-button";

type Props = {
  /**
   * Passed by `UmscCheckoutPage`'s defensive guard, which already holds the
   * business. `checkout/page.tsx` itself renders `<t.CheckoutUnavailable />`
   * with zero props — when both are omitted the component reads the tenant
   * itself (same pattern as olive's/pink's equivalent) purely so the owner's
   * own copy and phone number resolve.
   */
  business?: { phoneNumber?: string | null } | null;
  customFields?: unknown;
};

/**
 * UmscCheckoutUnavailable — rendered inside `UmscLayout`, which already owns
 * the skip link, header, and footer, so this is inner content only. Cream
 * card on the paper ground, phone from `business.phoneNumber` (falls back to
 * fetching the tenant when no prop is given), a contact link, and a
 * back-to-shop gold pill.
 */
export async function UmscCheckoutUnavailable({
  business,
  customFields,
}: Props = {}) {
  const resolvedBusiness =
    business !== undefined
      ? business
      : await api.business.simplifiedGet().catch(() => null);

  const resolvedFields =
    customFields !== undefined
      ? customFields
      : ((
          resolvedBusiness as {
            siteContent?: { customFields?: unknown };
          } | null
        )?.siteContent?.customFields ?? undefined);

  const f = resolveFields(resolvedFields, [
    "umsc.checkout.unavailable-heading",
    "umsc.checkout.unavailable-body",
    "umsc.checkout.unavailable-cta",
  ]);

  const phone = resolvedBusiness?.phoneNumber?.trim();

  return (
    <div
      className="flex flex-1 items-center justify-center px-6 py-24 sm:px-8"
      {...sectionGroupAttr("checkout", "main")}
    >
      <div className="w-full max-w-[480px] border border-[var(--umsc-line)] bg-[var(--umsc-cream)] p-8 text-center sm:p-10">
        <h1
          {...fieldAttr("umsc.checkout.unavailable-heading")}
          className="umsc-serif text-[clamp(26px,3.4vw,34px)] font-normal text-[var(--umsc-ink)]"
        >
          {f["umsc.checkout.unavailable-heading"] ?? ""}
        </h1>

        <p
          {...fieldAttr("umsc.checkout.unavailable-body")}
          className="umsc-sans mx-auto mt-4 max-w-[42ch] text-[15px] leading-[1.6] text-[var(--umsc-muted)]"
        >
          {f["umsc.checkout.unavailable-body"] ?? ""}
        </p>

        {phone && (
          <a
            href={`tel:${phone.replace(/[^\d+]/g, "")}`}
            className="umsc-sans mt-5 inline-flex items-center gap-2 text-[15px] font-medium text-[var(--umsc-gold-ink)]"
          >
            <Phone aria-hidden="true" className="size-4" />
            {phone}
          </a>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <UmscButton
            as="link"
            href="/shop"
            variant="gold"
            showArrow={false}
            fieldKey="umsc.checkout.unavailable-cta"
          >
            {f["umsc.checkout.unavailable-cta"] ?? ""}
          </UmscButton>
          <UmscButton as="link" href="/contact" variant="link">
            Contact us
          </UmscButton>
        </div>
      </div>
    </div>
  );
}
