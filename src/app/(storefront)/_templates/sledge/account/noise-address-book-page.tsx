"use client";

import { PageTransition } from "~/components/page-animations";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import type { AccountAddressBookPageProps } from "../../types";
import { NoiseAccountLayout } from "./noise-account-layout";

export function NoiseAddressBookPage({ customer }: AccountAddressBookPageProps) {
  return (
    <PageTransition>
      <NoiseAccountLayout heading="Address Book">
        <AddressBookContent customer={customer} />
      </NoiseAccountLayout>
    </PageTransition>
  );
}
