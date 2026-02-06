import { AppSidebar } from "~/app/admin/_components/app-sidebar";
import { ChartAreaInteractive } from "~/app/admin/_components/chart-area-interactive";
import { DataTable } from "~/app/admin/_components/data-table";
import { SectionCards } from "~/app/admin/_components/section-cards";
import { SiteHeader } from "~/app/admin/_components/site-header";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";

import { getSession } from "~/server/better-auth/server";

export default async function AdminDashboardPage() {
  const session = await getSession();
  return (
    <>
      <SiteHeader title="Dashboard" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="px-4 pt-12 lg:px-6">
            <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
              Welcome back,{" "}
              <span className="text-primary">
                {session?.user?.name ?? "there"}
              </span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Here are some quick links to get you started.
            </p>
          </div>
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <SectionCards />
            {/* <div className="px-4 lg:px-6">
              <ChartAreaInteractive />
            </div> */}
            {/* <DataTable data={data} /> */}
          </div>

          <div className="mt-4 px-4">
            <h2 className="text-lg font-semibold">
              Export Site to WordPress (WIP)
            </h2>
            <p className="text-muted-foreground">
              Objective is to export the site data to a wordpress site. This is
              currently a work in progress / demo.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
