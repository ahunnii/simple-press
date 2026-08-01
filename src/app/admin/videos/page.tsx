import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";

import { TrailHeader } from "../_components/trail-header";
import { VideosClient } from "./_components/videos-client";

export default async function AdminVideosPage() {
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("videos")) {
    return <GenericFeatureDisabledPage featureName="Videos" />;
  }

  const [videos, sources] = await Promise.all([
    api.videos.getAll().catch(rethrowTrpcForErrorBoundary),
    api.videos.listSources().catch(rethrowTrpcForErrorBoundary),
  ]);

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Videos" }]} />
      <VideosClient videos={videos ?? []} sources={sources ?? []} />
    </>
  );
}

export const metadata = {
  title: "Videos",
};
