"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

/**
 * True only when running inside the visual editor's preview iframe — i.e. in
 * a frame (`window.self !== window.top`) AND loaded with `?__preview=1`.
 *
 * Deliberately the same two signals `PreviewOverlay` / `PreviewFieldPatcher`
 * use (`src/components/preview/preview-overlay.tsx`). Both must hold: a real
 * visitor is never framed by the editor, and the editor always appends the
 * query flag (`preview-frame.tsx` builds its src as `${path}?__preview=1`).
 * Returns false on the server, so the guard is inert during SSR.
 */
function isPreviewFrame() {
  return (
    typeof window !== "undefined" &&
    window.self !== window.top &&
    new URLSearchParams(window.location.search).get("__preview") === "1"
  );
}

/**
 * Neutralises the auth card while it is being previewed in `/editor`.
 *
 * The preview iframe renders the REAL sign-in page. Its navigation guard
 * (`preview-frame.tsx`) blocks anchor clicks, but nothing stops a form
 * submission — an owner poking at the previewed form would genuinely sign in
 * (or out, or request a password reset) and navigate the iframe away from the
 * page the editor chrome is bound to.
 *
 * So in preview only, the card is marked `inert` (no pointer events, no focus,
 * no submission, removed from the a11y tree) and dimmed, with a pill saying
 * why. Outside the preview iframe this renders `children` completely
 * unwrapped — production auth is untouched, and the first client render
 * matches the server render, so hydration is unaffected.
 */
export function AuthPreviewGuard({ children }: { children: ReactNode }) {
  // Hydration-safe: false on the server and on the first client render.
  const [inPreview, setInPreview] = useState(false);

  useEffect(() => {
    setInPreview(isPreviewFrame());
  }, []);

  if (!inPreview) return <>{children}</>;

  return (
    <div className="relative">
      <div inert className="opacity-60 select-none">
        {children}
      </div>
      <p className="bg-foreground/90 text-background pointer-events-none absolute inset-x-0 -top-3 mx-auto w-fit rounded-full px-3 py-1 text-xs font-medium shadow-sm">
        Preview — the form is disabled here
      </p>
    </div>
  );
}
