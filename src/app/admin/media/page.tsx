import type { MediaPageParams } from "./_lib/build-media-page";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { MediaLibraryClient } from "./_components/media-library-client";
import { MediaUploadButton } from "./_components/media-upload-button";
import { buildMediaLibraryPage } from "./_lib/build-media-page";

type Props = {
  searchParams: Promise<MediaPageParams>;
};

export default async function MediaLibraryPage({ searchParams }: Props) {
  // `layout.tsx` already gates this whole subtree with `flags.isEnabled("media")`,
  // so no feature check here. `requireAdminAccess()` runs again purely for the
  // resolved membership role — `media.bulkDelete` is `ownerOnlyProcedure`, and
  // the client OMITS the bulk affordances entirely when this is false.
  const { session, membershipRole } = await requireAdminAccess();
  const canBulkDelete =
    session.user.platformRole === "PLATFORM_ADMIN" ||
    membershipRole === "OWNER";

  // Mirrors `requireBusinessManager` in src/app/api/upload/route.ts (platform
  // admin, OWNER or MANAGER). Always the HOST's business — a platform admin
  // managing another business's library does it from the platform hub.
  const canUpload =
    session.user.platformRole === "PLATFORM_ADMIN" ||
    membershipRole === "OWNER" ||
    membershipRole === "MANAGER";

  const params = await searchParams;

  const data = await api.media.list({}).catch(rethrowTrpcForErrorBoundary);

  const { grid } = buildMediaLibraryPage(data.items, params);

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Media Library" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Media Library</h1>
            <p>Upload, browse, download, and manage your media files</p>
          </div>
          {canUpload && <MediaUploadButton />}
        </div>

        <MediaLibraryClient
          {...grid}
          basePath="/admin/media"
          scope={{ kind: "shop" }}
          canBulkDelete={canBulkDelete}
          canUpload={canUpload}
        />
      </div>
    </>
  );
}

export const metadata = {
  title: "Media Library",
};
