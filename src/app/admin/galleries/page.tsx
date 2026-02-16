import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { Button } from "~/components/ui/button";

import { SiteHeader } from "../_components/site-header";
import { GalleriesList } from "./_components/galleries-list";

export default async function GalleriesPage() {
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
    <>
      <SiteHeader title="Galleries" />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Galleries</h1>
            <p>Create and manage image galleries</p>
          </div>
          <Button asChild>
            <Link href="/admin/galleries/new">
              <Plus className="mr-2 h-4 w-4" />
              New Gallery
            </Link>
          </Button>
        </div>

        <GalleriesList businessId={user.business.id} />
      </div>
    </>
  );
}
