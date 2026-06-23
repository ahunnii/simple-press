import { notFound } from "next/navigation";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { BlogPagesList } from "./_components/blog-pages-list";

export default async function BlogListPage() {
  const business = await api.business
    .getWith({ includeBlog: true })
    .catch(rethrowTrpcForErrorBoundary);

  if (!business) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Blog" },
        ]}
      />
      <HubSubNav hub="content" />
      <BlogPagesList business={business} />
    </>
  );
}

export const metadata = {
  title: "Blog",
};
