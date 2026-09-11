"use client";

import type { AccountAddressBookPageProps } from "../../types";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import { WealthReveal } from "../shared/wealth-reveal";
import { WealthAccountLayout } from "./wealth-account-layout";

export function WealthAddressBookPage({ business, customer }: AccountAddressBookPageProps) {
  return (
    <WealthAccountLayout
      heading="Address Book"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Address Book" },
      ]}
    >
      <WealthReveal>
        <AddressBookContent customer={customer} salesCountries={business.salesCountries} />
      </WealthReveal>
    </WealthAccountLayout>
  );
}
