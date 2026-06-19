import { notFound, redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

import { getTemplate } from "../../_templates/registry";

export const metadata = {
  title: "Preferences",
};

export default async function PreferencesPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/sign-in?redirect=/account/preferences");
  }

  const [business, customer] = await Promise.all([
    api.business.simplifiedGet(),
    api.customer.getMyProfile(),
  ]);

  if (!business) notFound();

  const t = getTemplate(business.templateId);

  return <t.PreferencesPage business={business} customer={customer} />;
}
