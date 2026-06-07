"use client";

import type { AccountAddressBookPageProps } from "../../types";
import { PageTransition } from "~/components/page-animations";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import { SledgeAccountLayout } from "./sledge-account-layout";

export function SledgeAddressBookPage({
  customer,
}: AccountAddressBookPageProps) {
  return (
    <PageTransition className="bg-white">
      <SledgeAccountLayout heading="Address Book">
        <AddressBookContent customer={customer} />
      </SledgeAccountLayout>
    </PageTransition>
  );
}
