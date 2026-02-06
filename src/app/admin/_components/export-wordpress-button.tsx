"use client";

import { IconFileExport } from "@tabler/icons-react";
import { useCallback } from "react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

const FILENAME = "community-export.wxr";

function downloadXml(xml: string) {
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = FILENAME;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportWordPressButton() {
  const { refetch, isFetching } = api.export.wordpressCommunityWxr.useQuery(
    undefined,
    { enabled: false },
  );

  const handleExport = useCallback(async () => {
    const result = await refetch();
    if (result.data?.xml) {
      downloadXml(result.data.xml);
    }
  }, [refetch]);

  return (
    <Button
      onClick={() => void handleExport()}
      disabled={isFetching}
      variant="outline"
      className="gap-2"
    >
      <IconFileExport className="size-4" />
      {isFetching ? "Generating…" : "Export for WordPress"}
    </Button>
  );
}
