import { DEFAULT_DASHBOARD_LAYOUT } from "~/lib/dashboard/layout-schema";

import { TrailHeader } from "../_components/trail-header";
import {
  DashboardHeaderSkeleton,
  DashboardSkeleton,
} from "./_components/dashboard-skeleton";

export default function DashboardLoading() {
  return (
    <>
      <TrailHeader breadcrumbs={[]} />

      <div
        className="bg-muted min-h-screen"
        aria-busy="true"
        aria-label="Loading dashboard"
      >
        <span className="sr-only">Loading dashboard…</span>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <DashboardHeaderSkeleton />
          <DashboardSkeleton layout={DEFAULT_DASHBOARD_LAYOUT} />
        </div>
      </div>
    </>
  );
}
