import { Skeleton } from "~/components/ui/skeleton";

import { TrailHeader } from "../_components/trail-header";

export default function FinancesLoading() {
  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Finances" }]} />

      <div
        className="admin-container space-y-6"
        aria-busy="true"
        aria-label="Loading finances"
      >
        <span className="sr-only">Loading finances…</span>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>

        {/* Money in card */}
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="mb-4 space-y-1.5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-72" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-7 w-24" />
            </div>
            <div className="flex items-center justify-between pl-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center justify-between pl-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center justify-between pl-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="mt-4 h-3 w-full max-w-lg" />
        </div>

        {/* What Stripe took card */}
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="mb-4 space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-4 w-80" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-2 h-8 w-24" />
              </div>
            ))}
          </div>
        </div>

        {/* Set aside card */}
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="mb-4 space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-4 w-64" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-8 w-28" />
            </div>
            <div className="rounded-lg border p-4">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="mt-2 h-8 w-28" />
            </div>
          </div>

          <Skeleton className="mt-4 h-3 w-full max-w-md" />
        </div>

        <Skeleton className="h-3 w-full max-w-xl" />
      </div>
    </>
  );
}
