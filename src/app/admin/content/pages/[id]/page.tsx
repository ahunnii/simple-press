import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { api } from "~/trpc/server";
import { TrailHeader } from "~/app/admin/_components/trail-header";

import { PageEditor } from "../_components/page-editor";

type Props = {
  params: Promise<{ id: string }>;
};
export default async function EditPagePage({ params }: Props) {
  const { id } = await params;

  const [page, flags] = await Promise.all([
    api.content.getPageById({ id }),
    getBusinessFlags(),
  ]);

  if (!page) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Pages", href: "/admin/content/pages" },
          { label: page.title },
        ]}
      />

      <PageEditor page={page} galleriesEnabled={flags.isEnabled("galleries")} embedsEnabled={flags.isEnabled("embeds")} />
    </>
  );
}

export const generateMetadata = async ({ params }: Props) => {
  const { id } = await params;
  const page = await api.content.getPageById({
    id,
  });
  return {
    title: `Edit ${page?.title ?? "Page"}`,
  };
};
