"use client";

import { useState } from "react";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  /** Platform admins may target another business; omit for the current store. */
  businessId?: string;
}

/** Pull the filename out of a Content-Disposition header (RFC 5987 first). */
function filenameFromDisposition(header: string | null): string {
  if (header) {
    const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
    if (star?.[1]) {
      try {
        return decodeURIComponent(star[1]);
      } catch {
        /* fall through */
      }
    }
    const plain = /filename="([^"]+)"/i.exec(header);
    if (plain?.[1]) return plain[1];
  }
  return "Site Export.zip";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SiteExportClient({ businessId }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setIsDownloading(true);
    setError(null);
    try {
      const url = businessId
        ? `/api/admin/site-export?businessId=${encodeURIComponent(businessId)}`
        : "/api/admin/site-export";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "Only the store owner can download the site."
            : `Download failed (${res.status}).`,
        );
      }
      const blob = await res.blob();
      const filename = filenameFromDisposition(
        res.headers.get("Content-Disposition"),
      );
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("Your download is ready.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong preparing your download.";
      setError(message);
      toast.error(message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => void handleDownload()} disabled={isDownloading}>
        {isDownloading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Download className="mr-2 h-4 w-4" aria-hidden />
        )}
        Download your site
      </Button>

      {isDownloading && (
        <p className="text-muted-foreground text-sm" role="status">
          Preparing your download — this can take a minute or two for sites with
          lots of photos
        </p>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error} Please try again.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
