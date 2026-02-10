import { api, HydrateClient } from "~/trpc/server";

import { PlatformLandingPageComponent } from "./_components/platform-specific/platform-landing-page";
import { MinimalTemplate } from "./(storefront)/_templates/minimal-template";
import { ModernTemplate } from "./(storefront)/_templates/modern-template";
import { VintageTemplate } from "./(storefront)/_templates/vintage-template";

export default async function PlatformLandingPage() {
  const business = await api.business.get();

  if (!business) {
    return <PlatformLandingPageComponent />;
  }

  const TemplateComponent =
    {
      modern: ModernTemplate,
      vintage: VintageTemplate,
      minimal: MinimalTemplate,
    }[business.templateId] ?? ModernTemplate;

  return (
    <HydrateClient>
      <TemplateComponent
        business={
          business as unknown as {
            id: string;
            name: string;
            siteContent: {
              aboutTitle: string | null;
              heroTitle: string | null;
              heroSubtitle: string | null;
              aboutText: string | null;
              primaryColor: string | null;
            } | null;
            products: Array<{
              id: string;
              name: string;
              slug: string;
              price: number;
              images: Array<{ url: string; altText: string | null }>;
            }>;
          }
        }
      />
    </HydrateClient>
  );
}
