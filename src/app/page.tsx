import { api, HydrateClient } from "~/trpc/server";

import { PlatformLandingPageComponent } from "./_components/platform-specific/platform-landing-page";
import { BambooHomepage } from "./(storefront)/_templates/bamboo/homepage/bamboo-homepage";
import { BambooLayout } from "./(storefront)/_templates/bamboo/layout/bamboo-general-layout";
import { DarkTrendHomepage } from "./(storefront)/_templates/dark-trend/dark-trend-homepage";
import { DarkTrendLayout } from "./(storefront)/_templates/dark-trend/dark-trend-layout";
import { DefaultHomePage } from "./(storefront)/_templates/default/default-homepage";
import { DefaultLayout } from "./(storefront)/_templates/default/default-layout";
import { ElegantHomePage } from "./(storefront)/_templates/elegant/elegant-homepage";
import { ElegantLayout } from "./(storefront)/_templates/elegant/elegant-layout";
import { HappyBambooHomepage } from "./(storefront)/_templates/happy-bamboo/homepage/happy-bamboo-homepage";
import { HappyBambooLayout } from "./(storefront)/_templates/happy-bamboo/layout/happy-bamboo-layout";
import { ModernHomePage } from "./(storefront)/_templates/modern/homepage/modern-home-page";
import { ModernLayout } from "./(storefront)/_templates/modern/modern-layout";
import { NoiseHomepage } from "./(storefront)/_templates/noise/homepage/noise-homepage";
import { NoiseLayout } from "./(storefront)/_templates/noise/layout/noise-layout";
import { PollenHomepage } from "./(storefront)/_templates/pollen/pollen-homepage";
import { PollenLayout } from "./(storefront)/_templates/pollen/pollen-layout";

export default async function PlatformLandingPage() {
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
    </HydrateClient>
  );
}
