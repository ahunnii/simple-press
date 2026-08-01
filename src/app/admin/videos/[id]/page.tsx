import { notFound } from "next/navigation";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { VideoForm } from "../_components/video-form";
import { TrailHeader } from "../../_components/trail-header";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditVideoPage({ params }: PageProps) {
  const { id } = await params;

  const video = await api.videos.getById(id).catch(rethrowTrpcForErrorBoundary);

  if (!video) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Videos", href: "/admin/videos" },
          { label: video.titleOverride ?? video.title },
        ]}
      />
      <VideoForm video={video} />
    </>
  );
}

export const generateMetadata = async ({ params }: PageProps) => {
  const { id } = await params;
  const video = await api.videos.getById(id).catch(rethrowTrpcForErrorBoundary);
  if (!video) notFound();
  return {
    title: `Edit ${video.titleOverride ?? video.title}`,
  };
};
