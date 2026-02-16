import { api, HydrateClient } from "~/trpc/server";

import { PlatformLandingPageComponent } from "./_components/platform-specific/platform-landing-page";
import { DarkTrendHomepage } from "./(storefront)/_templates/dark-trend/dark-trend-homepage";
import { DarkTrendLayout } from "./(storefront)/_templates/dark-trend/dark-trend-layout";
import { DefaultTemplate } from "./(storefront)/_templates/default-template";
import { DefaultHomePage } from "./(storefront)/_templates/default/default-homepage";
import { DefaultLayout } from "./(storefront)/_templates/default/default-layout";
import { ElegantHomePage } from "./(storefront)/_templates/elegant/elegant-homepage";
import { ElegantLayout } from "./(storefront)/_templates/elegant/elegant-layout";
import { MinimalTemplate } from "./(storefront)/_templates/minimal-template";
import { ModernHomePage } from "./(storefront)/_templates/modern/modern-home-page";
import { ModernLayout } from "./(storefront)/_templates/modern/modern-layout";
import { PollenHomepage } from "./(storefront)/_templates/pollen/pollen-homepage";
import { PollenLayout } from "./(storefront)/_templates/pollen/pollen-layout";
import { VintageTemplate } from "./(storefront)/_templates/vintage-template";

export default async function PlatformLandingPage() {
  const business = await api.business.getWithProducts();

  if (!business) {
    return <PlatformLandingPageComponent />;
  }

  const TemplateComponent =
    {
      "dark-trend": DarkTrendHomepage,
      modern: ModernHomePage,
      vintage: VintageTemplate,
      minimal: MinimalTemplate,
      elegant: ElegantHomePage,
      pollen: PollenHomepage,
    }[business.templateId] ?? DefaultHomePage;

  const TemplateLayout =
    {
      "dark-trend": DarkTrendLayout,
      default: DefaultLayout,
      elegant: ElegantLayout,
      modern: ModernLayout,
      pollen: PollenLayout,
    }[business.templateId] ?? DefaultLayout;

  return (
    <HydrateClient>
      <TemplateLayout business={business}>
        <TemplateComponent business={business} />
      </TemplateLayout>
    </HydrateClient>
  );
}
