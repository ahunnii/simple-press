"use client";

import type { AccountAddressBookPageProps } from "../../types";
import { PageTransition } from "~/components/page-animations";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import { ViiAccountLayout } from "./vii-account-layout";

export function ViiAddressBookPage({ customer }: AccountAddressBookPageProps) {
  return (
    <PageTransition>
      <ViiAccountLayout
        heading="Address Book"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Account", href: "/account/settings" },
          { label: "Address Book" },
        ]}
      >
        <AddressBookContent customer={customer} />
      </ViiAccountLayout>
    </PageTransition>
  );
}
