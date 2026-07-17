"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Edit2 } from "lucide-react";

import {
  isPreviewMessage,
  PREVIEW_SOURCE,
} from "~/lib/preview/use-preview-bridge";

type Hotspot = {
  group: string; // full "page.group" value from data-sp-group
  rect: DOMRect;
  label: string;
};

/**
 * Returns true only when running inside a preview iframe with `?__preview=1` in the URL.
 * Safe to call before hydration guard — returns false on the server.
 */
function isPreviewFrame() {
  return (
    typeof window !== "undefined" &&
    window.self !== window.top &&
    new URLSearchParams(window.location.search).get("__preview") === "1"
  );
}

/**
 * Preview overlay — renders hover/click hotspots over `[data-sp-group]` sections.
 * Safe to mount in the always-rendered storefront layout — self-disables for normal
 * visitors (not in an iframe with `?__preview=1`).
 *
 * Behaviour:
 * - Delegated mouseover/mouseout find the nearest [data-sp-group] ancestor.
 * - Hovering draws a fixed-position highlight + "Edit" pill.
 * - Clicking anywhere inside the highlight box posts `sp:edit-group` to the parent.
 * - Listens for `sp:focus-group` from the parent → scrollIntoView + pulse.
 * - A11y: the highlight box is a focusable `<button>` with aria-label; each hotspot
 *   also has a sr-only companion `<button>` (Tab + Enter).
 * - Posts `sp:ready` on mount so the editor knows the iframe is interactive.
 * - Respects `prefers-reduced-motion` — no smooth scroll or pulse animation.
 */
