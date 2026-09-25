"use client";

import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { downloadCsv } from "~/lib/csv-download";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

/** Exports every item as CSV — no filters, the whole inventory. */
export function ExportItemsButton() {
  const exportMutation = api.baseInventoryUnit.exportCsv.useMutation({
    onSuccess: (data) => {
      downloadCsv(data.csv, data.filename);
      toast.success("Inventory exported");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to export inventory");
    },
  });

  return (
    <Button
      variant="outline"
      onClick={() => exportMutation.mutate()}
      disabled={exportMutation.isPending}
    >
      {exportMutation.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {exportMutation.isPending ? "Exporting…" : "Export"}
    </Button>
  );
}
