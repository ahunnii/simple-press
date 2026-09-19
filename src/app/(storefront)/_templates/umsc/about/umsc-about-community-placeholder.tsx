"use client";

import { useEffect, useState } from "react";

import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { UmscHeading } from "../shared/umsc-heading";
import { UmscImageFallback } from "../shared/umsc-image-fallback";
import { UmscSection } from "../shared/umsc-section";

/**
 * True only when running inside the visual editor's preview iframe — i.e. in
 * a frame (`window.self !== window.top`) AND loaded with `?__preview=1`.
 *
 * Same two signals `PreviewOverlay` / `PreviewFieldPatcher` check
 * (`src/components/preview/preview-overlay.tsx`), copied locally per
 * `auth-preview-guard.tsx` convention (that file's copy is private and not
 * exported/hoisted, so each preview-only component keeps its own). A real
 * visitor is never framed by the editor, and the editor always appends the
 * query flag (`preview-frame.tsx` builds its src as `${path}?__preview=1`).
 * Returns false on the server, so this is inert during SSR.
 */
function isPreviewFrame() {
  return (
    typeof window !== "undefined" &&
    window.self !== window.top &&
    new URLSearchParams(window.location.search).get("__preview") === "1"
  );
}

/**
 * UmscAboutCommunityPlaceholder — editor-only stand-in for design.md
 * "About #5" ("Our customers. Our community.") when the section's `gallery`
 * field is unset. `UmscAboutCommunity` (`umsc-about-community.tsx`) follows
 * design.md's "empty = hidden" contract and renders null on the public site
 * when no gallery is picked, so an owner browsing a fresh store has no
 * on-page hotspot to find that section's panel from. This component fills
 * that gap in the editor only: it renders the same `UmscSection` shell with
 * four `UmscImageFallback` tiles and a hint to pick a gallery, so the
 * section rail's hover/click affordances have something to land on.
 *
 * Preview-only via two signals (see `isPreviewFrame` above: framed AND
 * `?__preview=1`) checked in a `useEffect`, not during render, so the first
 * client render matches the server render (`inPreview` starts `false`) and
 * hydration is unaffected. On the public site, and on every server render,
 * this returns null exactly like `UmscAboutCommunity` does when empty.
 *
 * Known limitation: `PreviewOverlay` collects its keyboard-accessible
 * companion-button list (`allGroups`) once on mount by querying
 * `[data-sp-group]` in the DOM (preview-overlay.tsx ~line 261-277). Because
 * this placeholder only mounts once `isPreviewFrame()` resolves true in an
 * effect — after that initial query already ran — its `sectionGroupAttr`
 * is missed by the keyboard companion-button list. Mouse hover/click
 * hotspots still work (those resolve against the live DOM at event time).
 * The section rail in the editor chrome remains the reliable keyboard path
 * to this section's panel.
 *
 * Keeps the real `fieldKey` on the heading so any heading edits made while
 * this placeholder is showing still live-patch into `UmscAboutCommunity`
 * once a gallery is picked.
 */
export function UmscAboutCommunityPlaceholder({
  heading,
}: {
  heading: string;
}) {
  // Hydration-safe: false on the server and on the first client render.
  const [inPreview, setInPreview] = useState(false);

  useEffect(() => {
    setInPreview(isPreviewFrame());
  }, []);

  if (!inPreview) return null;

  return (
    <UmscSection
      tone="cream"
      aria-label="Our customers, our community"
      sectionAttrs={sectionGroupAttr("about", "community")}
    >
      <UmscHeading
        as="h2"
        fieldKey="umsc.about.community-heading"
        className="mb-10"
      >
        {heading}
      </UmscHeading>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <UmscImageFallback aspect="1 / 1" />
        <UmscImageFallback aspect="1 / 1" />
        <UmscImageFallback aspect="1 / 1" />
        <UmscImageFallback aspect="1 / 1" />
      </div>
      <p className="umsc-sans mt-4 max-w-[66ch] text-[13px] leading-[1.5] text-[var(--umsc-muted)]">
        Pick a gallery in this section&apos;s panel, or create one under
        Galleries.
      </p>
    </UmscSection>
  );
}
