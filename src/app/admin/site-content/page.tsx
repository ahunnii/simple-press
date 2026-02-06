import { api } from "~/trpc/server";
import { SiteHeader } from "../_components/site-header";
import { SiteContentClientDataTable } from "./_components/site-content-client-data-table";

export default async function AdminSiteContentPage() {
  const items = await api.siteContent.getAll();
  return (
    <>
      <SiteHeader title="Site content" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 p-4 md:gap-6 md:py-6">
            <SiteContentClientDataTable data={items ?? []} />
          </div>
        </div>
      </div>
    </>
  );
}
