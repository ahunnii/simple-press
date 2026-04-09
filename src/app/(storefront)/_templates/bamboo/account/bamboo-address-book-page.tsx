"use client";

import { PageTransition } from "~/components/page-animations";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import type { AccountAddressBookPageProps } from "../../types";
import { BambooAccountLayout } from "./bamboo-account-layout";

export function BambooAddressBookPage({
  customer,
}: AccountAddressBookPageProps) {
  return (
    <PageTransition>
      <BambooAccountLayout heading="Address Book">
        <AddressBookContent customer={customer} />
      </BambooAccountLayout>
    </PageTransition>
  );
}
