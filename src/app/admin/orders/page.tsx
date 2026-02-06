import { api } from "~/trpc/server";
import { SiteHeader } from "../_components/site-header";
import { ClubClientDataTable } from "./_components/club-client-data-table";

export const metadata = {
  title: "Clubs Admin",
};

export default async function AdminClubsPage() {
  const clubs = await api.club.getAll();
  return (
    <>
      <SiteHeader title="Clubs" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 p-4 md:gap-6 md:py-6">
            <ClubClientDataTable data={clubs ?? []} />
          </div>
        </div>
      </div>
    </>
  );
}
