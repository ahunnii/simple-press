import { api } from "~/trpc/server";

import { ElegantCTABanner } from "./elegant-cta-banner";
import { ElegantFeatureSection } from "./elegant-feature-section";
import { ElegantFooter } from "./elegant-footer";
import { ElegantHeader } from "./elegant-header";
import { ElegantHero } from "./elegant-hero";
import { ElegantNewsletter } from "./elegant-newsletter";
import { ElegantProductGrid } from "./elegant-product-grid";
import { ElegantTestimonials } from "./elegant-testimonials";
import { ElegantTrustBadges } from "./elegant-trust-badges";

export async function ElegantHomePage() {
  const homepage = await api.business.getHomepage();
  return (
    <>
      {/* <ElegantHeader /> */}
      <ElegantHero homepage={homepage} />
      {/* <ElegantTrustBadges /> */}
      <ElegantProductGrid homepage={homepage} />
      <ElegantFeatureSection homepage={homepage} />
      {/* <ElegantTestimonials /> */}
      {/* <ElegantCTABanner /> */}
      {/* <ElegantNewsletter /> */}
      {/* <ElegantFooter /> */}
    </>
  );
}
