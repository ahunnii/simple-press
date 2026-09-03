"use client";

import type { AccountAddressBookPageProps } from "../../types";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import { BambooAccountLayout } from "./bamboo-account-layout";

/** See `bamboo-account-settings-page.tsx` — same bridge-token contract. */
export function BambooAddressBookPage({
  business,
  customer,
}: AccountAddressBookPageProps) {
  return (
    <BambooAccountLayout heading="Address Book">
      <div className="flex flex-col gap-6">
        <AddressBookContent
          customer={customer}
          salesCountries={business.salesCountries}
        />
      </div>
    </BambooAccountLayout>
  );
}
