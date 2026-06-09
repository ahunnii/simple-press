import { notFound, redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

import { BambooPreferencesPage } from "../../_templates/bamboo/account/bamboo-preferences-page";
import { DarkTrendPreferencesPage } from "../../_templates/dark-trend/account/dark-trend-preferences-page";
import { DefaultPreferencesFallback } from "../../_templates/default/account/default-preferences-fallback";
import { ElegantPreferencesPage } from "../../_templates/elegant/account/elegant-preferences-page";
import { HappyBambooPreferencesPage } from "../../_templates/happy-bamboo/account/happy-bamboo-preferences-page";
import { ModernPreferencesPage } from "../../_templates/modern/account/modern-preferences-page";
import { NoisePreferencesPage } from "../../_templates/noise/account/noise-preferences-page";
import { PollenPreferencesPage } from "../../_templates/pollen/account/pollen-preferences-page";
import { SledgePreferencesPage } from "../../_templates/sledge/account/sledge-preferences-page";

export const metadata = {
  title: "Preferences",
};

export default async function PreferencesPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/sign-in?redirect=/account/preferences");
  }

  const [business, customer] = await Promise.all([
    api.business.simplifiedGet(),
    api.customer.getMyProfile(),
  ]);

  if (!business) notFound();

  const TemplateComponent =
    {
      "happy-bamboo": HappyBambooPreferencesPage,
      bamboo: BambooPreferencesPage,
      "dark-trend": DarkTrendPreferencesPage,
      noise: NoisePreferencesPage,
      sledge: SledgePreferencesPage,
      modern: ModernPreferencesPage,
      elegant: ElegantPreferencesPage,
      pollen: PollenPreferencesPage,
    }[business.templateId] ?? DefaultPreferencesFallback;

  return <TemplateComponent business={business} customer={customer} />;
}
