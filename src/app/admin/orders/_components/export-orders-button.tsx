"use client";

import { useSearchParams } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { downloadCsv } from "~/lib/csv-download";
import {
  ORDER_FULFILLMENT_DEFAULT,
  ORDER_FULFILLMENT_VALUES,
  ORDER_PAYMENT_DEFAULT,
  ORDER_PAYMENT_VALUES,
  ORDER_STATUS_DEFAULT,
  ORDER_STATUS_VALUES,
} from "~/lib/validators/order";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { pickParam } from "~/app/admin/_lib/table-query";

/**
 * Exports the orders list as a CSV, respecting the current URL filters
 * (status, search, fulfillment, paymentStatus) so it matches what the
 * owner sees in the table.
 */
export function ExportOrdersButton() {
  const searchParams = useSearchParams();

  const exportMutation = api.export.exportOrders.useMutation({
    onSuccess: (data) => {
      downloadCsv(data.csv, data.filename);
      toast.success(
        `Exported ${data.orderCount} order${data.orderCount !== 1 ? "s" : ""}`,
      );
    },
    onError: (error) => {
      toast.error(error.message || "Failed to export orders");
    },
  });

  const handleExport = () => {
    // Whitelisted with the same tuples the table's filters use, rather than
    // forwarded raw: the export input is `z.enum`, so a stale `?status=bogus`
    // bookmark would BAD_REQUEST the export while the table beside it happily
    // renders the default view. `pickParam` falls back instead of throwing, so
    // the two agree on what a junk param means. `search` is free text and
    // truncated server-side.
    exportMutation.mutate({
      status: pickParam(
        searchParams.get("status") ?? undefined,
        ORDER_STATUS_VALUES,
        ORDER_STATUS_DEFAULT,
      ),
      search: searchParams.get("search") ?? undefined,
      fulfillment: pickParam(
        searchParams.get("fulfillment") ?? undefined,
        ORDER_FULFILLMENT_VALUES,
        ORDER_FULFILLMENT_DEFAULT,
      ),
      paymentStatus: pickParam(
        searchParams.get("paymentStatus") ?? undefined,
        ORDER_PAYMENT_VALUES,
        ORDER_PAYMENT_DEFAULT,
      ),
    });
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={exportMutation.isPending}
    >
      {exportMutation.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Export CSV
    </Button>
  );
}
