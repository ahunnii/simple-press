import { api } from "~/trpc/server";
import { SiteHeader } from "../_components/site-header";
import { AnnouncementClientDataTable } from "./_components/announcement-client-data-table";

export default async function AdminAnnouncementsPage() {
  const announcements = await api.announcement.getAll();
  return (
    <>
      <SiteHeader title="Announcements" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 p-4 md:gap-6 md:py-6">
            <AnnouncementClientDataTable data={announcements ?? []} />
          </div>
        </div>
      </div>
    </>
  );
}
