"use client";

import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import type { AccountAddressBookPageProps } from "../../types";
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
