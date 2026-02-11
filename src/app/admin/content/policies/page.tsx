/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

import { PoliciesManager } from "../_components/policies-manager";

export default async function PoliciesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      business: {
        include: {
          pages: {
            where: { type: "policy" },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!user?.business) redirect("/admin/welcome");

  return <PoliciesManager business={user.business as any} />;
}
