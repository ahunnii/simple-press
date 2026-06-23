"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "sp_popup_seen";

type PopupModalProps = {
  /** The config version string. If sessionStorage stores this exact value, the popup never shows. */
  version: string;
  /**
   * Render-prop: receives the close function so the template controls its own
   * close button, CTA layout, and visual structure.
   */
  children: (close: () => void) => React.ReactNode;
  /** Optional label for aria-label on the dialog container. Defaults to "Announcement". */
  ariaLabel?: string;
  className?: string;
};

/**
 * Template-agnostic accessible modal wrapper for homepage popups.
 *
 * Behavior:
 * - Renders nothing until hydrated (avoids SSR mismatch).
 * - Once-per-session: if sessionStorage["sp_popup_seen"] === version, never shows.
 * - prefers-reduced-motion: skips entrance animation.
 * - Focus management: focuses the first focusable element inside the dialog on open;
 *   traps Tab/Shift+Tab within it; Escape closes; restores focus to the previously
 *   focused element on close.
 * - Backdrop click closes the modal.
 * - close() writes version to sessionStorage and hides the modal.
 *
 * Presentation is fully controlled by children (close) => ReactNode.
 */
export function PopupModal({
  version,
  children,
  ariaLabel = "Announcement",
  className,
}: PopupModalProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Hydration + once-per-session check
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored === version) {
        setIsHydrated(true);
        return; // Already seen this version this session
      }
    } catch {
      // sessionStorage unavailable — show the popup
    }

    // Check reduced motion preference
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);

    setIsHydrated(true);
    setIsVisible(true);
  }, [version]);

  const close = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, version);
    } catch {
      // Storage write failed — still dismiss in-memory
    }
    setIsVisible(false);

    // Restore focus to the element that was focused before the modal opened
    if (previousFocusRef.current instanceof HTMLElement) {
      previousFocusRef.current.focus();
    }
  }, [version]);

  // Focus management: record prior focus, focus first focusable element on open
  useEffect(() => {
    if (!isVisible) return;

    previousFocusRef.current = document.activeElement;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = getFocusableElements(dialog);
    const first = focusable[0];
    if (first) {
      first.focus();
    }
  }, [isVisible]);

  // Keyboard handling: Escape closes; Tab traps within dialog
  useEffect(() => {
    if (!isVisible) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }

      if (e.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusable = getFocusableElements(dialog);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isVisible, close]);

  if (!isHydrated || !isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={close}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 49,
          background: "rgba(0,0,0,0.5)",
          animation: prefersReducedMotion
            ? undefined
            : "sp-popup-backdrop-in 0.2s ease forwards",
        }}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={className}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            pointerEvents: "auto",
            animation: prefersReducedMotion
              ? undefined
              : "sp-popup-in 0.2s ease forwards",
          }}
        >
          {children(close)}
        </div>
      </div>

      <style>{`
        @keyframes sp-popup-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes sp-popup-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}

/** Returns all keyboard-focusable elements inside a container, in DOM order. */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
    "details > summary",
  ].join(", ");

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.closest("[inert]") && el.offsetParent !== null,
  );
}
