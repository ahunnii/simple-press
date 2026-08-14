"use client";

import type { AccountAddressBookPageProps } from "../../types";
import { PageTransition } from "~/components/page-animations";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import { PinkAccountLayout } from "./pink-account-layout";

export function PinkAddressBookPage({
  business,
  customer,
}: AccountAddressBookPageProps) {
  return (
    <PageTransition>
      <PinkAccountLayout
        title="Address Book"
        description="Save an address for faster checkout. The default one is used automatically unless you pick another."
      >
        <AddressBookContent
          customer={customer}
          salesCountries={business.salesCountries}
        />
      </PinkAccountLayout>
    </PageTransition>
  );
}
