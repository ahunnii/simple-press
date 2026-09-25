"use client";

import { ExternalLink, Info, RefreshCw } from "lucide-react";

import type { PreviewFrameHandle } from "~/components/preview/preview-frame";
import type { PreviewEditTarget } from "~/lib/preview/preview-target";
import { Button } from "~/components/ui/button";
import { PreviewFrame } from "~/components/preview/preview-frame";

/** Device viewport presets — widths match `PreviewPane`'s `DEVICE_WIDTHS`. */
export type DeviceKind = "desktop" | "tablet" | "mobile";

export const DEVICE_WIDTHS: Record<DeviceKind, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

export type EditorPreviewProps = {
  /** Storefront path currently loaded in the iframe (e.g. "/" or "/about"). */
  path: string;
  /** Resolved device width, e.g. "100%" | "768px" | "390px". */
  width: string;
  /** Whether a draft flush is in-flight — drives the shimmer overlay. */
  isUpdating: boolean;
  /**
   * Optional context line about what the canvas is showing (e.g. which sample
   * product the product page previews). Rendered as a pill over the canvas.
   */
  notice?: string;
  /**
   * Fired when a preview hotspot is clicked inside the iframe. `target`
   * narrows the click to one field / list row when the overlay resolved one.
   */
  onEditGroup: (
    page: string,
    group: string,
    target?: PreviewEditTarget,
  ) => void;
  /** Fired when the iframe acks a live text patch. */
  onPatched: (applied: string[], missed: string[]) => void;
  /** Imperative handle to the underlying `PreviewFrame`. */
  frameRef: React.RefObject<PreviewFrameHandle | null>;
  /**
   * Phone / portrait-tablet layout: the storefront fills the canvas edge to
   * edge at the real viewport width (no gutter, device frame, or floating
   * toolbar — refresh / open-in-new-tab live in the top bar's menu there).
   * `width` is ignored.
   */
  compact?: boolean;
};

/**
 * Center canvas. Wraps the headless `PreviewFrame` in a centered, device-width
 * "device" box with a subtle border + shadow so the storefront reads as a
 * physical viewport floating on the editor background. At desktop width the
 * frame fills the available area (minus the gutter); at tablet/mobile widths
 * it shrinks and centers, with `PreviewFrame` animating the width change.
 */
export function EditorPreview({
  path,
  width,
  isUpdating,
  notice,
  onEditGroup,
  onPatched,
  frameRef,
  compact = false,
}: EditorPreviewProps) {
  const handleRefresh = () => {
    frameRef.current?.refresh();
  };

  const handleOpenExternal = () => {
    window.open(`${path}?__preview=1`, "_blank", "noopener");
  };

  if (compact) {
    return (
      <div className="bg-background relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {notice && (
          <p className="bg-muted/60 text-muted-foreground flex shrink-0 items-start gap-1.5 border-b px-3 py-1.5 text-xs">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2">{notice}</span>
          </p>
        )}
        <div className="relative min-h-0 flex-1">
          <PreviewFrame
            ref={frameRef}
            path={path}
            width="100%"
            minHeight={0}
            isUpdating={isUpdating}
            onEditGroup={onEditGroup}
            onPatched={onPatched}
            // Pinned to the box so the iframe gets a definite height to fill.
            className="bg-background absolute inset-0"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/40 relative flex min-w-0 flex-1 justify-center overflow-auto p-6">
      {notice && (
        <p
          title={notice}
          className="bg-card/90 text-muted-foreground absolute top-3 left-1/2 z-10 flex max-w-[min(28rem,60%)] -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs shadow-sm backdrop-blur"
        >
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{notice}</span>
        </p>
      )}
      <div className="bg-card/90 absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg border p-0.5 shadow-sm backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Refresh preview"
          onClick={handleRefresh}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Open storefront in new tab"
          onClick={handleOpenExternal}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
      <PreviewFrame
        ref={frameRef}
        path={path}
        width={width}
        isUpdating={isUpdating}
        onEditGroup={onEditGroup}
        onPatched={onPatched}
        className="bg-background h-full max-w-full overflow-hidden rounded-lg border shadow-sm"
      />
    </div>
  );
}
