import { api, HydrateClient } from "~/trpc/server";
import { PreviewOverlay } from "~/components/preview/preview-overlay";

import { PlatformLandingPageComponent } from "./_components/platform-specific/platform-landing-page";
import { BambooHomepage } from "./(storefront)/_templates/bamboo/homepage/bamboo-homepage";
import { BambooLayout } from "./(storefront)/_templates/bamboo/layout/bamboo-general-layout";
import { DarkTrendHomepage } from "./(storefront)/_templates/dark-trend/homepage/dark-trend-homepage";
import { DarkTrendLayout } from "./(storefront)/_templates/dark-trend/layout/dark-trend-layout";
import { DefaultHomePage } from "./(storefront)/_templates/default/homepage/default-homepage";
import { DefaultLayout } from "./(storefront)/_templates/default/layout/default-layout";
import { ElegantHomePage } from "./(storefront)/_templates/elegant/homepage/elegant-homepage";
import { ElegantLayout } from "./(storefront)/_templates/elegant/layout/elegant-layout";
import { HappyBambooHomepage } from "./(storefront)/_templates/happy-bamboo/homepage/happy-bamboo-homepage";
import { HappyBambooLayout } from "./(storefront)/_templates/happy-bamboo/layout/happy-bamboo-layout";
import { ModernHomePage } from "./(storefront)/_templates/modern/homepage/modern-home-page";
import { ModernLayout } from "./(storefront)/_templates/modern/layout/modern-layout";
import { NoiseHomepage } from "./(storefront)/_templates/noise/homepage/noise-homepage";
import { NoiseLayout } from "./(storefront)/_templates/noise/layout/noise-layout";
import { PollenHomepage } from "./(storefront)/_templates/pollen/homepage/pollen-homepage";
import { PollenLayout } from "./(storefront)/_templates/pollen/layout/pollen-layout";

// Next 15: searchParams is a Promise.
type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PlatformLandingPage({ searchParams }: Props) {
  const params = await (searchParams ?? Promise.resolve<Record<string, string | string[] | undefined>>({}));
  const isPreview = params.__preview === "1";

  const business = await api.business.simplifiedGetWithProducts();

  if (!business) {
    return <PlatformLandingPageComponent />;
  }

  const TemplateComponent =
    {
      "dark-trend": DarkTrendHomepage,
      modern: ModernHomePage,

      elegant: ElegantHomePage,
      pollen: PollenHomepage,
      bamboo: BambooHomepage,
      "happy-bamboo": HappyBambooHomepage,
      noise: NoiseHomepage,
    }[business.templateId] ?? DefaultHomePage;

  const TemplateLayout =
    {
      "dark-trend": DarkTrendLayout,
      default: DefaultLayout,
      bamboo: BambooLayout,
      elegant: ElegantLayout,
      modern: ModernLayout,
      pollen: PollenLayout,
      "happy-bamboo": HappyBambooLayout,
      noise: NoiseLayout,
    }[business.templateId] ?? DefaultLayout;

  return (
    <HydrateClient>
      <TemplateLayout business={business}>
        <TemplateComponent business={business} />
      </TemplateLayout>
      {isPreview && <PreviewOverlay />}
    </HydrateClient>
  );
}
