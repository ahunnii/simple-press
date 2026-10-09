import type { DefaultHomepageTemplateProps } from "../../types";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolvePopup } from "~/lib/site-banner/resolve";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  getListFieldValue,
  parseTemplateIconListRows,
  parseTemplateImageListRows,
} from "~/lib/template-fields";
import { api } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import {
  DEFAULT_POLLEN_GALLERY_ITEMS,
  DEFAULT_POLLEN_HOMEPAGE_SERVICES,
} from ".";
import { resolveFields } from "..";
import { PollenCallToAction } from "../shared/pollen-cta";
import { PollenHomepageAbout } from "./pollen-homepage-about";
import { PollenHomepageGallery } from "./pollen-homepage-gallery";
import { PollenHero } from "./pollen-homepage-hero";
import { PollenPopup } from "./pollen-popup";

export async function PollenHomepage({
  business,
}: DefaultHomepageTemplateProps) {
  const homepage = await api.business.getHomepage();
  const customFields = homepage?.siteContent?.customFields;

  // `getHomepage` doesn't select `popupConfig` — reuse the `business` prop
  // (already fetched by the root page with `siteContent.popupConfig` and
  // `featureFlags`) the same way the default template's homepage resolves
  // its popup, instead of adding a second business fetch here.
  const { isEnabled } = resolveFlags(business?.featureFlags);
  const popup = resolvePopup(business?.siteContent, isEnabled);

  const f = resolveFields(customFields, [
    "pollen.homepage.hero-image",
    "pollen.homepage.hero-title",
    "pollen.homepage.hero-subtitle",
    "pollen.homepage.hero-description-text",
    "pollen.homepage.hero-button-text",
    "pollen.homepage.hero-button-link",
    "pollen.homepage.about-service-title",
    "pollen.homepage.about-service-description",
    "pollen.homepage.gallery-label",
    "pollen.homepage.gallery-heading",
    "pollen.homepage.gallery-button-text",
    "pollen.homepage.gallery-button-link",
    "pollen.global.cta-title",
    "pollen.global.cta-subtitle",
    "pollen.global.cta-text",
    "pollen.global.cta-button-text",
    "pollen.global.cta-button-link",
    "pollen.global.cta-image",
  ]);

  const services = parseTemplateIconListRows(
    getListFieldValue(
      homepage?.siteContent?.customFields,
      "pollen.homepage.services-list",
    ),
    DEFAULT_POLLEN_HOMEPAGE_SERVICES,
  );

  const galleryItems = parseTemplateImageListRows(
    getListFieldValue(
      homepage?.siteContent?.customFields,
      "pollen.homepage.gallery-items",
    ),
    DEFAULT_POLLEN_GALLERY_ITEMS,
  );

  return (
    <PageTransition>
      {popup && <PollenPopup popup={popup} />}
      <div className="pt-24">
        <PollenHero
          title={f["pollen.homepage.hero-title"]}
          subtitle={f["pollen.homepage.hero-subtitle"]}
          descriptionText={f["pollen.homepage.hero-description-text"]}
          buttonText={f["pollen.homepage.hero-button-text"]}
          buttonLink={f["pollen.homepage.hero-button-link"]}
          imageUrl={f["pollen.homepage.hero-image"]}
          sectionAttrs={sectionGroupAttr("homepage", "hero")}
        />
        {isSectionVisible(customFields, "pollen", "homepage.services") && (
          <PollenHomepageAbout
            services={services ?? []}
            sectionLabel={f["pollen.homepage.about-service-title"] ?? ""}
            sectionHeading={
              f["pollen.homepage.about-service-description"] ?? ""
            }
            sectionAttrs={sectionGroupAttr("homepage", "services")}
          />
        )}
        {isSectionVisible(customFields, "pollen", "homepage.gallery") && (
          <PollenHomepageGallery
            sectionLabel={f["pollen.homepage.gallery-label"] ?? ""}
            sectionHeading={f["pollen.homepage.gallery-heading"] ?? ""}
            buttonText={f["pollen.homepage.gallery-button-text"]}
            buttonLink={f["pollen.homepage.gallery-button-link"] ?? "/contact"}
            galleryItems={galleryItems ?? []}
            sectionAttrs={sectionGroupAttr("homepage", "gallery")}
          />
        )}
        {isSectionVisible(customFields, "pollen", "global.cta") && (
          <PollenCallToAction
            title={f["pollen.global.cta-title"] ?? ""}
            subtitle={f["pollen.global.cta-subtitle"] ?? ""}
            description={f["pollen.global.cta-text"] ?? ""}
            buttonText={f["pollen.global.cta-button-text"] ?? ""}
            buttonLink={f["pollen.global.cta-button-link"] ?? "/contact"}
            imageUrl={f["pollen.global.cta-image"] ?? "/placeholder.svg"}
            sectionAttrs={sectionGroupAttr("global", "cta")}
          />
        )}
      </div>
    </PageTransition>
  );
}
