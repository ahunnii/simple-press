import { notFound } from "next/navigation";

import { api, HydrateClient } from "~/trpc/server";

import { DarkTrendLayout } from "./_templates/dark-trend/dark-trend-layout";
import { DefaultLayout } from "./_templates/default/default-layout";
import { ElegantLayout } from "./_templates/elegant/elegant-layout";
import { ModernLayout } from "./_templates/modern/modern-layout";
import { PollenLayout } from "./_templates/pollen/pollen-layout";

type Props = {
  children: React.ReactNode;
};

export default async function StorefrontLayout({ children }: Props) {
  const business = await api.business.simplifiedGetWithProducts();
  if (!business) notFound();

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
        <>{children}</>
      </TemplateLayout>
    </HydrateClient>
  );
}
