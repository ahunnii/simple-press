"use client";

import { useCallback, useState } from "react";
import { useUploadFiles } from "@better-upload/client";
import { toast } from "sonner";

import { formatBytes } from "~/lib/format-bytes";
import {
  isPdfFile,
  MAX_DOCUMENT_UPLOAD_BYTES,
  MAX_DOCUMENT_UPLOAD_LABEL,
  ROUTE_MAX_FILES,
} from "~/lib/uploads";
import { api } from "~/trpc/react";

export type UploadedDocument = {
  /** Storage key, `{biz}/library-doc-{hex}.pdf`. */
  key: string;
  /** Public URL — opens the PDF inline in the browser. */
  url: string;
  /** The file name the owner picked (the stored key is generated). */
  name: string;
};

export type UseDocumentUploadConfig = {
  /**
   * Upload into THIS business instead of the request host's. Platform hub
   * only (PLATFORM_ADMIN) — same contract as `useBatchedImageUpload`. Omit
   * everywhere else.
   */
  businessId?: string;
  /** Called once per `upload()` call with the PDFs that landed and verified. */
  onUploaded?: (documents: UploadedDocument[]) => void;
};

export type UseDocumentUpload = {
  /**
   * Upload PDFs to the Media Library (`libraryDocuments` route), verify each
   * is really a PDF, and resolve with the ones that made it, in input order.
   * Never throws; skips (not a PDF, over the size limit) and rejections (fake
   * PDF, failed upload) are surfaced as toasts.
   */
  upload: (files: File[]) => Promise<UploadedDocument[]>;
  /** True from the first batch to the last verification. */
  isPending: boolean;
};

/**
 * Upload PDFs to the Media Library and hand back their public links. Wraps
 * better-upload's `useUploadFiles` for `libraryDocuments`, then calls
 * `media.verifyDocument` (`platformMedia.verifyDocument` for a hub
 * `businessId`) per file, which deletes anything that isn't really a PDF.
 * Callers refresh their own lists; the Media Library list cache is
 * invalidated here.
 */
export function useDocumentUpload(
  config?: UseDocumentUploadConfig,
): UseDocumentUpload {
  const targetBusinessId = config?.businessId;
  const onUploaded = config?.onUploaded;
  const batchSize = ROUTE_MAX_FILES.libraryDocuments ?? 5;

  const utils = api.useUtils();
  const [isPending, setIsPending] = useState(false);

  const { uploadAsync } = useUploadFiles({
    api: "/api/upload",
    route: "libraryDocuments",
  });
  const verifyShop = api.media.verifyDocument.useMutation();
  const verifyPlatform = api.platformMedia.verifyDocument.useMutation();

  const upload = useCallback(
    async (files: File[]): Promise<UploadedDocument[]> => {
      const candidates: File[] = [];
      for (const file of files) {
        if (!isPdfFile(file)) {
          toast.error(`Skipped "${file.name}": not a PDF`);
        } else if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
          toast.error(
            `Skipped "${file.name}": ${formatBytes(file.size)} is over the ${MAX_DOCUMENT_UPLOAD_LABEL} limit`,
          );
        } else {
          // Some browsers/OSes report no MIME type for a .pdf; the route's
          // fileTypes check (and the signed Content-Type) needs the real one.
          candidates.push(
            file.type === "application/pdf"
              ? file
              : new File([file], file.name, { type: "application/pdf" }),
          );
        }
      }
      if (candidates.length === 0) return [];

      setIsPending(true);
      const landed: UploadedDocument[] = [];
      try {
        for (let i = 0; i < candidates.length; i += batchSize) {
          const batch = candidates.slice(i, i + batchSize);

          let result: Awaited<ReturnType<typeof uploadAsync>>;
          try {
            result = await uploadAsync(
              batch,
              targetBusinessId
                ? { metadata: { businessId: targetBusinessId } }
                : undefined,
            );
          } catch (error) {
            console.error("Document upload error:", error);
            toast.error(
              error instanceof Error && error.message
                ? error.message
                : "Failed to upload PDF",
            );
            break;
          }

          // `result.files` order isn't guaranteed — walk the input and match
          // by name, consuming each match so same-named files stay distinct.
          const unmatched = [...result.files];
          for (const file of batch) {
            const idx = unmatched.findIndex((uf) => uf.name === file.name);
            const uploaded = idx === -1 ? undefined : unmatched[idx];
            if (idx !== -1) unmatched.splice(idx, 1);
            const key = uploaded?.objectInfo?.key;
            if (!key) {
              toast.error(`Failed to upload "${file.name}"`);
              continue;
            }
            try {
              const { url } = targetBusinessId
                ? await verifyPlatform.mutateAsync({
                    key,
                    businessId: targetBusinessId,
                  })
                : await verifyShop.mutateAsync({ key });
              landed.push({ key, url, name: file.name });
            } catch (error) {
              toast.error(
                error instanceof Error && error.message
                  ? `"${file.name}": ${error.message}`
                  : `"${file.name}" couldn't be checked`,
              );
            }
          }
        }
      } finally {
        setIsPending(false);
      }

      if (landed.length > 0) {
        if (targetBusinessId) {
          void utils.platformMedia.list.invalidate({
            businessId: targetBusinessId,
          });
        } else {
          void utils.media.list.invalidate();
        }
        onUploaded?.(landed);
      }
      return landed;
    },
    [
      batchSize,
      onUploaded,
      targetBusinessId,
      uploadAsync,
      utils,
      verifyPlatform,
      verifyShop,
    ],
  );

  return { upload, isPending };
}
