import { api } from "~/trpc/server";

import { SiteHeader } from "../_components/site-header";
import { PageClientDataTable } from "./_components/page-client-data-table";

export default async function AdminPagesPage() {
  const pages = await api.page.getAll();
  return (
    <>
      <SiteHeader title="Pages" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 p-4 md:gap-6 md:py-6">
            <PageClientDataTable data={pages ?? []} />
          </div>
        </div>
      </div>
    </>
  );
}
