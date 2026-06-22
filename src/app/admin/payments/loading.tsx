import { Skeleton } from "~/components/ui/skeleton";
import { TrailHeader } from "../_components/trail-header";

export default function PaymentsLoading() {
  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Payments" }]} />

      <div
        className="admin-container space-y-6"
        aria-busy="true"
        aria-label="Loading payments"
      >
        <span className="sr-only">Loading payments…</span>

        {/* INFORM Act compliance card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-80" />
            </div>
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>

          {/* Transaction progress bar */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>

            {/* Revenue progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>

            <Skeleton className="h-3 w-full max-w-lg" />
          </div>
        </div>

        {/* Stripe Balance card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-4 w-56" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="mt-2 h-8 w-28" />
            </div>
            <div className="rounded-lg border p-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-2 h-8 w-24" />
            </div>
            <Skeleton className="h-3 w-full max-w-md sm:col-span-2" />
          </div>
        </div>

        {/* Recent Payouts card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-44" />
          </div>

          {/* Table header */}
          <div className="grid grid-cols-3 border-b pb-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-28" />
          </div>

          {/* Table rows */}
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-3 items-center py-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
