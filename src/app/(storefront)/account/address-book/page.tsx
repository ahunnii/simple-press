import { notFound, redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

import { getTemplate } from "../../_templates/registry";

export const metadata = {
  title: "Address Book",
  robots: { index: false, follow: false },
};

export default async function AddressBookPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/sign-in?redirectTo=/account/address-book");
  }

  const [business, customer] = await Promise.all([
    api.business.simplifiedGet(),
    api.customer.getMyProfile(),
  ]);

  if (!business) notFound();

  const t = getTemplate(business.templateId);

  return <t.AddressBookPage business={business} customer={customer} />;
}