export function PreviewOverlay() {
  // Hydration-safe iframe detection — false on SSR/first render, true after mount if in preview iframe.
  const [inIframe, setInIframe] = useState(false);

  const [hovered, setHovered] = useState<Hotspot | null>(null);
  const [pulsing, setPulsing] = useState<string | null>(null);
  const raftRef = useRef<number | null>(null);
  const prefersReducedRef = useRef(false);

  // Detect whether we're running inside a preview iframe.
  useEffect(() => {
    setInIframe(isPreviewFrame());
  }, []);

  // Detect reduced motion preference once on mount.
  useEffect(() => {
    prefersReducedRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  // Post sp:ready so the parent editor knows the overlay is live.
  useEffect(() => {
    if (!isPreviewFrame()) return;
    window.parent.postMessage(
      { source: PREVIEW_SOURCE, type: "sp:ready" },
      window.location.origin,
    );
  }, []);

  // Listen for sp:focus-group from the parent editor.
  useEffect(() => {
    if (!isPreviewFrame()) return;

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (!isPreviewMessage(event.data)) return;
      const msg = event.data;
      if (msg.type !== "sp:focus-group") return;

      const groupId = `${msg.page}.${msg.group}`;
      const el = document.querySelector<HTMLElement>(
        `[data-sp-group="${CSS.escape(groupId)}"]`,
      );
      if (!el) return;

      el.scrollIntoView({
        behavior: prefersReducedRef.current ? "auto" : "smooth",
        block: "center",
      });

      // Pulse the section briefly.
      setPulsing(groupId);
      setTimeout(() => setPulsing(null), 1200);
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Recompute hovered element rect on scroll/resize via rAF.
  const updateRect = useCallback(() => {
    if (raftRef.current !== null) cancelAnimationFrame(raftRef.current);
    raftRef.current = requestAnimationFrame(() => {
      setHovered((prev) => {
        if (!prev) return null;
        const el = document.querySelector<HTMLElement>(
          `[data-sp-group="${CSS.escape(prev.group)}"]`,
        );
        if (!el) return null;
        return { ...prev, rect: el.getBoundingClientRect() };
      });
    });
  }, []);

  useEffect(() => {
    if (!isPreviewFrame()) return;
    window.addEventListener("scroll", updateRect, { passive: true });
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect);
      window.removeEventListener("resize", updateRect);
    };
  }, [updateRect]);

  // Delegated mouse handlers.
  useEffect(() => {
    if (!isPreviewFrame()) return;

    function findGroup(target: EventTarget | null): HTMLElement | null {
      let el = target as HTMLElement | null;
      while (el && el !== document.body) {
        if (el.dataset?.spGroup) return el;
        el = el.parentElement;
      }
      return null;
    }

    function onMouseOver(e: MouseEvent) {
      // Ignore events over our own highlight button so it doesn't flicker
      // (the button sits on top of the section but isn't a [data-sp-group]).
      if ((e.target as HTMLElement | null)?.closest?.("[data-sp-overlay]")) {
        return;
      }
      const el = findGroup(e.target);
      if (!el) {
        setHovered(null);
        return;
      }
      const group = el.dataset.spGroup ?? "";
      const label = group.split(".").pop() ?? group;
      setHovered({ group, rect: el.getBoundingClientRect(), label });
    }

    function onMouseOut(e: MouseEvent) {
      const related = e.relatedTarget as HTMLElement | null;
      // Moving onto our own highlight button counts as still hovering the section.
      if (related?.closest?.("[data-sp-overlay]")) return;
      if (related && findGroup(related)) return; // still inside a group
      setHovered(null);
    }

    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);
    return () => {
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, []);

  function sendEditGroup(groupId: string) {
    const page = groupId.split(".")[0];
    if (!page) return;
    window.parent.postMessage(
      { source: PREVIEW_SOURCE, type: "sp:edit-group", page, group: groupId },
      window.location.origin,
    );
  }

  // Collect all annotated sections for keyboard-accessible companion buttons.
  const [allGroups, setAllGroups] = useState<
    Array<{ id: string; label: string }>
  >([]);

  useEffect(() => {
    if (!isPreviewFrame()) return;
    const els = document.querySelectorAll<HTMLElement>("[data-sp-group]");
    const groups: Array<{ id: string; label: string }> = [];
    els.forEach((el) => {
      const id = el.dataset.spGroup ?? "";
      const label = id.split(".").pop() ?? id;
      groups.push({ id, label });
    });
    setAllGroups(groups);
  }, []);

  // After all hooks are declared: render nothing when not inside an iframe.
  if (!inIframe) return null;

  return (
    <>
      {/* Fixed highlight overlay — the whole box is an interactive button */}
      {hovered && (
        <button
          aria-label={`Edit ${hovered.label} section`}
          data-sp-overlay=""
          style={{
            position: "fixed",
            top: hovered.rect.top,
            left: hovered.rect.left,
            width: hovered.rect.width,
            height: hovered.rect.height,
            pointerEvents: "auto",
            zIndex: 9999,
            outline: "2px solid hsl(214, 84%, 56%)",
            outlineOffset: "-2px",
            borderRadius: "2px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
            transition: prefersReducedRef.current ? "none" : "all 0.1s ease",
          }}
          onClick={() => sendEditGroup(hovered.group)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              sendEditGroup(hovered.group);
            }
          }}
          // Visible focus ring (supplement the outline already present on hover)
          className="focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:outline-none"
        >
          {/* Edit pill — visual affordance only, not separately interactive */}
          <span
            aria-hidden="true"
            style={{ pointerEvents: "none" }}
            className="absolute top-2 right-2 flex items-center gap-1 rounded-sm bg-blue-600 px-2 py-1 text-xs font-medium text-white shadow-md"
          >
            <Edit2 className="h-3 w-3" />
            Edit
          </span>
        </button>
      )}

      {/* Pulse ring for sp:focus-group */}
      {pulsing &&
        (() => {
          const el = document.querySelector<HTMLElement>(
            `[data-sp-group="${CSS.escape(pulsing)}"]`,
          );
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return (
            <div
              aria-hidden="true"
              style={{
                position: "fixed",
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                pointerEvents: "none",
                zIndex: 9998,
                outline: "3px solid hsl(214, 84%, 56%)",
                outlineOffset: "2px",
                borderRadius: "2px",
                animation: prefersReducedRef.current
                  ? "none"
                  : "sp-pulse 1.2s ease-out forwards",
              }}
            />
          );
        })()}

      {/* Keyboard-accessible companion buttons (screen-reader visible) */}
      <div className="sr-only">
        {allGroups.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => sendEditGroup(id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                sendEditGroup(id);
              }
            }}
            aria-label={`Edit ${label} section in template editor`}
          >
            Edit {label}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes sp-pulse {
          0%   { opacity: 1; outline-color: hsl(214, 84%, 56%); }
          100% { opacity: 0; outline-color: hsl(214, 84%, 80%); }
        }
      `}</style>
    </>
  );
}
