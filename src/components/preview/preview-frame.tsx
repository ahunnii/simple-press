"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import {
  postToIframe,
  PREVIEW_SOURCE,
  useIframeMessages,
  type PreviewMessage,
} from "~/lib/preview/use-preview-bridge";
import { cn } from "~/lib/utils";

export type PreviewFrameHandle = {
  /** Reload the storefront iframe to pick up the latest preview draft. */
  refresh(): void;
  /** Scroll the overlay to a specific section group and highlight it. */
  focusGroup(page: string, group: string): void;
  /** Post an arbitrary preview message to the iframe (generic escape hatch). */
  postMessage(msg: PreviewMessage): boolean;
};

type Props = {
  /** Storefront path to preview (e.g. "/" or "/about"). Defaults to "/". */
  path?: string;
  /** Called when the overlay inside the iframe sends sp:edit-group. */
  onEditGroup?: (page: string, group: string) => void;
  /** Called when the iframe acks a live text patch (sp:patched). */
  onPatched?: (applied: string[], missed: string[]) => void;
  /** Whether a draft save is in-flight — shows a shimmer over the iframe. */
  isUpdating?: boolean;
  /** Width to render the iframe wrapper at (controlled from parent). */
  width?: string;
  /** Extra className applied to the outer wrapper. */
  className?: string;
};

/**
 * Headless iframe + postMessage bridge for the live storefront preview.
 * Owns only the iframe element and bridge mechanics — no toolbar/chrome.
 * Exposes `refresh()`, `focusGroup()`, and `postMessage()` via an imperative ref.
 */
export const PreviewFrame = forwardRef<PreviewFrameHandle, Props>(
  function PreviewFrame(
    {
      path = "/",
      onEditGroup,
      onPatched,
      isUpdating = false,
      width = "100%",
      className,
    },
    ref,
  ) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isReady, setIsReady] = useState(false);
    /** Removes the current in-iframe navigation guard listener. */
    const navGuardCleanupRef = useRef<(() => void) | null>(null);

    const src = `${path}?__preview=1`;

    /**
     * Block in-preview navigations that would desync the editor.
     *
     * The storefront rendered in the iframe is fully live: its nav links,
     * buttons, and product cards will happily navigate the iframe to another
     * page. When that happens the editor chrome (section rail, page switcher,
     * field panel) stays on the OLD page while the iframe shows a new one —
     * the two fall out of sync and hotspots point at the wrong document.
     *
     * We attach a capture-phase click listener on the iframe's document and
     * `preventDefault()` on any INTERNAL anchor (same-origin absolute path).
     * Capture runs before Next.js's own `<Link>` handler, which bails when the
     * event is already `defaultPrevented`, so client-side SPA navigations are
     * suppressed too. External links, new-tab links, downloads, `mailto:` /
     * `tel:`, and in-page hashes are left untouched. We do NOT stop
     * propagation, so the preview overlay still receives the click for
     * click-to-edit. Owners change pages via the editor's own page switcher.
     */
    const attachNavGuard = () => {
      navGuardCleanupRef.current?.();
      navGuardCleanupRef.current = null;

      const iframe = iframeRef.current;
      let resolvedDoc: Document | null = null;
      try {
        resolvedDoc = iframe?.contentDocument ?? null;
      } catch {
        // Cross-origin (shouldn't happen for same-origin preview) — skip.
        resolvedDoc = null;
      }
      if (!resolvedDoc) return;
      const doc = resolvedDoc;

      const onClick = (event: MouseEvent) => {
        if (event.defaultPrevented) return;
        // Only intercept plain left-clicks — let modifier/middle clicks (open
        // in new tab, etc.) behave normally.
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        const target = event.target as Element | null;
        const anchor = target?.closest?.("a") ?? null;
        if (!anchor) return;

        const href = anchor.getAttribute("href");
        if (!href) return;
        // Explicit new-tab / download links pass through.
        if (anchor.target && anchor.target !== "_self") return;
        if (anchor.hasAttribute("download")) return;

        if (/^(https?:)?\/\//i.test(href)) {
          // Absolute URL: only guard same-origin ones; external links leave.
          try {
            if (new URL(anchor.href).origin !== anchor.ownerDocument.location.origin) {
              return;
            }
          } catch {
            return;
          }
        } else if (!href.startsWith("/")) {
          // mailto:, tel:, #hash, and relative fragments are not page changes.
          return;
        }

        // Internal navigation — block it so the iframe stays on the page the
        // editor chrome is bound to.
        event.preventDefault();
      };

      doc.addEventListener("click", onClick, true);
      navGuardCleanupRef.current = () => {
        doc.removeEventListener("click", onClick, true);
      };
    };

    // A prop-driven path change navigates the iframe: reset readiness so
    // focusGroup() calls queue (via pendingFocusRef) instead of being posted
    // to a document that is about to unload.
    useEffect(() => {
      setIsReady(false);
    }, [src]);

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
      if (msg.type === "sp:patched") {
        onPatched?.(msg.applied, msg.missed);
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
        postMessage(msg: PreviewMessage) {
          return postToIframe(iframeRef, msg);
        },
      }),
      [src, isReady],
    );

    // When the iframe loads, mark as ready (catches hard reloads) and re-arm
    // the navigation guard on the freshly loaded document.
    const handleLoad = () => {
      setIsReady(true);
      attachNavGuard();
    };

    // Detach the navigation guard on unmount so we don't leak a listener on a
    // document that's going away.
    useEffect(() => {
      return () => {
        navGuardCleanupRef.current?.();
        navGuardCleanupRef.current = null;
      };
    }, []);

    return (
      <div
        className={cn("relative h-full transition-[width] duration-300", className)}
        style={{ width }}
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
    );
  },
);
