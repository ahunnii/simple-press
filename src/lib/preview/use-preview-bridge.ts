"use client";

import { useEffect, useRef } from "react";

/** Tag added to every preview postMessage to distinguish it from other messages. */
export const PREVIEW_SOURCE = "simplepress-preview";

// ---------------------------------------------------------------------------
// Message type definitions
// ---------------------------------------------------------------------------

export type PreviewMessage =
  | { source: typeof PREVIEW_SOURCE; type: "sp:ready" }
  | { source: typeof PREVIEW_SOURCE; type: "sp:refresh" }
  | {
      source: typeof PREVIEW_SOURCE;
      type: "sp:edit-group";
      page: string;
      group: string;
    }
  | {
      source: typeof PREVIEW_SOURCE;
      type: "sp:focus-group";
      page: string;
      group: string;
    }
  | {
      source: typeof PREVIEW_SOURCE;
      type: "sp:patch-fields";
      fields: Record<string, string>;
    }
  | {
      source: typeof PREVIEW_SOURCE;
      type: "sp:patched";
      applied: string[];
      missed: string[];
    };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Type-guard for incoming preview messages. */
export function isPreviewMessage(data: unknown): data is PreviewMessage {
  if (data == null || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/dot-notation
  return d["source"] === PREVIEW_SOURCE && typeof d["type"] === "string";
}

/**
 * Post a message to an iframe, validating that the ref is live first.
 * Returns false if the iframe is not ready.
 */
export function postToIframe(
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
  message: PreviewMessage,
): boolean {
  const win = iframeRef.current?.contentWindow;
  if (!win) return false;
  win.postMessage(message, window.location.origin);
  return true;
}

/**
 * Listen for same-origin preview messages from either the parent window
 * (inside the iframe) or child iframes (in the parent).
 *
 * @param handler - Called with validated PreviewMessages. Stable ref — safe to
 *   pass an inline function; the effect will not re-run on every render.
 */
export function useIframeMessages(
  handler: (msg: PreviewMessage) => void,
): void {
  // Stable ref so the effect does not need `handler` as a dependency.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      // Same-origin guard.
      if (event.origin !== window.location.origin) return;
      if (!isPreviewMessage(event.data)) return;
      handlerRef.current(event.data);
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []); // intentionally empty — only registers once
}
