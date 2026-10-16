"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import type { BatchedImageUploadProgress } from "~/hooks/use-batched-image-upload";
import {
  isPdfFile,
  MAX_DOCUMENT_UPLOAD_LABEL,
  MEDIA_LIBRARY_UPLOAD_MAX,
} from "~/lib/uploads";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useBatchedImageUpload } from "~/hooks/use-batched-image-upload";
import { useDocumentUpload } from "~/hooks/use-document-upload";
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
  /** PDFs that landed — `useDocumentUpload` toasts the ones that didn't. */
  documents: number;
  /** PDFs that were sent but didn't land. */
  documentsFailed: number;
  oversizedNames: string[];
  failedNames: string[];
  aborted: boolean;
};

function pluralizeImages(n: number): string {
  return `${n} image${n === 1 ? "" : "s"}`;
}

function pluralizePdfs(n: number): string {
  return `${n} PDF${n === 1 ? "" : "s"}`;
}

/** "3 images", "2 PDFs" or "3 images and 2 PDFs" — zero parts are dropped. */
function describeUploaded(images: number, pdfs: number): string {
  const parts = [
    images > 0 ? pluralizeImages(images) : null,
    pdfs > 0 ? pluralizePdfs(pdfs) : null,
  ].filter(Boolean);
  return parts.join(" and ");
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
  /**
   * Platform hub only: upload into this business rather than the request
   * host's, and refresh `platformMedia.list` instead of `media.list`. The
   * upload route honors it for PLATFORM_ADMINs only.
   */
  businessId?: string;
};

/**
 * "Upload images or PDFs" button + dialog for the Media Library page (shop
 * admin and the platform hub). Images go to the `libraryImages` route and PDFs
 * to `libraryDocuments` (via `useDocumentUpload`); both are kept until deleted
 * from the Media Library. The dialog is a SIBLING of the button, never inside
 * a drop target — React events bubble through portals.
 */
export function MediaUploadButton({
  variant,
  size,
  className,
  businessId,
}: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const { uploadImages, isPreparing, isUploading } = useBatchedImageUpload(
    "libraryImages",
    { businessId },
  );

  const { upload: uploadDocuments, isPending: isUploadingDocuments } =
    useDocumentUpload({ businessId });

  const [open, setOpen] = useState(false);
  // Spans the whole `uploadImages` call, including the gaps between batches.
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<BatchedImageUploadProgress | null>(
    null,
  );
  const [summary, setSummary] = useState<Summary | null>(null);

  const busy = running || isPreparing || isUploading || isUploadingDocuments;

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

  const progressLabel = isUploadingDocuments
    ? "Uploading PDFs…"
    : progress && !(isPreparing && progress.done === 0)
      ? `Uploading… ${progress.done} of ${progress.total} done`
      : "Preparing photos…";

  const handleFiles = (files: File[]) => {
    if (busy) return;

    const imageCandidates: File[] = [];
    const pdfs: File[] = [];
    for (const file of files) {
      if (isPdfFile(file)) pdfs.push(file);
      else if (fileMatchesKind(file, "image")) imageCandidates.push(file);
      else toast.error(`Skipped "${file.name}": not an image or PDF`);
    }
    if (imageCandidates.length === 0 && pdfs.length === 0) return;

    const total = imageCandidates.length;
    const images = imageCandidates.slice(0, MEDIA_LIBRARY_UPLOAD_MAX);
    if (images.length < total) {
      toast.warning(
        `Uploading ${images.length} of ${total} images — add the rest after this finishes`,
      );
    }

    setSummary(null);
    setProgress(images.length > 0 ? { done: 0, total: images.length } : null);
    setRunning(true);

    void (async () => {
      try {
        let landed = 0;
        let failedNames: string[] = [];
        let oversizedNames: string[] = [];
        let aborted = false;
        if (images.length > 0) {
          const result = await uploadImages(images, {
            onProgress: setProgress,
          });
          landed = result.urls.length;
          failedNames = result.failedNames;
          oversizedNames = result.oversizedNames;
          aborted = result.aborted;
        }

        // PDFs go after the images; skips and rejections are toasted by the
        // hook, so only the count matters here.
        setProgress(null);
        const documents = pdfs.length > 0 ? await uploadDocuments(pdfs) : [];
        const documentsFailed = pdfs.length - documents.length;

        if (landed > 0 || documents.length > 0) {
          if (businessId) {
            void utils.platformMedia.list.invalidate({ businessId });
          } else {
            void utils.media.list.invalidate();
          }
          router.refresh();
        }

        const uploadedLabel = describeUploaded(landed, documents.length);
        if (aborted) {
          toast.error(
            landed > 0
              ? `Upload stopped — ${pluralizeImages(landed)} ${landed === 1 ? "was" : "were"} added before the error`
              : "Failed to upload images",
          );
        } else if (
          failedNames.length === 0 &&
          oversizedNames.length === 0 &&
          documentsFailed === 0
        ) {
          toast.success(`${uploadedLabel} uploaded`);
          reset();
          setOpen(false);
          return;
        }

        // Partial / failed: stay open so the owner can see what to retry.
        setSummary({
          uploaded: landed,
          documents: documents.length,
          documentsFailed,
          oversizedNames,
          failedNames,
          aborted,
        });
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
        Upload images or PDFs
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={!busy}
          onEscapeKeyDown={blockWhileBusy}
          onInteractOutside={blockWhileBusy}
          onPointerDownOutside={blockWhileBusy}
        >
          <DialogHeader>
            <DialogTitle>Upload images or PDFs</DialogTitle>
            <DialogDescription>
              Add photos to your library, then pick them from any “Choose from
              library” menu — products, collections, galleries and more. PDFs
              get a link you can copy or add to a page.
            </DialogDescription>
          </DialogHeader>

          {summary && (
            <div
              className={cn(
                "bg-muted/50 space-y-3 rounded-md border p-3",
                summary.uploaded === 0 &&
                  summary.documents === 0 &&
                  "border-destructive/40",
              )}
              role="status"
            >
              <p className="text-sm font-medium">
                {summary.uploaded > 0 || summary.documents > 0
                  ? `${describeUploaded(summary.uploaded, summary.documents)} uploaded`
                  : "Nothing was uploaded"}
                {summary.aborted &&
                  " — the upload stopped early because of an error"}
              </p>
              <NameList
                title={`Too large (over ${MAX_UPLOAD_LABEL.image}) — skipped`}
                names={summary.oversizedNames}
              />
              <NameList title="Failed to upload" names={summary.failedNames} />
              {summary.documentsFailed > 0 && (
                <p className="text-sm">
                  {pluralizePdfs(summary.documentsFailed)} couldn&apos;t be
                  added — see the messages above for why.
                </p>
              )}
            </div>
          )}

          <UploadDropzone
            kind="image"
            acceptPdf
            multiple
            isUploading={
              isUploading || isUploadingDocuments || (running && !isPreparing)
            }
            isPreparing={isPreparing}
            onFiles={handleFiles}
            helperText={`Up to ${MEDIA_LIBRARY_UPLOAD_MAX} images at a time, ${MAX_UPLOAD_LABEL.image} each · PDFs up to ${MAX_DOCUMENT_UPLOAD_LABEL}`}
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
