import { notFound } from "next/navigation";
import { accountViewPaths } from "@daveyplate/better-auth-ui/server";

import { api } from "~/trpc/server";

import { BambooAccountSecurityPage } from "../../_templates/bamboo/account/bamboo-account-security-page";
import { BambooAccountSettingsPage } from "../../_templates/bamboo/account/bamboo-account-settings-page";
import { DarkTrendAccountSecurityPage } from "../../_templates/dark-trend/account/dark-trend-account-security-page";
import { DarkTrendAccountSettingsPage } from "../../_templates/dark-trend/account/dark-trend-account-settings-page";
import { DefaultAccountSecurityPage } from "../../_templates/default/account/default-account-security-page";
import { DefaultAccountSettingsPage } from "../../_templates/default/account/default-account-settings-page";
import { ElegantAccountSecurityPage } from "../../_templates/elegant/account/elegant-account-security-page";
import { ElegantAccountSettingsPage } from "../../_templates/elegant/account/elegant-account-settings-page";
import { HappyBambooAccountSecurityPage } from "../../_templates/happy-bamboo/account/happy-bamboo-account-security-page";
import { HappyBambooAccountSettingsPage } from "../../_templates/happy-bamboo/account/happy-bamboo-account-settings-page";
import { ModernAccountSecurityPage } from "../../_templates/modern/account/modern-account-security-page";
import { ModernAccountSettingsPage } from "../../_templates/modern/account/modern-account-settings-page";
import { NoiseAccountSecurityPage } from "../../_templates/noise/account/noise-account-security-page";
import { NoiseAccountSettingsPage } from "../../_templates/noise/account/noise-account-settings-page";
import { PollenAccountSecurityPage } from "../../_templates/pollen/account/pollen-account-security-page";
import { PollenAccountSettingsPage } from "../../_templates/pollen/account/pollen-account-settings-page";
import { SledgeAccountSecurityPage } from "../../_templates/sledge/account/sledge-account-security-page";
import { SledgeAccountSettingsPage } from "../../_templates/sledge/account/sledge-account-settings-page";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(accountViewPaths).map((path) => ({ path }));
}

type Props = {
  params: Promise<{ path: string }>;
};

export default async function AccountPage({ params }: Props) {
  const { path } = await params;
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const isSecurity = path === accountViewPaths.SECURITY;

  const SecurityComponent =
    {
      "happy-bamboo": HappyBambooAccountSecurityPage,
      bamboo: BambooAccountSecurityPage,
      noise: NoiseAccountSecurityPage,
      sledge: SledgeAccountSecurityPage,
      modern: ModernAccountSecurityPage,
      elegant: ElegantAccountSecurityPage,
      pollen: PollenAccountSecurityPage,
      "dark-trend": DarkTrendAccountSecurityPage,
    }[business.templateId] ?? DefaultAccountSecurityPage;

  const SettingsComponent =
    {
      "happy-bamboo": HappyBambooAccountSettingsPage,
      bamboo: BambooAccountSettingsPage,
      noise: NoiseAccountSettingsPage,
      sledge: SledgeAccountSettingsPage,
      modern: ModernAccountSettingsPage,
      elegant: ElegantAccountSettingsPage,
      pollen: PollenAccountSettingsPage,
      "dark-trend": DarkTrendAccountSettingsPage,
    }[business.templateId] ?? DefaultAccountSettingsPage;

  if (isSecurity) {
    return <SecurityComponent />;
  }
  return <SettingsComponent />;
}
