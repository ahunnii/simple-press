"use client";

import type { AccountAddressBookPageProps } from "../../types";
import { PageTransition } from "~/components/page-animations";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import { BambooAccountLayout } from "./bamboo-account-layout";

export function BambooAddressBookPage({
  business,
  customer,
}: AccountAddressBookPageProps) {
  return (
    <PageTransition>
      <BambooAccountLayout heading="Address Book">
        <AddressBookContent customer={customer} salesCountries={business.salesCountries} />
      </BambooAccountLayout>
    </PageTransition>
  );
}
