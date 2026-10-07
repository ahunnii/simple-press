"use client";

import type { UseFormReturn } from "react-hook-form";
import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { useWatch } from "react-hook-form";

import type { BrandingFormSchema } from "~/lib/validators/homepage";

/** SimplePress's own icon, shown when the store has neither favicon nor logo. */
const DEFAULT_ICON_SRC = "/simplepress-favicon.ico";

/** Smaller than this and the generated 192px icons get upscaled. */
const MIN_ICON_SIZE = 192;

type Dimensions = { width: number; height: number };

/** Object URL for a pending `File`, revoked on change/unmount. */
function useFileUrl(file: unknown): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!(file instanceof File)) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

/**
 * Natural size of `src`, or `null` while loading / when it can't be read.
 * Advisory only — a failed load just means no warning.
 */
function useImageDimensions(src: string | null): Dimensions | null {
  const [dims, setDims] = useState<{ src: string; dims: Dimensions } | null>(
    null,
  );
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setDims({
        src,
        dims: { width: img.naturalWidth, height: img.naturalHeight },
      });
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  // Keyed on `src` so a stale measurement never describes a newer image.
  return dims !== null && dims.src === src ? dims.dims : null;
}

function sizeWarning(dims: Dimensions | null): string | null {
  // SVGs without intrinsic dimensions report 0×0, and they scale losslessly.
  if (!dims || dims.width === 0 || dims.height === 0) return null;
  if (dims.width !== dims.height) {
    return "This image isn't square. It'll be padded to fit.";
  }
  if (dims.width < MIN_ICON_SIZE) {
    return `This image is small (${dims.width}×${dims.height}). Icons may look blurry on phones.`;
  }
  return null;
}

/**
 * Live preview of how the store's site icon will read in a browser tab and as
 * a home-screen tile, plus a soft (non-blocking) size warning for the chosen
 * favicon. Mirrors the server's source order — favicon, else logo, else the
 * SimplePress default — using the form's current (unsaved) values.
 */
export function FaviconPreview({
  form,
}: {
  form: UseFormReturn<BrandingFormSchema>;
}) {
  const faviconFile: unknown = useWatch({
    control: form.control,
    name: "faviconFile",
  });
  const faviconUrl = useWatch({ control: form.control, name: "faviconUrl" });
  const logoFile: unknown = useWatch({
    control: form.control,
    name: "logoFile",
  });
  const logoUrl = useWatch({ control: form.control, name: "logoUrl" });

  const faviconFileUrl = useFileUrl(faviconFile);
  const logoFileUrl = useFileUrl(logoFile);

  // A pending device file wins over the stored URL; Remove nulls the URL.
  const faviconSrc = faviconFileUrl ?? (faviconUrl?.trim() ? faviconUrl : null);
  const logoSrc = logoFileUrl ?? (logoUrl?.trim() ? logoUrl : null);

  const usingLogo = faviconSrc === null && logoSrc !== null;
  const src = faviconSrc ?? logoSrc ?? DEFAULT_ICON_SRC;

  const dims = useImageDimensions(faviconSrc);
  const warning = sizeWarning(faviconSrc ? dims : null);

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Browser tab</p>
          <div className="bg-muted flex h-8 w-32 items-center gap-2 rounded-t-md border border-b-0 px-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary
                S3 URL or blob: preview at a fixed 16px; next/image would need
                a remote-pattern entry per storage host. */}
            <img
              src={src}
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 shrink-0 object-contain"
            />
            <span className="text-muted-foreground truncate text-xs">
              Your store
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Home screen</p>
          <div className="flex h-[60px] w-[60px] items-center justify-center rounded-[14px] border bg-white p-[5px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
            <img src={src} alt="" className="h-full w-full object-contain" />
          </div>
        </div>
        {usingLogo ? (
          <p className="text-muted-foreground self-end text-xs">
            Using your logo
          </p>
        ) : null}
      </div>
      {warning ? (
        <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <TriangleAlert
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            aria-hidden="true"
          />
          {warning}
        </p>
      ) : null}
    </div>
  );
}
