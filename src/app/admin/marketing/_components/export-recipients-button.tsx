"use client";

import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { downloadCsv } from "~/lib/csv-download";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

type Props = {
  disabled?: boolean;
};

/** Downloads the opted-in marketing list as a CSV. */
export function ExportRecipientsButton({ disabled }: Props) {
  const exportMutation = api.marketing.exportRecipients.useMutation({
    onSuccess: (data) => {
      downloadCsv(data.csv, data.filename);
      toast.success(
        `Exported ${data.count.toLocaleString()} recipient${data.count !== 1 ? "s" : ""}`,
      );
    },
    onError: (error) => {
      toast.error(error.message || "Failed to export marketing list");
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => exportMutation.mutate()}
      disabled={Boolean(disabled) || exportMutation.isPending}
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
