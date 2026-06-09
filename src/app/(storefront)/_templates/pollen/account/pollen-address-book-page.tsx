"use client";

import type { AccountAddressBookPageProps } from "../../types";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import { PollenAccountLayout } from "./pollen-account-layout";

export function PollenAddressBookPage({
  customer,
}: AccountAddressBookPageProps) {
  return (
    <PollenAccountLayout heading="Address Book">
      <AddressBookContent customer={customer} />
    </PollenAccountLayout>
  );
}
