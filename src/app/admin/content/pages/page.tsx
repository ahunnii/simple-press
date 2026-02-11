import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

import { PagesList } from "../_components/pages-list";

export default async function PagesListPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      business: {
        include: {
          pages: {
            where: { type: "page" },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!user?.business) {
    redirect("/admin/welcome");
  }

  return <PagesList business={user.business} />;
}
