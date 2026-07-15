"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUploadFiles } from "@better-upload/client";
import * as Sentry from "@sentry/nextjs";
import { toast } from "sonner";

import type { PendingFile } from "~/components/inputs/pending-image-grid";
import {
  getImageDimensions,
  getStoredPath,
  ROUTE_MAX_FILES,
} from "~/lib/uploads";
import { api } from "~/trpc/react";

/**
 * Default/fallback maximum files per single upload request. This is only
 * used when `config.route` isn't present in `ROUTE_MAX_FILES` (src/lib/uploads.ts)
 * — for any registered route, the real per-route server cap from that shared
 * constant is used instead (see `batchSize` below), so this hook can never
 * silently batch above what the server's `maxFiles` will accept. If you add a
 * new multi-file route to `src/app/api/upload/route.ts`, add its cap to
 * `ROUTE_MAX_FILES` too — don't rely on this fallback.
 */
const UPLOAD_BATCH_SIZE = 10;

/** Maximum file size accepted by the `images` route: 5 MB. */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export type DeferredImageUploadConfig = {
  /** Upload route name. Defaults to `"images"`. */
  route?: string;
};

export type DeferredUploadResult = Array<{
  url: string;
  width?: number;
  height?: number;
}>;

export type UseDeferredImageUpload = {
  /** Current list of locally-staged files (not yet uploaded). */
  pendingFiles: PendingFile[];
  /** Whether an upload batch is currently in-flight. */
  isUploading: boolean;
  /**
   * Stage additional files. Client-side validation rejects non-images and
   * files over 5 MB; rejected files are surfaced via a toast.
   */
  addFiles: (files: File[] | FileList) => void;
  /** Remove a single staged file by its client id. Revokes the object URL. */
  removeFile: (id: string) => void;
  /** Replace the entire staged list (used after DnD reorder). */
  reorder: (items: PendingFile[]) => void;
  /** Clear all staged files and revoke their object URLs. */
  clear: () => void;
  /**
   * Upload all staged files in order, returning an array of
   * `{ url, width?, height? }` in the original file order.
   *
   * Accumulates uploaded URLs incrementally. If any batch fails the method
   * calls `discard()` on all already-uploaded URLs and then re-throws so the
   * caller can handle the error.
   */
  uploadAll: () => Promise<DeferredUploadResult>;
  /**
   * Delete already-uploaded S3 objects via the shared `upload.discardUploads`
   * mutation. Exposed so consumers can clean up when their save step fails
   * *after* a successful `uploadAll()`.
   */
  discard: (urls: string[]) => void;
};

/**
 * Manages the hold-in-memory → batch-upload lifecycle for deferred image
 * uploads. Designed so any admin create-form can adopt it without re-implementing
 * chunking, dims capture, partial-upload cleanup, or object-URL lifecycle.
 */
