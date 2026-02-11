/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

import { PageEditor } from "../../_components/page-editor";

export default async function EditPagePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      businessId: true,
      business: { select: { id: true, name: true } },
    },
  });

  if (!user?.business) redirect("/admin/welcome");

  const page = await db.page.findUnique({
    where: { id: params.id },
  });

  if (!page || page?.businessId !== user.business.id) {
    notFound();
  }

  return <PageEditor business={user.business} page={page as any} />;
}
