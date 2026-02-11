import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

import { SEOEditor } from "../_components/seo-editor";

export default async function SEOPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      business: {
        include: {
          siteContent: true,
        },
      },
    },
  });

  if (!user?.business) redirect("/admin/welcome");

  let siteContent = user.business.siteContent;
  siteContent ??= await db.siteContent.create({
    data: { businessId: user.business.id },
  });

  return <SEOEditor business={user.business} siteContent={siteContent} />;
}
