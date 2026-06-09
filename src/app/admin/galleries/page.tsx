import Link from "next/link";
import { Plus } from "lucide-react";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";

import { TrailHeader } from "../_components/trail-header";
import { GalleriesList } from "./_components/galleries-list";

export default async function GalleriesPage() {
  const galleries = await api.gallery.list().catch(rethrowTrpcForErrorBoundary);
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

        <GalleriesList galleries={galleries ?? []} />
      </div>
    </>
  );
}

export const metadata = {
  title: "Galleries",
};
