import { Skeleton } from "~/components/ui/skeleton";

import { TrailHeader } from "../_components/trail-header";

export default function AnalyticsLoading() {
  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Analytics" }]} />

      <div
        className="admin-container"
        aria-busy="true"
        aria-label="Loading analytics"
      >
        <span className="sr-only">Loading analytics…</span>

        {/* Page header — mirrors admin-header flex row */}
        <div className="admin-header">
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-64" />
          </div>
          {/* Range selector button group */}
          <div className="flex gap-1">
            <Skeleton className="h-9 w-10 rounded-md" />
            <Skeleton className="h-9 w-12 rounded-md" />
            <Skeleton className="h-9 w-12 rounded-md" />
          </div>
        </div>

        <div className="space-y-6">
          {/* Overview stat cards — 4 columns on large, 2 on small */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </div>
                <Skeleton className="h-7 w-20" />
                <Skeleton className="mt-1 h-3 w-28" />
              </div>
            ))}
          </div>

          {/* Pageviews area chart */}
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <Skeleton className="mb-4 h-5 w-24" />
            <Skeleton className="h-[280px] w-full rounded-md" />
          </div>

          {/* Top pages + top referrers — 2 columns on large */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top pages */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <Skeleton className="mb-4 h-5 w-24" />
              <div className="space-y-0">
                {/* Table header */}
                <div className="flex justify-between border-b pb-2">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-10" />
                </div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b py-2 last:border-0"
                  >
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-3.5 w-10" />
                  </div>
                ))}
              </div>
            </div>

            {/* Top referrers */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <Skeleton className="mb-4 h-5 w-28" />
              <div className="space-y-0">
                <div className="flex justify-between border-b pb-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-10" />
                </div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b py-2 last:border-0"
                  >
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3.5 w-10" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Commerce events section */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-xl border p-6 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                  <Skeleton className="h-7 w-12" />
                  <Skeleton className="mt-1 h-3 w-24" />
                </div>
              ))}
            </div>
          </div>

          {/* Embed engagement section */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-xl border p-6 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                  <Skeleton className="h-7 w-10" />
                  <Skeleton className="mt-1 h-3 w-48" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