export function useDeferredImageUpload(
  config?: DeferredImageUploadConfig,
): UseDeferredImageUpload {
  const route = config?.route ?? "images";
  // Clamp to the server route's real `maxFiles` (src/app/api/upload/route.ts)
  // when known, so this hook can't drift out of sync with the server cap.
  const batchSize = ROUTE_MAX_FILES[route] ?? UPLOAD_BATCH_SIZE;

  const nextIdRef = useRef(0);
  // Keep a ref mirror of pendingFiles so the unmount cleanup can revoke
  // object URLs without capturing stale state.
  const pendingFilesRef = useRef<PendingFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadHook = useUploadFiles({ api: "/api/upload", route });

  const discardMutation = api.upload.discardUploads.useMutation({
    onError: (err, variables) => {
      // Best-effort S3 cleanup for uploads whose parent save step failed.
      // If the discard call itself fails, the objects are orphaned in S3 —
      // not user-visible or blocking (the caller's own error/flow already
      // completed), but worth surfacing so it doesn't fail silently.
      console.warn(
        "Failed to discard uploaded files; objects may be orphaned in S3:",
        variables.urls,
        err,
      );
      Sentry.captureException(err, {
        tags: { service: "upload", step: "discardUploads" },
        extra: { urls: variables.urls },
      });
    },
  });

  // Mirror state into ref so the unmount cleanup always sees the latest list.
  useEffect(() => {
    pendingFilesRef.current = pendingFiles;
  }, [pendingFiles]);

  // Revoke all object URLs on unmount
  useEffect(() => {
    return () => {
      pendingFilesRef.current.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, []);

  const addFiles = useCallback((files: File[] | FileList) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const valid: File[] = [];
    const skippedSize: string[] = [];
    const skippedType: string[] = [];

    for (const file of fileArray) {
      if (!file.type.startsWith("image/")) {
        skippedType.push(file.name);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        skippedSize.push(file.name);
        continue;
      }
      valid.push(file);
    }

    if (skippedSize.length > 0) {
      toast.warning(
        `Skipped ${skippedSize.length} file${skippedSize.length > 1 ? "s" : ""} over 5 MB: ${skippedSize.join(", ")}`,
      );
    }
    if (skippedType.length > 0) {
      toast.warning(
        `Skipped ${skippedType.length} non-image file${skippedType.length > 1 ? "s" : ""}: ${skippedType.join(", ")}`,
      );
    }

    if (valid.length === 0) return;

    const newItems: PendingFile[] = valid.map((file) => ({
      id: `pending-${(nextIdRef.current++).toString()}`,
      previewUrl: URL.createObjectURL(file),
      file,
    }));

    setPendingFiles((prev) => [...prev, ...newItems]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setPendingFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const reorder = useCallback((items: PendingFile[]) => {
    setPendingFiles(items);
  }, []);

  const clear = useCallback(() => {
    setPendingFiles((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      return [];
    });
  }, []);

  const discard = useCallback(
    (urls: string[]) => {
      if (urls.length > 0) {
        discardMutation.mutate({ urls });
      }
    },
    [discardMutation],
  );

  const uploadAll = useCallback(async (): Promise<DeferredUploadResult> => {
    // Snapshot the list at call-time so that mutations during upload don't
    // affect which files we process.
    const snapshot = [...pendingFiles];

    if (snapshot.length === 0) return [];

    setIsUploading(true);

    // Accumulate uploaded URLs incrementally so the catch block can clean them
    // all up if a later batch fails.
    const uploadedUrls: string[] = [];

    try {
      // Capture natural dimensions from object URLs before uploading.
      const dimsMap = new Map<string, { width?: number; height?: number }>();
      await Promise.all(
        snapshot.map(async (pf) => {
          const dims = await getImageDimensions(pf.previewUrl);
          dimsMap.set(pf.id, dims);
        }),
      );

      // Split into batches of at most `batchSize` (the route's server-side
      // maxFiles cap, from ROUTE_MAX_FILES — see comment above).
      const batches: PendingFile[][] = [];
      for (let i = 0; i < snapshot.length; i += batchSize) {
        batches.push(snapshot.slice(i, i + batchSize));
      }

      // Result list populated in original file order.
      const results: DeferredUploadResult = [];

      for (const batch of batches) {
        const result = await uploadHook.uploadAsync(batch.map((pf) => pf.file));

        // Correlate each uploaded file back to its PendingFile by identity
        // (the original raw File reference), with a filename fallback — not by
        // array position. `result.files` is not guaranteed to preserve request
        // order, so positional indexing can silently mis-correlate dims/urls.
        //
        // Record URLs from this batch before checking for failures so the
        // catch block can clean up even partially successful batches. Iterate
        // the ORIGINAL batch order (not `result.files`, whose order isn't
        // guaranteed) so `results` stays in the caller's file order — image
        // sortOrder downstream depends on it.
        for (const pendingFile of batch) {
          const uploadedFile = result.files.find(
            (uf) =>
              uf.raw === pendingFile.file || uf.name === pendingFile.file.name,
          );
          if (!uploadedFile) continue;

          const url = getStoredPath(uploadedFile);
          uploadedUrls.push(url);

          const dims = dimsMap.get(pendingFile.id) ?? {};
          results.push({ url, ...dims });
        }

        if (result.failedFiles.length > 0) {
          const names = result.failedFiles.map((ff) => ff.name).join(", ");
          throw new Error(`Some images failed to upload: ${names}`);
        }
      }

      return results;
    } catch (err) {
      // Clean up any objects that were successfully uploaded before the error.
      if (uploadedUrls.length > 0) {
        discard(uploadedUrls);
      }
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [pendingFiles, uploadHook, discard, batchSize]);

  return {
    pendingFiles,
    isUploading,
    addFiles,
    removeFile,
    reorder,
    clear,
    uploadAll,
    discard,
  };
}
