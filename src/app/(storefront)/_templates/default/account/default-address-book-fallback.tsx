"use client";

import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import type { AccountAddressBookPageProps } from "../../types";
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
