import { BookOpen, Flower2, HandHelping, MapIcon } from "lucide-react";

import { api } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";
import { getListFieldValue, parseTemplateIconListRows } from "~/lib/template-fields";

import { resolveFields } from "..";
import { PollenCallToAction } from "../shared/pollen-cta";
import { PollenHomepageAbout } from "./pollen-homepage-about";
import { PollenHomepageGallery } from "./pollen-homepage-gallery";
import { PollenHero } from "./pollen-homepage-hero";

const DEFAULT_HOMEPAGE_SERVICES = [
  {
    icon: Flower2,
    title: "Service One",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  },
  {
    icon: HandHelping,
    title: "Service Two",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  },
  {
    icon: MapIcon,
    title: "Service Three",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  },
  {
    icon: BookOpen,
    title: "Service Four",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  },
];

export async function PollenHomepage() {
  const homepage = await api.business.getHomepage();
  const customFields = homepage?.siteContent?.customFields;

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
    getListFieldValue(customFields, "pollen.homepage.services-list"),
    DEFAULT_HOMEPAGE_SERVICES,
  ) ?? DEFAULT_HOMEPAGE_SERVICES;

  const rawGalleryItems = getListFieldValue(
    customFields,
    "pollen.homepage.gallery-items",
  );
  const galleryItems: { label: string; image: string }[] = Array.isArray(
    rawGalleryItems,
  )
    ? rawGalleryItems
        .filter(
          (item): item is { label: string; image: string } =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as Record<string, unknown>).label === "string" &&
            typeof (item as Record<string, unknown>).image === "string",
        )
        .map((item) => ({
          label: (item as { label: string; image: string }).label,
          image: (item as { label: string; image: string }).image,
        }))
    : [];

  return (
    <PageTransition>
      <PollenHero
        title={f["pollen.homepage.hero-title"] ?? ""}
        subtitle={f["pollen.homepage.hero-subtitle"] ?? ""}
        descriptionText={f["pollen.homepage.hero-description-text"] ?? ""}
        buttonText={f["pollen.homepage.hero-button-text"] ?? ""}
        buttonLink={f["pollen.homepage.hero-button-link"] ?? "/contact"}
        imageUrl={f["pollen.homepage.hero-image"] ?? "/placeholder.svg"}
      />
      <PollenHomepageAbout
        services={services}
        sectionLabel={f["pollen.homepage.about-service-title"] ?? ""}
        sectionHeading={f["pollen.homepage.about-service-description"] ?? ""}
      />
      <PollenHomepageGallery
        sectionLabel={f["pollen.homepage.gallery-label"] ?? ""}
        sectionHeading={f["pollen.homepage.gallery-heading"] ?? ""}
        buttonText={f["pollen.homepage.gallery-button-text"] ?? ""}
        buttonLink={f["pollen.homepage.gallery-button-link"] ?? "/gallery"}
        galleryItems={galleryItems}
      />
      <PollenCallToAction
        title={f["pollen.global.cta-title"] ?? ""}
        subtitle={f["pollen.global.cta-subtitle"] ?? ""}
        description={f["pollen.global.cta-text"] ?? ""}
        buttonText={f["pollen.global.cta-button-text"] ?? ""}
        buttonLink={f["pollen.global.cta-button-link"] ?? "/contact"}
        imageUrl={f["pollen.global.cta-image"] ?? "/placeholder.svg"}
      />
    </PageTransition>
  );
}
