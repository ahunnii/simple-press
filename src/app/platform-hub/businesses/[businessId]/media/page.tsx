import { notFound } from "next/navigation";

import type { MediaPageParams } from "~/app/admin/media/_lib/build-media-page";
import { formatBytes } from "~/lib/format-bytes";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { MediaLibraryClient } from "~/app/admin/media/_components/media-library-client";
import { MediaUploadButton } from "~/app/admin/media/_components/media-upload-button";
import { buildMediaLibraryPage } from "~/app/admin/media/_lib/build-media-page";

import { PlatformTrailHeader } from "../../../_components/platform-trail-header";

type Props = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<MediaPageParams>;
};

/**
 * Platform hub Media Library — a PLATFORM_ADMIN browsing/uploading/deleting
 * any business's files from `platform.*` (the hub layout already gates on
 * PLATFORM_ADMIN; every `platformMedia.*` procedure re-checks it). Same UI and
 * page pipeline as the shop's `/admin/media`, pointed at the `platform` scope.
 */
export default async function PlatformBusinessMediaPage({
  params,
  searchParams,
}: Props) {
  const { businessId } = await params;
  const business = await api.platform.getBusiness(businessId).catch(() => null);
  if (!business) notFound();

  const [query, data] = await Promise.all([
    searchParams,
    api.platformMedia
      .list({ businessId: business.id })
      .catch(rethrowTrpcForErrorBoundary),
  ]);

  const { grid, totalBytes } = buildMediaLibraryPage(data.items, query);
  const fileCount = grid.totalFiles;
  const basePath = `/businesses/${business.id}/media`;

  return (
    <>
      <PlatformTrailHeader
        breadcrumbs={[
          { label: "Businesses", href: "/businesses" },
          { label: business.name, href: `/businesses/${business.id}` },
          { label: "Media Library" },
        ]}
      />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Media Library</h1>
            <p>
              {fileCount.toLocaleString()} {fileCount === 1 ? "file" : "files"}{" "}
              &middot; {formatBytes(totalBytes)} used
            </p>
          </div>
          <MediaUploadButton businessId={business.id} />
        </div>

        {!data.mediaEnabled && (
          <p className="bg-muted text-muted-foreground mb-6 rounded-md border px-4 py-3 text-sm">
            Media Library flag is off for this business — owners can&apos;t see
            this page, but you can still manage files here.
          </p>
        )}

        <MediaLibraryClient
          {...grid}
          basePath={basePath}
          scope={{ kind: "platform", businessId: business.id }}
          canBulkDelete
          canUpload
        />
      </div>
    </>
  );
}

export const metadata = {
  title: "Media Library",
};
