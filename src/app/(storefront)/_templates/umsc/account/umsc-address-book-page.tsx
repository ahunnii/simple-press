"use client";

import type { AccountAddressBookPageProps } from "../../types";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import { UmscAccountLayout } from "./umsc-account-layout";

export function UmscAddressBookPage({
  business,
  customer,
}: AccountAddressBookPageProps) {
  return (
    <UmscAccountLayout
      heading="Address Book"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Address Book" },
      ]}
    >
      <AddressBookContent
        customer={customer}
        salesCountries={business.salesCountries}
      />
    </UmscAccountLayout>
  );
}
