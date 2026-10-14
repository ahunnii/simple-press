"use client";

import { useEffect, useRef } from "react";

import type { WealthH2 } from "./headings";

import { assignHeadingIds } from "./headings";

/**
 * Stamps anchor ids onto the rendered rich-text `h2`s so the "On this page"
 * list can link to them. `TiptapRenderer` emits headings without ids, so this
 * pairs each rendered `h2` (by text, in document order) with the id the
 * server computed from the same JSON. Renders only a wrapper div: the prose
 * markup is untouched.
 */
export function WealthProseAnchors({
  headings,
  children,
}: {
  headings: WealthH2[];
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const nodes = [...root.querySelectorAll("h2")];
    const ids = assignHeadingIds(
      nodes.map((node) => node.textContent ?? ""),
      headings,
    );
    nodes.forEach((node, i) => {
      const id = ids[i];
      if (!id) return;
      node.id = id;
      // Clear the sticky header when jumping to the heading.
      node.style.scrollMarginTop = "calc(var(--wealth-header-offset) + 24px)";
    });
    // A deep link (/page#heading) is resolved before these ids exist.
    let hash = "";
    try {
      hash = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      // malformed escape in the hash: no deep link to resolve
    }
    if (hash && headings.some((h) => h.id === hash)) {
      document.getElementById(hash)?.scrollIntoView();
    }
  }, [headings]);

  return <div ref={ref}>{children}</div>;
}
