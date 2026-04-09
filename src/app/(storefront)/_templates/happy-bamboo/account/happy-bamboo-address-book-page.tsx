"use client";

import { PageTransition } from "~/components/page-animations";

import type { AccountAddressBookPageProps } from "../../types";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";
import { HappyBambooAccountLayout } from "./happy-bamboo-account-layout";

export function HappyBambooAddressBookPage({
  customer,
}: AccountAddressBookPageProps) {
  return (
    <PageTransition>
      <HappyBambooAccountLayout
        heading="Address Book"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Account", href: "/account/settings" },
          { label: "Address Book" },
        ]}
      >
        <AddressBookContent customer={customer} />
      </HappyBambooAccountLayout>
    </PageTransition>
  );
}
