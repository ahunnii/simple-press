import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { isSectionVisible } from "~/lib/sp-meta";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

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

  return (
    <HydrateClient>
      <PageTransition>
        <BambooHeroSection customFields={customFields} />

        {isSectionVisible(customFields, "bamboo", "homepage.valueBand") && (
          <BambooValueBandSection customFields={customFields} />
        )}

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
        ) && <BambooSustainabilitySection customFields={customFields} />}

        {testimonials.length > 0 &&
          isSectionVisible(customFields, "bamboo", "homepage.testimonials") && (
            <BambooTestimonialsSection
              customFields={customFields}
              testimonials={testimonials}
            />
          )}

        {hasCoords &&
          isSectionVisible(customFields, "bamboo", "homepage.location") && (
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
