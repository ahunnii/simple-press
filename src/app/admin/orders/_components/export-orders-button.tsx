"use client";

import { useSearchParams } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { downloadCsv } from "~/lib/csv-download";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

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
    exportMutation.mutate({
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      fulfillment: searchParams.get("fulfillment") ?? undefined,
      paymentStatus: searchParams.get("paymentStatus") ?? undefined,
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
