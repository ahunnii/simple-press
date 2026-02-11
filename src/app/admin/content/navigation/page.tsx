import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

import { NavigationBuilder } from "../_components/navigation-builder";

export default async function NavigationPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      business: {
        include: {
          siteContent: true,
          pages: {
            where: { published: true },
            select: { title: true, slug: true },
          },
        },
      },
    },
  });

  if (!user?.business) redirect("/admin/welcome");

  let siteContent = user.business.siteContent;
  siteContent ??= await db.siteContent.create({
    data: { businessId: user.business.id },
  });

  return (
    <NavigationBuilder business={user.business} siteContent={siteContent} />
  );
}
