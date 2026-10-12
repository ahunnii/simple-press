import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

export type OversellRow = {
  id: string;
  product: { id: string; name: string } | null;
  variant: { name: string } | null;
  order: { id: string; orderNumber: number } | null;
  previousQty: number;
};

/** Items sold beyond stock in the last 30 days. Pinned; renders nothing when empty. */
export function OversellAlert({ oversells }: { oversells: OversellRow[] }) {
  if (oversells.length === 0) return null;

  return (
    <div className="mb-6">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Oversold items need attention</AlertTitle>
        <AlertDescription>
          <p className="mb-3">
            The following items were sold beyond available stock in the last 30
            days. Review the affected orders and consider restocking.
          </p>
          <div className="space-y-2">
            {oversells.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
              >
                <div>
                  <span className="font-medium">
                    {row.product?.name ?? "Unknown product"}
                  </span>
                  {row.variant?.name && (
                    <span className="ml-1 text-red-700">
                      — {row.variant.name}
                    </span>
                  )}
                  <span className="ml-2 text-xs text-red-600">
                    (was {row.previousQty} in stock)
                  </span>
                </div>
                {row.order && (
                  <Link
                    href={`/admin/orders/${row.order.id}`}
                    className="shrink-0 text-xs font-medium text-red-700 underline-offset-2 hover:underline"
                  >
                    Order #{row.order.orderNumber}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
