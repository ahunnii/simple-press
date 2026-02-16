import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { HydrateClient } from "~/trpc/server";

import { GalleryEditor } from "../_components/galley-editor";
import { SiteHeader } from "../../_components/site-header";

export default async function GalleryEditPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      business: { select: { id: true } },
    },
  });

  if (!user?.business) {
    redirect("/admin/welcome");
  }

  const gallery = await db.gallery.findFirst({
    where: {
      id: params.id,
      businessId: user.business.id,
    },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!gallery) {
    notFound();
  }

  return (
    <HydrateClient>
      <SiteHeader title={gallery.name} />
      <GalleryEditor gallery={gallery} businessId={user.business.id} />
    </HydrateClient>
  );
}
