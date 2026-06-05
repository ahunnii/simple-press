import { notFound } from "next/navigation";

import { api, HydrateClient } from "~/trpc/server";
import { TemplateSelectorDevTool } from "~/components/development/template-selector";
import { PreviewOverlay } from "~/components/preview/preview-overlay";

import { BambooLayout } from "./_templates/bamboo/layout/bamboo-general-layout";
import { DarkTrendLayout } from "./_templates/dark-trend/layout/dark-trend-layout";
import { DefaultLayout } from "./_templates/default/layout/default-layout";
import { ElegantLayout } from "./_templates/elegant/layout/elegant-layout";
import { HappyBambooLayout } from "./_templates/happy-bamboo/layout/happy-bamboo-layout";
import { ModernLayout } from "./_templates/modern/layout/modern-layout";
import { NoiseLayout } from "./_templates/noise/layout/noise-layout";
import { PollenLayout } from "./_templates/pollen/layout/pollen-layout";
import { SledgeLayout } from "./_templates/sledge/layout/sledge-layout";

type Props = {
  children: React.ReactNode;
};

export default async function StorefrontLayout({ children }: Props) {
  const business = await api.business.simplifiedGetWithProducts();
  if (!business) notFound();

  const TemplateLayout =
    {
      "dark-trend": DarkTrendLayout,
      bamboo: BambooLayout,
      default: DefaultLayout,
      elegant: ElegantLayout,
      modern: ModernLayout,
      pollen: PollenLayout,
      "happy-bamboo": HappyBambooLayout,
      noise: NoiseLayout,
      sledge: SledgeLayout,
    }[business.templateId] ?? DefaultLayout;

  return (
    <HydrateClient>
      <TemplateLayout business={business}>
        <>{children}</>
      </TemplateLayout>
      <PreviewOverlay />
      <TemplateSelectorDevTool />
    </HydrateClient>
  );
}
