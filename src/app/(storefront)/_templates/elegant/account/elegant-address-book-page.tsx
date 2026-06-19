"use client";

import type { AccountAddressBookPageProps } from "../../types";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import { ElegantAccountLayout } from "./elegant-account-layout";

export function ElegantAddressBookPage({
  customer,
}: AccountAddressBookPageProps) {
  return (
    <ElegantAccountLayout heading="Address Book">
      <AddressBookContent customer={customer} />
    </ElegantAccountLayout>
  );
}
