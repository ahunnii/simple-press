import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

import { CollectionsPage } from "./_components/collections-page";

export default async function AdminCollectionsPage() {
  // Get session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  // Get user's business
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { businessId: true },
  });

  if (!user?.businessId) {
    redirect("/admin/welcome");
  }

  return <CollectionsPage businessId={user.businessId} />;
}
