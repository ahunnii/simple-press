import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";

import { TrailHeader } from "../_components/trail-header";
import { GalleriesList } from "./_components/galleries-list";

export default async function GalleriesPage() {
  const business = await api.business.get();
  if (!business) notFound();

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Galleries" }]} />

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

        <GalleriesList businessId={business.id} />
      </div>
    </>
  );
}

export const metadata = {
  title: "Galleries",
};
