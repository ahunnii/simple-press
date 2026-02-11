import { api, HydrateClient } from "~/trpc/server";

import { PlatformLandingPageComponent } from "./_components/platform-specific/platform-landing-page";
import { DefaultTemplate } from "./(storefront)/_templates/default-template";
import { MinimalTemplate } from "./(storefront)/_templates/minimal-template";
import { ModernHomePage } from "./(storefront)/_templates/modern/modern-home-page";
import { VintageTemplate } from "./(storefront)/_templates/vintage-template";

export default async function PlatformLandingPage() {
  const business = await api.business.get();

  if (!business) {
    return <PlatformLandingPageComponent />;
  }

  const TemplateComponent =
    {
      modern: ModernHomePage,
      vintage: VintageTemplate,
      minimal: MinimalTemplate,
    }[business.templateId] ?? DefaultTemplate;

  return (
    <HydrateClient>
      <TemplateComponent business={business} />
    </HydrateClient>
  );
}
