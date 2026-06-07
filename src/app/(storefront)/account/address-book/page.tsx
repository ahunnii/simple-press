import { notFound, redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

import { BambooAddressBookPage } from "../../_templates/bamboo/account/bamboo-address-book-page";
import { DarkTrendAddressBookPage } from "../../_templates/dark-trend/account/dark-trend-address-book-page";
import { DefaultAddressBookFallback } from "../../_templates/default/account/default-address-book-fallback";
import { ElegantAddressBookPage } from "../../_templates/elegant/account/elegant-address-book-page";
import { HappyBambooAddressBookPage } from "../../_templates/happy-bamboo/account/happy-bamboo-address-book-page";
import { ModernAddressBookPage } from "../../_templates/modern/account/modern-address-book-page";
import { NoiseAddressBookPage } from "../../_templates/noise/account/noise-address-book-page";
import { PollenAddressBookPage } from "../../_templates/pollen/account/pollen-address-book-page";
import { SledgeAddressBookPage } from "../../_templates/sledge/account/sledge-address-book-page";

export const metadata = {
  title: "Address Book",
};

export default async function AddressBookPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/sign-in?redirect=/account/address-book");
  }

  const [business, customer] = await Promise.all([
    api.business.simplifiedGet(),
    api.customer.getMyProfile(),
  ]);

  if (!business) notFound();

  const TemplateComponent =
    {
      "happy-bamboo": HappyBambooAddressBookPage,
      bamboo: BambooAddressBookPage,
      "dark-trend": DarkTrendAddressBookPage,
      noise: NoiseAddressBookPage,
      sledge: SledgeAddressBookPage,
      modern: ModernAddressBookPage,
      elegant: ElegantAddressBookPage,
      pollen: PollenAddressBookPage,
    }[business.templateId] ?? DefaultAddressBookFallback;

  return <TemplateComponent business={business} customer={customer} />;
}
