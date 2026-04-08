import { notFound, redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";
import { HappyBambooAddressBookPage } from "../../_templates/happy-bamboo/account/happy-bamboo-address-book-page";

export const metadata = {
  title: "Address Book",
};

export default async function AddressBookPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/sign-in?redirect=/account/address-book");
  }

  const [business, customer] = await Promise.all([
    api.business.simplifiedGet(),
    api.customer.getMyProfile(),
  ]);

  if (!business) notFound();

  if (business.templateId === "happy-bamboo") {
    return <HappyBambooAddressBookPage business={business} customer={customer} />;
  }

  // Generic fallback for other templates
  return (
    <div className="mx-auto max-w-xl py-20 px-4">
      <h1 className="mb-6 text-2xl font-bold">Address Book</h1>
      <p className="text-muted-foreground text-sm">
        Address management is not yet available for this template.
      </p>
    </div>
  );
}
