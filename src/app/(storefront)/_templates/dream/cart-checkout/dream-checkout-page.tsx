import type { DefaultCheckoutPageTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamSection } from "../shared/dream-section";
import { DreamCheckoutForm } from "./dream-checkout-form";
import { DreamCheckoutUnavailable } from "./dream-checkout-unavailable";
import {
  resolveDreamCartCheckoutFields,
  resolveDreamCartCheckoutRequired,
} from "./index";

const FALLBACK_LOGO = "/templates/dream/images/logo.webp";

/**
 * `/checkout` — dream's interior sky hero, then the checkout form and
 * order summary inside the dream container (left edge = the header's,
 * B1.7). The body section never wraps the form in a reveal: a form must
 * never sit invisible waiting on a scroll observer.
 */
export async function DreamCheckoutPage({
  business,
  merchantPolicies,
}: DefaultCheckoutPageTemplateProps) {
  // Unreachable through `checkout/page.tsx`, which applies this exact guard
  // first and renders `t.CheckoutUnavailable` itself. Kept as a safety net
  // for any direct caller (Default does the same).
  if (!business.isStripeConnected && process.env.NODE_ENV !== "development") {
    return <DreamCheckoutUnavailable business={business} />;
  }

  const customFields = business.siteContent?.customFields;
  const f = {
    ...resolveDreamCartCheckoutFields(customFields, [
      "dream.checkout.hero-accent",
      "dream.checkout.hero-lede",
    ]),
    ...resolveDreamCartCheckoutRequired(customFields, [
      "dream.checkout.hero-heading",
    ]),
  };

  const logoUrl = business.siteContent?.logoUrl ?? FALLBACK_LOGO;
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    business.name ?? "",
  );

  return (
    <>
      <DreamPageHero
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        title={f["dream.checkout.hero-heading"] ?? ""}
        accent={f["dream.checkout.hero-accent"] ?? ""}
        lede={f["dream.checkout.hero-lede"] ?? ""}
        titleFieldKey="dream.checkout.hero-heading"
        accentFieldKey="dream.checkout.hero-accent"
        ledeFieldKey="dream.checkout.hero-lede"
        sectionAttrs={sectionGroupAttr("checkout", "hero")}
      />

      <DreamSection aria-label="Checkout" reveal={false}>
        <DreamCheckoutForm
          business={business}
          merchantPolicies={merchantPolicies}
        />
      </DreamSection>
    </>
  );
}
