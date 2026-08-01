import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";

import { VideoSourcesClient } from "../_components/video-sources-client";
import { TrailHeader } from "../../_components/trail-header";

export default async function AdminVideoSourcesPage() {
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("videos")) {
    return <GenericFeatureDisabledPage featureName="Videos" />;
  }

  const sources = await api.videos
    .listSources()
    .catch(rethrowTrpcForErrorBoundary);

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Videos", href: "/admin/videos" },
          { label: "Channels & Playlists" },
        ]}
      />
      <VideoSourcesClient sources={sources ?? []} />
    </>
  );
}

export const metadata = {
  title: "Channels & Playlists",
};
