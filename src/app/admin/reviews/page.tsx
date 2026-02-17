import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

import { SiteHeader } from "../_components/site-header";
import { ReviewsAdminList } from "./_components/reviews-admin-list";

export default async function ReviewsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { business: { select: { id: true } } },
  });
  if (!user?.business) redirect("/admin/dashboard");

  return (
    <>
      <SiteHeader title="Product Reviews" />
      <ReviewsAdminList businessId={user.business.id} />
    </>
  );
}
