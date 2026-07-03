"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
  ExternalLink,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
} from "lucide-react";

import { Button } from "~/components/ui/button";

import { PreviewFrame, type PreviewFrameHandle } from "./preview-frame";

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
    const frameRef = useRef<PreviewFrameHandle>(null);
    const [device, setDevice] = useState<DeviceWidth>("desktop");

    // Expose imperative API to the parent editor.
    useImperativeHandle(
      ref,
      () => ({
        refresh() {
          frameRef.current?.refresh();
        },
        focusGroup(page: string, group: string) {
          frameRef.current?.focusGroup(page, group);
        },
      }),
      [],
    );

    const handleRefreshClick = () => {
      if (onRefresh) {
        onRefresh();
      } else {
        // Fallback: plain reload.
        frameRef.current?.refresh();
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
          <PreviewFrame
            ref={frameRef}
            path={path}
            onEditGroup={onEditGroup}
            isUpdating={isUpdating}
            width={DEVICE_WIDTHS[device]}
          />
        </div>
      </div>
    );
  },
);
