"use client";

import type { AccountAddressBookPageProps } from "../../types";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import { GloveAccountLayout } from "./glove-account-layout";

/** Address book: wraps the shared `AddressBookContent`, which owns the mutations. */
export function GloveAddressBookPage({
  business,
  customer,
}: AccountAddressBookPageProps) {
  return (
    <GloveAccountLayout heading="Address book">
      <AddressBookContent
        customer={customer}
        salesCountries={business.salesCountries}
      />
    </GloveAccountLayout>
  );
}
