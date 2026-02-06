import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { SiteHeader } from "../../_components/site-header";
import { AnnouncementForm } from "../_components/announcement-form";

type Props = {
  params: Promise<{ announcementId: string }>;
};
export default async function AdminAnnouncementPage({ params }: Props) {
  const { announcementId } = await params;
  const announcement = await api.announcement.getById(announcementId);
  if (!announcement) notFound();

  const defaultValues = {
    title: announcement.title,
    content: announcement.content,
  };

  return (
    <>
      <SiteHeader title={announcement.title} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 p-4 md:gap-6 md:py-6">
            <AnnouncementForm
              announcementId={announcementId}
              defaultValues={defaultValues}
            />
          </div>
        </div>
      </div>
    </>
  );
}
