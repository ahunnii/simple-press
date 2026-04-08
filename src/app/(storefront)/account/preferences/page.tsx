import { notFound, redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";
import { HappyBambooPreferencesPage } from "../../_templates/happy-bamboo/account/happy-bamboo-preferences-page";

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

  if (business.templateId === "happy-bamboo") {
    return <HappyBambooPreferencesPage business={business} customer={customer} />;
  }

  // Generic fallback for other templates
  return (
    <div className="mx-auto max-w-xl py-20 px-4">
      <h1 className="mb-6 text-2xl font-bold">Preferences</h1>
      <p className="text-muted-foreground text-sm">
        Preference management is not yet available for this template.
      </p>
    </div>
  );
}
