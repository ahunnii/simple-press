import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { HydrateClient } from "~/trpc/server";

import { NewGalleryForm } from "../_components/new-gallery-form";
import { SiteHeader } from "../../_components/site-header";

export default async function NewGalleryPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      business: { select: { id: true, name: true } },
    },
  });

  if (!user?.business) {
    redirect("/admin/welcome");
  }

  return (
    <HydrateClient>
      <SiteHeader title="New Gallery" />
      <NewGalleryForm businessId={user.business.id} />
    </HydrateClient>
  );
}
