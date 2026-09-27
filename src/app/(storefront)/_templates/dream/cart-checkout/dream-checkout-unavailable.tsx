import type { RouterOutputs } from "~/trpc/react";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";

import { DreamButton } from "../shared/dream-button";
import { DreamPageHero } from "../shared/dream-page-hero";
import { resolveDreamCheckoutUnavailableFields } from "./unavailable-fields";

type Business = NonNullable<RouterOutputs["business"]["simplifiedGet"]>;

type Props = {
  /**
   * Optional — `checkout/page.tsx` renders `<t.CheckoutUnavailable />` with
   * no props at all, so when omitted the component reads the tenant itself.
   */
  business?: Business | null;
};

const FALLBACK_LOGO = "/templates/dream/images/logo.webp";

/**
 * Checkout unavailable — rendered inside `DreamLayout` (skip link, header,
 * `<main>`, footer) when the store hasn't connected online payments. Uses
 * the interior-page hero (sky ambient, logo, h1, short message) so the
 * screen reads as a finished dream page rather than an error, with one ink
 * pill to the estimate request page.
 *
 * The self-fetch `.catch` matters: if the read fails, the field defaults
 * and the bundled logo still render a complete screen.
 */
export async function DreamCheckoutUnavailable({ business }: Props = {}) {
  const resolved =
    business !== undefined
      ? business
      : await api.business.simplifiedGet().catch(() => null);

  const f = resolveDreamCheckoutUnavailableFields(
    resolved?.siteContent?.customFields,
    [
      "dream.checkout.unavailable-heading",
      "dream.checkout.unavailable-body",
      "dream.checkout.unavailable-cta",
    ],
  );
  const heading = f["dream.checkout.unavailable-heading"] ?? "";
  const body = f["dream.checkout.unavailable-body"] ?? "";
  const ctaText = f["dream.checkout.unavailable-cta"] ?? "";

  const logoUrl = resolved?.siteContent?.logoUrl ?? FALLBACK_LOGO;
  const logoAlt = resolveLogoAlt(
    resolved?.siteContent?.logoAltText,
    resolved?.name ?? "",
  );

  return (
    <DreamPageHero
      logoUrl={logoUrl}
      logoAlt={logoAlt}
      title={heading}
      lede={body}
      titleFieldKey="dream.checkout.unavailable-heading"
      ledeFieldKey="dream.checkout.unavailable-body"
      sectionAttrs={sectionGroupAttr("checkout", "unavailable")}
      className="flex min-h-[60vh] flex-col justify-center"
    >
      {ctaText ? (
        <div className="mt-4">
          <DreamButton href="/contact">
            <span {...fieldAttr("dream.checkout.unavailable-cta")}>
              {ctaText}
            </span>
          </DreamButton>
        </div>
      ) : null}
    </DreamPageHero>
  );
}
