"use client";

import { useEffect, useRef } from "react";

import {
  PREVIEW_SOURCE,
  useIframeMessages,
} from "~/lib/preview/use-preview-bridge";

/**
 * Returns true only when running inside a preview iframe with `?__preview=1`.
 * Safe on the server — returns false.
 */
function isPreviewFrame() {
  return (
    typeof window !== "undefined" &&
    window.self !== window.top &&
    new URLSearchParams(window.location.search).get("__preview") === "1"
  );
}

/**
 * Live text patcher for the visual editor's preview iframe.
 *
 * Listens for `sp:patch-fields` from the parent editor and swaps the
 * `textContent` of every `[data-sp-field="<key>"]` element in place — no
 * reload, no React involvement. Acks with `sp:patched` so the editor knows
 * which keys were applied and which need the draft-save + refresh fallback.
 *
 * A MutationObserver re-applies patches whose annotated elements get
 * re-rendered by client components (scroll animations, state changes) —
 * server HTML stays the source of truth, this only papers over the window
 * until the next real iframe refresh.
 *
 * Mounted in the always-rendered storefront layout next to PreviewOverlay;
 * self-disables for normal visitors.
 */
export function PreviewFieldPatcher() {
  /** key → latest patched value; re-applied when the DOM re-renders. */
  const patchesRef = useRef<Map<string, string>>(new Map());
  /** Guard: ignore mutations we cause ourselves while applying. */
  const applyingRef = useRef(false);

  useIframeMessages((msg) => {
    if (!isPreviewFrame()) return;
    if (msg.type !== "sp:patch-fields") return;

    const applied: string[] = [];
    const missed: string[] = [];

    applyingRef.current = true;
    try {
      for (const [key, value] of Object.entries(msg.fields)) {
        const els = document.querySelectorAll<HTMLElement>(
          `[data-sp-field="${CSS.escape(key)}"]`,
        );
        if (els.length === 0) {
          patchesRef.current.delete(key);
          missed.push(key);
          continue;
        }
        els.forEach((el) => {
          if (el.textContent !== value) el.textContent = value;
        });
        patchesRef.current.set(key, value);
        applied.push(key);
      }
    } finally {
      applyingRef.current = false;
    }

    window.parent.postMessage(
      { source: PREVIEW_SOURCE, type: "sp:patched", applied, missed },
      window.location.origin,
    );
  });

  // Re-apply patches clobbered by client re-renders (animations etc.).
  useEffect(() => {
    if (!isPreviewFrame()) return;

    const observer = new MutationObserver(() => {
      if (applyingRef.current) return;
      if (patchesRef.current.size === 0) return;
      applyingRef.current = true;
      try {
        for (const [key, value] of patchesRef.current) {
          const els = document.querySelectorAll<HTMLElement>(
            `[data-sp-field="${CSS.escape(key)}"]`,
          );
          els.forEach((el) => {
            if (el.textContent !== value) el.textContent = value;
          });
        }
      } finally {
        applyingRef.current = false;
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
