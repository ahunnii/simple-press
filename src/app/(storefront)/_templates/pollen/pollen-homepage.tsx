import { BookOpen, Flower2, HandHelping, MapIcon } from "lucide-react";

import { db } from "~/server/db";
import { api } from "~/trpc/server";
import { GalleryRenderer } from "~/components/gallery-renderer";

import { PollenCallToAction } from "./pollen-cta";
import { PollenHomepageAbout } from "./pollen-homepage-about";
import { PollenHomepageGallery } from "./pollen-homepage-gallery";
import { PollenHero } from "./pollen-homepage-hero";

export async function PollenHomepage() {
  const homepage = await api.business.getHomepage();

  const primaryColor = homepage?.siteContent?.primaryColor ?? "#5e8b4a";

  const themeSpecificFields = homepage?.siteContent?.customFields as Record<
    string,
    string
  >;

  const services = [
    {
      icon: Flower2,
      title:
        themeSpecificFields["pollen.global.about-service-title-1"] ??
        "Service 1",
      description:
        themeSpecificFields["pollen.global.about-service-description-1"] ??
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    },
    {
      icon: HandHelping,
      title:
        themeSpecificFields["pollen.global.about-service-title-2"] ??
        "Service 2",
      description:
        themeSpecificFields["pollen.global.about-service-description-2"] ??
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    },
    {
      icon: MapIcon,
      title:
        themeSpecificFields["pollen.global.about-service-title-3"] ??
        "Service 3",
      description:
        themeSpecificFields["pollen.global.about-service-description-3"] ??
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    },
    {
      icon: BookOpen,
      title:
        themeSpecificFields["pollen.global.about-service-title-4"] ??
        "Service 4",
      description:
        themeSpecificFields["pollen.global.about-service-description-4"] ??
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    },
  ];
  const portfolioGalleryId = themeSpecificFields["pollen.global.gallery"];

  // Fetch gallery if set
  // const gallery = portfolioGalleryId
  //   ? await db.gallery.findUnique({
  //       where: { id: portfolioGalleryId },
  //       include: { images: { orderBy: { sortOrder: "asc" } } },
  //     })
  //   : null;

  return (
    <>
      <PollenHero
        title={themeSpecificFields["pollen.homepage.hero-title"] ?? "Business"}
        subtitle={
          themeSpecificFields["pollen.homepage.hero-subtitle"] ??
          "Where Business Business"
        }
        descriptionText={
          themeSpecificFields["pollen.homepage.hero-description-text"] ??
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
        }
        buttonText={
          themeSpecificFields["pollen.homepage.hero-button-text"] ??
          "Call to Action"
        }
        buttonLink={
          themeSpecificFields["pollen.homepage.hero-button-link"] ?? "#!"
        }
        imageUrl={
          themeSpecificFields["pollen.homepage.hero-image"] ??
          "/placeholder.svg"
        }
      />
      <PollenHomepageAbout services={services} />

      {/* {gallery && <GalleryRenderer gallery={gallery} />} */}

      <PollenHomepageGallery />
      <PollenCallToAction
        title={
          themeSpecificFields["pollen.global.cta-title"] ?? "Call to Action"
        }
        subtitle={
          themeSpecificFields["pollen.global.cta-subtitle"] ?? "Call to Action"
        }
        description={
          themeSpecificFields["pollen.global.cta-text"] ?? "Call to Action"
        }
        buttonText={
          themeSpecificFields["pollen.global.cta-button-text"] ??
          "Call to Action"
        }
        buttonLink={
          themeSpecificFields["pollen.global.cta-button-link"] ?? "#!"
        }
        imageUrl={
          themeSpecificFields["pollen.global.cta-image"] ?? "/placeholder.svg"
        }
      />
    </>
  );
}
