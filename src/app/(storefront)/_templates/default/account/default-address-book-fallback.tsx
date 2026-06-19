"use client";

import type { AccountAddressBookPageProps } from "../../types";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import { DefaultAccountLayout } from "./default-account-layout";

export function DefaultAddressBookFallback({
  customer,
}: AccountAddressBookPageProps) {
  return (
    <DefaultAccountLayout heading="Address Book">
      <AddressBookContent customer={customer} />
    </DefaultAccountLayout>
  );
}
