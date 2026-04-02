import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { TrailHeader } from "../../_components/trail-header";
import { BlogPagesList } from "./_components/blog-pages-list";

export default async function BlogListPage() {
  const business = await api.business.getWith({ includeBlog: true });
  if (!business) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Blog" },
        ]}
      />
      <BlogPagesList business={business} />
    </>
  );
}

export const metadata = {
  title: "Blog",
};
