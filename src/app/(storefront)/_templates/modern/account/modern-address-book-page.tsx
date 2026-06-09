"use client";

import type { AccountAddressBookPageProps } from "../../types";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import { ModernAccountLayout } from "./modern-account-layout";

export function ModernAddressBookPage({
  customer,
}: AccountAddressBookPageProps) {
  return (
    <ModernAccountLayout heading="Address Book">
      <AddressBookContent customer={customer} />
    </ModernAccountLayout>
  );
}
