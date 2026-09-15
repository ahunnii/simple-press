"use client";

import type { AccountAddressBookPageProps } from "../../types";
import { AddressBookContent } from "~/app/(storefront)/_components/account/address-components";

import { OliveReveal } from "../shared";
import { OliveAccountLayout } from "./olive-account-layout";

/** OliveAddressBookPage — wraps the shared `AddressBookContent`; the mutations live there. */
export function OliveAddressBookPage({
  business,
  customer,
}: AccountAddressBookPageProps) {
  return (
    <OliveAccountLayout
      heading="Address Book"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Address Book" },
      ]}
    >
      <OliveReveal>
        <AddressBookContent
          customer={customer}
          salesCountries={business.salesCountries}
        />
      </OliveReveal>
    </OliveAccountLayout>
  );
}
