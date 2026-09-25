import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { DEFAULT_BAMBOO_VALUE_BAND } from ".";
import { resolveFields } from "..";
import { BambooAboutTeaserSection } from "./bamboo-about-teaser-section";
import { BambooFeaturedSection } from "./bamboo-featured-section";
import { BambooHeroSection } from "./bamboo-hero-section";
import { BambooLocationSection } from "./bamboo-location-section";
import { BambooSustainabilitySection } from "./bamboo-sustainability-section";
import { BambooTestimonialsSection } from "./bamboo-testimonials-section";
import { BambooValueBandSection } from "./bamboo-value-band-section";

/**
 * Bamboo homepage — a thin orchestrator. It owns the data fetching and the
 * section visibility gates; every band's markup lives in its own file so the
 * page reads as the running order it renders.
 */
export async function BambooHomepage() {
  const [homepage, flags] = await Promise.all([
    api.business.getHomepage(),
    getBusinessFlags(),
  ]);

  const testimonials = flags.isEnabled("testimonials")
    ? await api.testimonial.listRandom({ limit: 3 })
    : [];

  const customFields = homepage?.siteContent?.customFields;
  const address = homepage?.businessAddress;

  const f = resolveFields(customFields, [
    "bamboo.global.map-lat",
    "bamboo.global.map-lng",
  ]);

  const latRaw = f["bamboo.global.map-lat"]?.trim();
  const lngRaw = f["bamboo.global.map-lng"]?.trim();
  const lat = latRaw ? Number(latRaw) : NaN;
  const lng = lngRaw ? Number(lngRaw) : NaN;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const mapDest = address ? encodeURIComponent(address) : `${lat},${lng}`;
  const viewUrl = `https://www.google.com/maps/search/?api=1&query=${mapDest}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapDest}`;

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

  return (
    <HydrateClient>
      <PageTransition>
        <BambooHeroSection
          customFields={customFields}
          hasValueBand={hasValueBand}
        />

        {hasValueBand && <BambooValueBandSection customFields={customFields} />}

        {/* Order mirrors happy-bamboo: the about teaser sits between the hero
            band and the product grid, so the story lands before the shelf. */}
        <BambooAboutTeaserSection customFields={customFields} />

        <BambooFeaturedSection
          customFields={customFields}
          products={homepage?.products ?? []}
        />

        {isSectionVisible(
          customFields,
          "bamboo",
          "homepage.sustainability",
        ) && (
          <BambooSustainabilitySection
            customFields={customFields}
            hasFollowingSection={hasTestimonials || hasLocation}
          />
        )}

        {hasTestimonials && (
          <BambooTestimonialsSection
            customFields={customFields}
            testimonials={testimonials}
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
