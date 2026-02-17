import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

import { SiteHeader } from "../../_components/site-header";
import { FeatureFlagsEditor } from "./_components/feature-flags-editor";

export default async function FeatureFlagsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { business: { select: { id: true, name: true } } },
  });

  if (!user?.business) redirect("/admin/welcome");

  const { flags } = await getBusinessFlags(user.business.id);

  return (
    <>
      <SiteHeader title="Features" />
      <FeatureFlagsEditor businessId={user.business.id} initialFlags={flags} />
    </>
  );
}
