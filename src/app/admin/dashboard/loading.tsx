import { Skeleton } from "~/components/ui/skeleton";
import { TrailHeader } from "../_components/trail-header";

export default function DashboardLoading() {
  return (
    <>
      <TrailHeader breadcrumbs={[]} />

      <div
        className="min-h-screen bg-muted"
        aria-busy="true"
        aria-label="Loading dashboard"
      >
        <span className="sr-only">Loading dashboard…</span>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Page heading */}
          <div className="mb-8">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="mt-2 h-5 w-72" />
          </div>

          {/* Stat cards — 4 columns on large, 2 on medium, 1 on small */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border bg-card p-6 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </div>
                <Skeleton className="h-7 w-20" />
                <Skeleton className="mt-1 h-3 w-16" />
              </div>
            ))}
          </div>

          {/* Two-column: recent orders + low stock alerts */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent orders card */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg p-3"
                  >
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-10" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-14" />
                  </div>
                ))}
              </div>
            </div>

            {/* Low stock alerts card */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-8 w-28 rounded-md" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Revenue chart */}
          <div className="mb-8 rounded-xl border bg-card p-6 shadow-sm">
            <Skeleton className="mb-4 h-5 w-48" />
            <Skeleton className="h-[300px] w-full rounded-md" />
          </div>

          {/* Top products */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <Skeleton className="mb-4 h-5 w-52" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg p-3">
                  <Skeleton className="h-6 w-6 shrink-0 rounded" />
                  <Skeleton className="h-16 w-16 shrink-0 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="space-y-1 text-right">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
