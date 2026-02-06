import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { SiteHeader } from "../../_components/site-header";
import { PageForm } from "../_components/page-form";

type Props = {
  params: Promise<{ pageId: string }>;
};

export default async function AdminPageDetailPage({ params }: Props) {
  const { pageId } = await params;
  const page = await api.page.getById(pageId);
  if (!page) notFound();

  const defaultValues = {
    slug: page.slug,
    title: page.title,
    content: (page.content ?? { type: "doc", content: [] }) as Record<
      string,
      unknown
    >,
  };

  return (
    <>
      <SiteHeader title={page.title} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 p-4 md:gap-6 md:py-6">
            <PageForm pageId={pageId} defaultValues={defaultValues} />
          </div>
        </div>
      </div>
    </>
  );
}
