"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import type { BatchedImageUploadProgress } from "~/hooks/use-batched-image-upload";
import { MEDIA_LIBRARY_UPLOAD_MAX } from "~/lib/uploads";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useBatchedImageUpload } from "~/hooks/use-batched-image-upload";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Progress } from "~/components/ui/progress";
import {
  fileMatchesKind,
  MAX_UPLOAD_LABEL,
  UploadDropzone,
} from "~/components/media/upload-dropzone";

type Summary = {
  uploaded: number;
  oversizedNames: string[];
  failedNames: string[];
  aborted: boolean;
};

function pluralizeImages(n: number): string {
  return `${n} image${n === 1 ? "" : "s"}`;
}

/** Scrollable filename list so a 40-file failure can't stretch the dialog. */
function NameList({ title, names }: { title: string; names: string[] }) {
  if (names.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{title}</p>
      <ul className="text-muted-foreground max-h-28 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs">
        {names.map((name, i) => (
          <li key={`${name}-${i}`} className="break-all">
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}

type Props = {
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
};

/**
 * "Upload images" button + dialog for the Media Library page. Files go to the
 * `libraryImages` route (kept until deleted from this page). The dialog is a
 * SIBLING of the button, never inside a drop target — React events bubble
 * through portals.
 */
export function MediaUploadButton({ variant, size, className }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const { uploadImages, isPreparing, isUploading } =
    useBatchedImageUpload("libraryImages");

  const [open, setOpen] = useState(false);
  // Spans the whole `uploadImages` call, including the gaps between batches.
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<BatchedImageUploadProgress | null>(
    null,
  );
  const [summary, setSummary] = useState<Summary | null>(null);

  const busy = running || isPreparing || isUploading;

  // Closing mid-upload would strand the progress UI and (on navigation) kill
  // the in-flight requests, so warn on tab close/reload while busy.
  useEffect(() => {
    if (!busy) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy]);

  const reset = () => {
    setProgress(null);
    setSummary(null);
  };

  const handleOpenChange = (next: boolean) => {
    // Busy → ignore every close path (X, Escape, overlay, Done).
    if (!next && busy) return;
    if (!next) reset();
    setOpen(next);
  };

  const progressLabel =
    progress && !(isPreparing && progress.done === 0)
      ? `Uploading… ${progress.done} of ${progress.total} done`
      : "Preparing photos…";

  const handleFiles = (files: File[]) => {
    if (busy) return;

    const candidates: File[] = [];
    for (const file of files) {
      if (fileMatchesKind(file, "image")) candidates.push(file);
      else toast.error(`Skipped "${file.name}": not an image`);
    }
    if (candidates.length === 0) return;

    const total = candidates.length;
    const kept = candidates.slice(0, MEDIA_LIBRARY_UPLOAD_MAX);
    if (kept.length < total) {
      toast.warning(
        `Uploading ${kept.length} of ${total} images — add the rest after this finishes`,
      );
    }

    setSummary(null);
    setProgress({ done: 0, total: kept.length });
    setRunning(true);

    void (async () => {
      try {
        const { urls, failedNames, oversizedNames, aborted } =
          await uploadImages(kept, { onProgress: setProgress });
        const landed = urls.length;

        if (landed > 0) {
          void utils.media.list.invalidate();
          router.refresh();
        }

        if (aborted) {
          toast.error(
            landed > 0
              ? `Upload stopped — ${pluralizeImages(landed)} ${landed === 1 ? "was" : "were"} added before the error`
              : "Failed to upload images",
          );
        } else if (failedNames.length === 0 && oversizedNames.length === 0) {
          toast.success(`${pluralizeImages(landed)} uploaded`);
          reset();
          setOpen(false);
          return;
        }

        // Partial / failed: stay open so the owner can see what to retry.
        setProgress(null);
        setSummary({ uploaded: landed, oversizedNames, failedNames, aborted });
      } finally {
        setRunning(false);
      }
    })();
  };

  const blockWhileBusy = (e: Event) => {
    if (busy) e.preventDefault();
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Upload className="mr-2 h-4 w-4" />
        Upload images
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={!busy}
          onEscapeKeyDown={blockWhileBusy}
          onInteractOutside={blockWhileBusy}
          onPointerDownOutside={blockWhileBusy}
        >
          <DialogHeader>
            <DialogTitle>Upload images</DialogTitle>
            <DialogDescription>
              Add photos to your library, then pick them from any “Choose from
              library” menu — products, collections, galleries and more.
            </DialogDescription>
          </DialogHeader>

          {summary && (
            <div
              className={cn(
                "bg-muted/50 space-y-3 rounded-md border p-3",
                summary.uploaded === 0 && "border-destructive/40",
              )}
              role="status"
            >
              <p className="text-sm font-medium">
                {summary.uploaded > 0
                  ? `${pluralizeImages(summary.uploaded)} uploaded`
                  : "No images were uploaded"}
                {summary.aborted &&
                  " — the upload stopped early because of an error"}
              </p>
              <NameList
                title={`Too large (over ${MAX_UPLOAD_LABEL.image}) — skipped`}
                names={summary.oversizedNames}
              />
              <NameList title="Failed to upload" names={summary.failedNames} />
            </div>
          )}

          <UploadDropzone
            kind="image"
            multiple
            isUploading={isUploading || (running && !isPreparing)}
            isPreparing={isPreparing}
            onFiles={handleFiles}
            helperText={`Up to ${MEDIA_LIBRARY_UPLOAD_MAX} images at a time, ${MAX_UPLOAD_LABEL.image} each`}
            progressLabel={busy ? progressLabel : undefined}
          />

          {busy && progress && (
            <div className="space-y-1.5" aria-live="polite">
              <Progress
                value={
                  progress.total > 0
                    ? (progress.done / progress.total) * 100
                    : 0
                }
                aria-label="Upload progress"
              />
              <p className="text-muted-foreground text-xs">{progressLabel}</p>
            </div>
          )}

          {summary && (
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
