import type { DefaultCartPageTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { shippingConfigFromBusiness } from "~/lib/shipping-utils";

import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamSection } from "../shared/dream-section";
import { DreamCartContents } from "./dream-cart-contents";
import {
  resolveDreamCartCheckoutFields,
  resolveDreamCartCheckoutRequired,
} from "./index";

const FALLBACK_LOGO = "/templates/dream/images/logo.webp";

/** Never hide: blank falls back to the built-in default. */
const REQUIRED_KEYS = [
  "dream.cart.hero-heading",
  "dream.cart.summary-heading",
  "dream.cart.checkout-label",
  "dream.cart.empty-heading",
];

const FIELD_KEYS = [
  "dream.cart.hero-accent",
  "dream.cart.hero-lede",
  "dream.cart.summary-note",
  "dream.cart.continue-label",
  "dream.cart.empty-body",
  "dream.cart.empty-cta-label",
];

/**
 * `/cart` — dream's interior sky hero, then line items and a totals card
 * inside the dream container (left edge = the header's, B1.7). Copy
 * resolves here and crosses into the client contents as plain strings.
 *
 * No wrapper reveal on the body section: the cart renders after
 * localStorage hydration and must never sit invisible behind a reveal.
 */
export async function DreamCartPage({
  business,
}: DefaultCartPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = {
    ...resolveDreamCartCheckoutFields(customFields, FIELD_KEYS),
    ...resolveDreamCartCheckoutRequired(customFields, REQUIRED_KEYS),
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
        title={f["dream.cart.hero-heading"] ?? ""}
        accent={f["dream.cart.hero-accent"] ?? ""}
        lede={f["dream.cart.hero-lede"] ?? ""}
        titleFieldKey="dream.cart.hero-heading"
        accentFieldKey="dream.cart.hero-accent"
        ledeFieldKey="dream.cart.hero-lede"
        sectionAttrs={sectionGroupAttr("cart", "hero")}
      />

      <DreamSection aria-label="Cart" reveal={false}>
        <DreamCartContents
          shippingConfig={shippingConfigFromBusiness(business)}
          copy={{
            summaryHeading: f["dream.cart.summary-heading"] ?? "",
            summaryNote: f["dream.cart.summary-note"] ?? "",
            checkoutLabel: f["dream.cart.checkout-label"] ?? "",
            continueLabel: f["dream.cart.continue-label"] ?? "",
            emptyHeading: f["dream.cart.empty-heading"] ?? "",
            emptyBody: f["dream.cart.empty-body"] ?? "",
            emptyCtaLabel: f["dream.cart.empty-cta-label"] ?? "",
          }}
        />
      </DreamSection>
    </>
  );
}
