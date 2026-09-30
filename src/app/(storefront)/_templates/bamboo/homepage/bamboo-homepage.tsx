import type { DefaultHomepageTemplateProps } from "../../types";
import {
  googleMapsUrls,
  resolveMapCoordinates,
} from "~/lib/address/coordinates";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { isPreviewRequest } from "~/lib/preview/preview-context";
import { resolvePopup } from "~/lib/site-banner/resolve";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  getListFieldValue,
  getRawCustomFieldString,
  parseTemplateIconListRows,
} from "~/lib/template-fields";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { DEFAULT_BAMBOO_VALUE_BAND } from ".";
import { computePrecedingTone } from "../shared/preceding-tone";
import { BambooAboutTeaserSection } from "./bamboo-about-teaser-section";
import { BambooFeaturedSection } from "./bamboo-featured-section";
import { BambooHeroSection } from "./bamboo-hero-section";
import { BambooLocationSection } from "./bamboo-location-section";
import { BambooPopup } from "./bamboo-popup";
import { BambooSustainabilitySection } from "./bamboo-sustainability-section";
import { BambooTestimonialsSection } from "./bamboo-testimonials-section";
import { BambooValueBandSection } from "./bamboo-value-band-section";

/**
 * Bamboo homepage — a thin orchestrator. It owns the data fetching and the
 * section visibility gates; every band's markup lives in its own file so the
 * page reads as the running order it renders.
 */
export async function BambooHomepage({
  business,
}: DefaultHomepageTemplateProps) {
  const [homepage, flags] = await Promise.all([
    api.business.getHomepage(),
    getBusinessFlags(),
  ]);
  const { isEnabled } = flags;

  // `getHomepage` doesn't select `popupConfig` — reuse the `business` prop
  // (already fetched by the root page with `siteContent.popupConfig` and
  // `featureFlags`, and already passed to every template's homepage
  // component) the same way `pollen-homepage.tsx` / `happy-bamboo-homepage.tsx`
  // resolve their popup, instead of adding a second business fetch here.
  const popup = resolvePopup(business?.siteContent, isEnabled("popups"));

  const testimonials = isEnabled("testimonials")
    ? await api.testimonial.listRandom({ limit: 3 })
    : [];

  const customFields = homepage?.siteContent?.customFields;
  const address = homepage?.businessAddress;

  // Map pin: Settings → General (Business.latitude/longitude) wins. The
  // legacy per-template fields are a read-only fallback for sites that saved
  // coordinates before the pin moved to Settings (retired 2026-09-25) — the
  // saved values are never written to or cleared from here.
  const coords = resolveMapCoordinates(
    homepage,
    getRawCustomFieldString(customFields, "bamboo.global.map-lat"),
    getRawCustomFieldString(customFields, "bamboo.global.map-lng"),
  );
  const hasCoords = coords !== null;
  // A blank (but present) address string must still fall through to coords —
  // `||`, not `??`, is deliberate here.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const mapDest = address || coords || { latitude: 0, longitude: 0 };
  const { viewUrl, directionsUrl } = googleMapsUrls(mapDest);
  const lat = coords?.latitude ?? 0;
  const lng = coords?.longitude ?? 0;

  // Mirrors the value band's own render gate exactly (same visibility flag +
  // same item-count check the band uses to bail to `null`) so the hero knows
  // — before the band ever renders — whether it needs to leave its bottom
  // seam open for the band's composited wave, or close its own seam because
  // nothing follows.
  const valueBandItems =
    parseTemplateIconListRows(
      getListFieldValue(customFields, "bamboo.homepage.value-band-items"),
      DEFAULT_BAMBOO_VALUE_BAND,
    ) ?? [];
  const hasValueBand =
    isSectionVisible(customFields, "bamboo", "homepage.valueBand") &&
    valueBandItems.length > 0;

  // Same idea for the sustainability band's bottom seam: its flipped bottom
  // wave composites 56/96px down over whatever follows, which is only safe
  // over a band padded `py-20 md:py-32`. When nothing follows, the footer
  // brings its own wave (the About CTA's contract) and the band skips it.
  const hasTestimonials =
    testimonials.length > 0 &&
    isSectionVisible(customFields, "bamboo", "homepage.testimonials");
  const hasLocation =
    hasCoords && isSectionVisible(customFields, "bamboo", "homepage.location");

  const hasAboutTeaser = isSectionVisible(
    customFields,
    "bamboo",
    "homepage.aboutTeaser",
  );

  // Featured also hides itself on the live storefront when the store has no
  // products (a public "No products found" placeholder reads as broken, not
  // "coming soon") — but stays rendered inside the editor preview so an
  // owner setting up a fresh store still has the section's hover/click
  // hotspot to find. See `bamboo-featured-section.tsx`'s own empty state.
  const isPreview = await isPreviewRequest();
  const hasProducts = (homepage?.products?.length ?? 0) > 0;
  const hasFeatured =
    isEnabled("products") &&
    isSectionVisible(customFields, "bamboo", "homepage.featured") &&
    (hasProducts || isPreview);

  // The sustainability band's top wave paints no backing color of its own
  // (docs/templates/bamboo/design.md "Sustainability band, both edges"), so
  // it needs to know what actually renders directly above it, nearest
  // section first: Featured (cream) -> aboutTeaser (cream-deep) -> value
  // band (forest) -> the hero's own bottom edge, which always fades back to
  // flat cream regardless of a background photo (signature moment #6).
  const sustainabilityPrecedingTone = computePrecedingTone(
    [
      { visible: hasFeatured, tone: "cream" },
      { visible: hasAboutTeaser, tone: "cream-deep" },
      { visible: hasValueBand, tone: "forest" },
    ],
    "cream",
  );

  return (
    <HydrateClient>
      <PageTransition>
        {popup && <BambooPopup popup={popup} />}

        <BambooHeroSection
          customFields={customFields}
          hasValueBand={hasValueBand}
          isEnabled={isEnabled}
        />

        {hasValueBand && <BambooValueBandSection customFields={customFields} />}

        {/* Order mirrors happy-bamboo: the about teaser sits between the hero
            band and the product grid, so the story lands before the shelf. */}
        {hasAboutTeaser && (
          <BambooAboutTeaserSection
            customFields={customFields}
            isEnabled={isEnabled}
          />
        )}

        {hasFeatured && (
          <BambooFeaturedSection
            customFields={customFields}
            products={homepage?.products ?? []}
            isEnabled={isEnabled}
          />
        )}

        {isSectionVisible(
          customFields,
          "bamboo",
          "homepage.sustainability",
        ) && (
          <BambooSustainabilitySection
            customFields={customFields}
            hasFollowingSection={hasTestimonials || hasLocation}
            precedingTone={sustainabilityPrecedingTone}
          />
        )}

        {hasTestimonials && (
          <BambooTestimonialsSection
            customFields={customFields}
            testimonials={testimonials}
            isEnabled={isEnabled}
          />
        )}

        {hasLocation && (
          <BambooLocationSection
            customFields={customFields}
            businessName={homepage?.name ?? ""}
            address={address ?? undefined}
            latitude={lat}
            longitude={lng}
            viewUrl={viewUrl}
            directionsUrl={directionsUrl}
          />
        )}
      </PageTransition>
    </HydrateClient>
  );
}
