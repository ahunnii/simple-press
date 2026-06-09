"use client";

import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import type { AccountAddressBookPageProps } from "../../types";
import { DarkTrendAccountLayout } from "./dark-trend-account-layout";

export function DarkTrendAddressBookPage({
  customer,
}: AccountAddressBookPageProps) {
  return (
    <DarkTrendAccountLayout heading="Address Book">
      <AddressBookContent customer={customer} />
    </DarkTrendAccountLayout>
  );
}
