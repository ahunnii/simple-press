"use client";

import type { AccountAddressBookPageProps } from "../../types";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import { PollenAccountLayout } from "./pollen-account-layout";

export function PollenAddressBookPage({
  business,
  customer,
}: AccountAddressBookPageProps) {
  return (
    <PollenAccountLayout heading="Address Book">
      <AddressBookContent
        customer={customer}
        salesCountries={business.salesCountries}
      />
    </PollenAccountLayout>
  );
}
