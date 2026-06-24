"use client";

import type { AccountAddressBookPageProps } from "../../types";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import { ViiReveal } from "../shared/vii-reveal";
import { ViiAccountLayout } from "./vii-account-layout";

export function ViiAddressBookPage({
  business,
  customer,
}: AccountAddressBookPageProps) {
  return (
    <ViiAccountLayout
      heading="Address Book"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Address Book" },
      ]}
    >
      <ViiReveal>
        <AddressBookContent
          customer={customer}
          salesCountries={business.salesCountries}
        />
      </ViiReveal>
    </ViiAccountLayout>
  );
}
