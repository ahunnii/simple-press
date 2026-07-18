import { headers } from "next/headers";
import { permanentRedirect } from "next/navigation";

import { env } from "~/env";
import { enforceCanonicalHost } from "~/lib/canonical";
import { StorefrontFlagsProvider } from "~/providers/feature-flags-context";
import {
  buildLocalBusinessSchema,
  buildOrganizationSchema,
  buildWebSiteSchema,
} from "~/lib/structured-data";
import { api, HydrateClient } from "~/trpc/server";
import { JsonLd } from "~/components/json-ld";
import { MaintenanceScreen } from "~/components/maintenance/maintenance-screen";
import { PreviewOverlay } from "~/components/preview/preview-overlay";

import { PlatformLandingPageComponent } from "./_components/platform-specific/platform-landing-page";
import { BambooHomepage } from "./(storefront)/_templates/bamboo/homepage/bamboo-homepage";
import { BambooLayout } from "./(storefront)/_templates/bamboo/layout/bamboo-general-layout";
import { BuildersHomepage } from "./(storefront)/_templates/builders/homepage/builders-homepage";
import { BuildersLayout } from "./(storefront)/_templates/builders/layout/builders-layout";
import { CoopHomepage } from "./(storefront)/_templates/coop/homepage/coop-homepage";
import { CoopLayout } from "./(storefront)/_templates/coop/layout/coop-layout";
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
import { SledgeHomepage } from "./(storefront)/_templates/sledge/homepage/sledge-homepage";
import { SledgeLayout } from "./(storefront)/_templates/sledge/layout/sledge-layout";
import { ViiHomepage } from "./(storefront)/_templates/vii/homepage/vii-homepage";
import { ViiLayout } from "./(storefront)/_templates/vii/layout/vii-layout";

// Next 15: searchParams is a Promise.
type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PlatformLandingPage({ searchParams }: Props) {
  const params = await (searchParams ??
    Promise.resolve<Record<string, string | string[] | undefined>>({}));
  const isPreview = params.__preview === "1";

  const business = await api.business.simplifiedGetWithProducts();

  if (!business) {
    return <PlatformLandingPageComponent />;
  }

  // Canonical-host guard: redirect platform-subdomain requests to the active
  // custom domain (308 permanent). enforceCanonicalHost returns null when no
  // redirect is needed, making this loop-safe.
  // Skipped in development so custom-domain businesses stay reachable locally.
  if (env.NODE_ENV !== "development") {
    const headersList = await headers();
    const host = headersList.get("host") ?? "";
    const pathname = headersList.get("x-pathname") ?? "/";
    const canonicalRedirect = enforceCanonicalHost(business, host, pathname);
    if (canonicalRedirect) {
      permanentRedirect(canonicalRedirect);
    }
  }

  if (business.maintenance?.active) {
    return (
      <MaintenanceScreen
        variant={business.maintenance.variant}
        message={business.maintenance.message}
        businessName={business.name}
      />
    );
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
      builders: BuildersHomepage,
      coop: CoopHomepage,
      sledge: SledgeHomepage,
      vii: ViiHomepage,
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
      builders: BuildersLayout,
      coop: CoopLayout,
      sledge: SledgeLayout,
      vii: ViiLayout,
    }[business.templateId] ?? DefaultLayout;

  return (
    <HydrateClient>
      <JsonLd
        data={[
          buildOrganizationSchema(business),
          buildWebSiteSchema(business),
          ...(business.localBusinessEnabled
            ? [buildLocalBusinessSchema(business)]
            : []),
        ]}
      />
      <StorefrontFlagsProvider flags={business.featureFlags}>
        <TemplateLayout business={business}>
          <TemplateComponent business={business} />
        </TemplateLayout>
      </StorefrontFlagsProvider>
      {isPreview && <PreviewOverlay />}
    </HydrateClient>
  );
}
