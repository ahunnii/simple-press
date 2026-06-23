"use client";

import type { AccountAddressBookPageProps } from "../../types";
import { PageTransition } from "~/components/page-animations";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import { HappyBambooAccountLayout } from "./happy-bamboo-account-layout";

export function HappyBambooAddressBookPage({
  business,
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
        <AddressBookContent
          customer={customer}
          salesCountries={business.salesCountries}
        />
      </HappyBambooAccountLayout>
    </PageTransition>
  );
}
