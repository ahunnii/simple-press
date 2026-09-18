"use client";

import type { AccountAddressBookPageProps } from "../../types";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import { DreamReveal } from "../shared/dream-reveal";
import { DreamAccountLayout } from "./dream-account-layout";

export function DreamAddressBookPage({
  business,
  customer,
}: AccountAddressBookPageProps) {
  return (
    <DreamAccountLayout
      heading="Address Book"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Address Book" },
      ]}
    >
      <DreamReveal>
        <AddressBookContent
          customer={customer}
          salesCountries={business.salesCountries}
        />
      </DreamReveal>
    </DreamAccountLayout>
  );
}
