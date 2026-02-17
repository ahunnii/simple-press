import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { TrailHeader } from "~/app/admin/_components/trail-header";

import { PageEditor } from "../../_components/page-editor";

type Props = {
  params: Promise<{ id: string }>;
};
export default async function EditPagePage({ params }: Props) {
  const { id } = await params;
  const business = await api.business.get();

  if (!business) {
    notFound();
  }

  const page = await api.content.getPage({
    id,
  });

  if (!page) {
    notFound();
  }

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Custom Pages", href: "/admin/content/pages" },
          { label: page.title },
        ]}
      />

      <PageEditor business={business} page={page} />
    </>
  );
}

export const generateMetadata = async ({ params }: Props) => {
  const { id } = await params;
  const page = await api.content.getPage({
    id,
  });
  return {
    title: page?.title ?? "Edit Page",
  };
};
