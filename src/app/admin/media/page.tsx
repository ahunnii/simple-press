import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { MediaLibraryClient } from "./_components/media-library-client";

type Props = {
  searchParams: Promise<{
    businessId?: string;
  }>;
};

export default async function MediaLibraryPage({ searchParams }: Props) {
  const params = await searchParams;

  const data = await api.media
    .list({ businessId: params.businessId })
    .catch(rethrowTrpcForErrorBoundary);

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Media Library" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Media Library</h1>
            <p>Browse, download, and manage your uploaded media files</p>
          </div>
        </div>

        {params.businessId && (
          <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <strong>Platform Admin View:</strong> Viewing media for business{" "}
            <code className="rounded bg-amber-100 px-1 font-mono text-xs dark:bg-amber-900">
              {data.businessId}
            </code>
          </div>
        )}

        <MediaLibraryClient items={data.items} businessId={data.businessId} />
      </div>
    </>
  );
}

export const metadata = {
  title: "Media Library",
};
