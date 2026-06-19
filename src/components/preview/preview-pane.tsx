"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
  ExternalLink,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
} from "lucide-react";

import {
  postToIframe,
  PREVIEW_SOURCE,
  useIframeMessages,
} from "~/lib/preview/use-preview-bridge";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

export type PreviewPaneHandle = {
  /** Reload the storefront iframe to pick up the latest preview draft. */
  refresh(): void;
  /** Scroll the overlay to a specific section group and highlight it. */
  focusGroup(page: string, group: string): void;
};

type Props = {
  /** Called when the overlay inside the iframe sends sp:edit-group. */
  onEditGroup?: (page: string, group: string) => void;
  /** Whether a draft save is in-flight — shows a shimmer over the iframe. */
  isUpdating?: boolean;
  /**
   * Called when the user clicks Refresh.
   * If omitted the button falls back to a plain src-reassign reload.
   */
  onRefresh?: () => void;
  /**
   * Called when the user clicks "Open in new tab".
   * If omitted the button falls back to opening "/" directly.
   */
  onOpenExternal?: () => void;
  /**
   * Storefront path to preview (e.g. "/" or "/about"). Defaults to "/".
   * Changing this prop auto-navigates the iframe to `${path}?__preview=1`.
   */
  path?: string;
};

type DeviceWidth = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTHS: Record<DeviceWidth, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

/**
 * A live-preview pane that embeds the storefront homepage in a same-origin iframe.
 * Exposes `refresh()` and `focusGroup()` via an imperative ref.
 *
 * Includes device viewport toggles (desktop/tablet/mobile) on the left of the toolbar.
 */
export const PreviewPane = forwardRef<PreviewPaneHandle, Props>(
  function PreviewPane(
    { onEditGroup, isUpdating = false, onRefresh, onOpenExternal, path = "/" },
    ref,
  ) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isReady, setIsReady] = useState(false);
    const [device, setDevice] = useState<DeviceWidth>("desktop");

    const src = `${path}?__preview=1`;

    // Queue a focus-group message to flush once iframe reports ready.
    const pendingFocusRef = useRef<{ page: string; group: string } | null>(
      null,
    );

    // Listen for messages from the iframe.
    useIframeMessages((msg) => {
      if (msg.type === "sp:ready") {
        setIsReady(true);
        // Flush any queued focus.
        if (pendingFocusRef.current) {
          const { page, group } = pendingFocusRef.current;
          pendingFocusRef.current = null;
          postToIframe(iframeRef, {
            source: PREVIEW_SOURCE,
            type: "sp:focus-group",
            page,
            group,
          });
        }
      }
      if (msg.type === "sp:edit-group") {
        onEditGroup?.(msg.page, msg.group);
      }
    });

    // Expose imperative API to the parent editor.
    useImperativeHandle(
      ref,
      () => ({
        refresh() {
          setIsReady(false);
          if (iframeRef.current) {
            iframeRef.current.src = src;
          }
        },
        focusGroup(page: string, group: string) {
          if (isReady) {
            postToIframe(iframeRef, {
              source: PREVIEW_SOURCE,
              type: "sp:focus-group",
              page,
              group,
            });
          } else {
            pendingFocusRef.current = { page, group };
          }
        },
      }),
      [src, isReady],
    );

    // When the iframe loads, mark as ready (catches hard reloads).
    const handleLoad = () => setIsReady(true);

    const handleRefreshClick = () => {
      if (onRefresh) {
        onRefresh();
      } else {
        // Fallback: plain reload.
        setIsReady(false);
        if (iframeRef.current) {
          iframeRef.current.src = src;
        }
      }
    };

    const handleOpenExternal = () => {
      if (onOpenExternal) {
        onOpenExternal();
      } else {
        window.open("/", "_blank", "noopener");
      }
    };

    return (
      <div className="flex h-full flex-col gap-2">
        {/* Toolbar */}
        <div className="bg-muted/40 flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5">
          {/* Device toggles — left side */}
          <div className="flex items-center gap-1">
            <Button
              variant={device === "desktop" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              aria-label="Desktop preview"
              aria-pressed={device === "desktop"}
              onClick={() => setDevice("desktop")}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={device === "tablet" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              aria-label="Tablet preview (768px)"
              aria-pressed={device === "tablet"}
              onClick={() => setDevice("tablet")}
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={device === "mobile" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              aria-label="Mobile preview (390px)"
              aria-pressed={device === "mobile"}
              onClick={() => setDevice("mobile")}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>

          {/* Refresh + open-in-new-tab — right side */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Refresh preview"
              onClick={handleRefreshClick}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Open storefront in new tab"
              onClick={handleOpenExternal}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Iframe wrapper — device-constrained, centered */}
        <div className="bg-muted/20 relative flex flex-1 justify-center overflow-hidden rounded-lg border">
          <div
            className="relative h-full transition-[width] duration-300"
            style={{ width: DEVICE_WIDTHS[device] }}
          >
            <iframe
              ref={iframeRef}
              src={src}
              title="Live storefront preview"
              onLoad={handleLoad}
              className="h-full w-full border-0"
              style={{ minHeight: "600px" }}
            />

            {/* Shimmer overlay while a draft save is in-flight */}
            {isUpdating && (
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-0 z-10",
                  "animate-pulse bg-white/20 backdrop-blur-[1px]",
                )}
              />
            )}
          </div>
        </div>
      </div>
    );
  },
);
