import Link from "next/link";
import {
  ArrowRight,
  Clock,
  MessageSquareQuote,
  ShieldAlert,
  Truck,
} from "lucide-react";

/**
 * Needs-attention strip. Pinned; renders nothing when there is nothing to act
 * on.
 */
export function AttentionStrip({
  ordersToFulfillCount,
  awaitingPaymentCount,
  missingPolicies,
  pendingTestimonialsCount,
}: {
  ordersToFulfillCount: number;
  awaitingPaymentCount: number;
  /** True when Terms of Service or Refund Policy isn't published+non-empty. */
  missingPolicies: boolean;
  /** Pending testimonials; the caller passes 0 when the feature is off. */
  pendingTestimonialsCount: number;
}) {
  const hasAttentionItems =
    ordersToFulfillCount > 0 ||
    awaitingPaymentCount > 0 ||
    missingPolicies ||
    pendingTestimonialsCount > 0;
  if (!hasAttentionItems) return null;

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {ordersToFulfillCount > 0 && (
        <Link
          href="/admin/orders?status=open&fulfillment=unfulfilled&paymentStatus=paid"
          className="group"
        >
          <div className="flex items-center gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 transition-colors group-hover:bg-amber-100">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 group-hover:bg-amber-200">
              <Truck className="h-4 w-4 text-amber-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {ordersToFulfillCount}{" "}
                {ordersToFulfillCount === 1 ? "order" : "orders"} to fulfill
              </p>
              <p className="text-xs text-amber-700">Paid but not yet shipped</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-amber-600 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      )}
      {awaitingPaymentCount > 0 && (
        <Link href="/admin/orders?paymentStatus=pending" className="group">
          <div className="flex items-center gap-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 transition-colors group-hover:bg-blue-100">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 group-hover:bg-blue-200">
              <Clock className="h-4 w-4 text-blue-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-blue-900">
                {awaitingPaymentCount}{" "}
                {awaitingPaymentCount === 1 ? "order" : "orders"} awaiting
                payment
              </p>
              <p className="text-xs text-blue-700">
                Pending payment confirmation
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-blue-600 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      )}
      {missingPolicies && (
        <Link href="/admin/content/policies" className="group">
          <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition-colors group-hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/40 dark:group-hover:bg-slate-900/60">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 group-hover:bg-slate-300 dark:bg-slate-800 dark:group-hover:bg-slate-700">
              <ShieldAlert className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-semibold">
                No store policies published
              </p>
              <p className="text-muted-foreground text-xs">
                Add a Terms of Service &amp; Refund Policy
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 dark:text-slate-400" />
          </div>
        </Link>
      )}
      {pendingTestimonialsCount > 0 && (
        <Link href="/admin/testimonials" className="group">
          <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition-colors group-hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/40 dark:group-hover:bg-slate-900/60">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 group-hover:bg-slate-300 dark:bg-slate-800 dark:group-hover:bg-slate-700">
              <MessageSquareQuote className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-semibold">
                {pendingTestimonialsCount}{" "}
                {pendingTestimonialsCount === 1
                  ? "testimonial"
                  : "testimonials"}{" "}
                waiting for approval
              </p>
              <p className="text-muted-foreground text-xs">
                Review before they appear on your site
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 dark:text-slate-400" />
          </div>
        </Link>
      )}
    </div>
  );
}
