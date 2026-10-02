"use client";

import { useCallback, useState } from "react";
import { useUploadFiles } from "@better-upload/client";

import { prepareImageForUpload } from "~/lib/image-prep";
import { getStoredPath, ROUTE_MAX_FILES } from "~/lib/uploads";
import { MAX_UPLOAD_SIZE } from "~/components/media/upload-dropzone";

/** Multi-file image routes this hook can drive (src/app/api/upload/route.ts). */
export type BatchedImageUploadRoute = "images" | "libraryImages";

export type BatchedImageUploadProgress = {
  /** Files processed so far — uploaded, skipped (oversized) or failed. */
  done: number;
  total: number;
};

export type BatchedImageUploadOptions = {
  /**
   * Called once at the start (`done: 0`) and again after every batch, so a
   * caller can render "Uploading 20 of 50…".
   */
  onProgress?: (progress: BatchedImageUploadProgress) => void;
};

export type BatchedImageUploadResult = {
  /** Stored paths of every file that landed, in input order. */
  urls: string[];
  /** Files the route accepted the batch for but that didn't come back. */
  failedNames: string[];
  /** Files still over the size limit after prep — never sent. */
  oversizedNames: string[];
  /**
   * A batch request threw; later batches were not attempted. `urls` still
   * holds whatever landed before the failure.
   */
  aborted: boolean;
};

export type UseBatchedImageUpload = {
  uploadImages: (
    files: File[],
    opts?: BatchedImageUploadOptions,
  ) => Promise<BatchedImageUploadResult>;
  /** True while the current batch is being normalized (HEIC / downscale). */
  isPreparing: boolean;
  /** True while the current batch is in flight. */
  isUploading: boolean;
};

/** Max simultaneous `prepareImageForUpload` calls (canvas/decoder memory). */
const PREP_CONCURRENCY = 4;

/** Fallback batch size if the route's cap isn't registered yet. */
const DEFAULT_BATCH_SIZE = 10;

/** Order-preserving `Promise.all` over `items` with at most `limit` in flight. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

type Phase = "idle" | "preparing" | "uploading";

/**
 * Prep → size-gate → upload for many images, one route-sized batch at a time,
 * so a 50-photo drop never decodes all 50 at once or sends more than the
 * server route's `maxFiles`. Never toasts — callers own the wording; read the
 * returned names/flags instead.
 */
export function useBatchedImageUpload(
  route: BatchedImageUploadRoute,
): UseBatchedImageUpload {
  const batchSize = ROUTE_MAX_FILES[route] ?? DEFAULT_BATCH_SIZE;

  // Spans the whole `uploadImages` call — the upload hook's own `isPending`
  // drops back to false between batches.
  const [phase, setPhase] = useState<Phase>("idle");

  const { uploadAsync } = useUploadFiles({ api: "/api/upload", route });

  const uploadImages = useCallback(
    async (
      files: File[],
      opts?: BatchedImageUploadOptions,
    ): Promise<BatchedImageUploadResult> => {
      const total = files.length;
      const urls: string[] = [];
      const failedNames: string[] = [];
      const oversizedNames: string[] = [];
      let aborted = false;

      opts?.onProgress?.({ done: 0, total });

      try {
        for (let i = 0; i < total; i += batchSize) {
          const batch = files.slice(i, i + batchSize);

          // 1. Normalize (HEIC transcode / downscale). Never throws.
          setPhase("preparing");
          const prepared = await mapWithConcurrency(
            batch,
            PREP_CONCURRENCY,
            (file) => prepareImageForUpload(file),
          );

          // Prep can rename (photo.heic → photo.webp); report skips and
          // failures under the name the owner actually picked.
          const originalName = new Map(
            prepared.map((file, j) => [file, batch[j]!.name]),
          );
          const nameOf = (file: File) => originalName.get(file) ?? file.name;

          // 2. Size gate, after prep so big phone photos get a chance to shrink.
          const valid = prepared.filter((file) => {
            if (file.size <= MAX_UPLOAD_SIZE.image) return true;
            oversizedNames.push(nameOf(file));
            return false;
          });

          // 3. Upload. URLs are correlated back to the input by File identity
          // (name fallback) — `result.files` order isn't guaranteed, and the
          // caller's gallery order depends on ours.
          if (valid.length > 0) {
            setPhase("uploading");
            const result = await uploadAsync(valid);
            const unmatched = [...result.files];
            for (const file of valid) {
              // Identity first; the name fallback consumes its match so two
              // same-named files (phones love "image.jpg") never share a URL.
              let idx = unmatched.findIndex((uf) => uf.raw === file);
              if (idx === -1) {
                idx = unmatched.findIndex((uf) => uf.name === file.name);
              }
              const uploaded = idx === -1 ? undefined : unmatched[idx];
              if (idx !== -1) unmatched.splice(idx, 1);
              const url = uploaded ? getStoredPath(uploaded) : "";
              if (url) urls.push(url);
              else failedNames.push(nameOf(file));
            }
          }

          opts?.onProgress?.({ done: Math.min(i + batchSize, total), total });
        }
      } catch (error) {
        console.error("Upload error:", error);
        aborted = true;
      } finally {
        setPhase("idle");
      }

      return { urls, failedNames, oversizedNames, aborted };
    },
    [batchSize, uploadAsync],
  );

  return {
    uploadImages,
    isPreparing: phase === "preparing",
    isUploading: phase === "uploading",
  };
}
