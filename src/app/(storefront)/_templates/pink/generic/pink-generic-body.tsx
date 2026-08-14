"use client";

import { useEffect, useRef, useState } from "react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import { slugify } from "~/lib/utils";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { countH2Headings } from "../blog/pink-blog-shared";

type Heading = { id: string; text: string };

/**
 * Sticky "On this page" TOC, auto-built from the H2s actually rendered by
 * `TiptapRenderer` (DOM-based, like `PinkPostToc` in the blog post page) —
 * design.md: "one 15px row per H2 in page.content", rendered only when
 * there are ≥2 H2s.
 */
function PinkGenericToc({
  contentRef,
}: {
  contentRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const nodes = el.querySelectorAll("h2");
    const list: Heading[] = [];
    const seen = new Map<string, number>();
    nodes.forEach((node) => {
      const text = node.textContent?.trim() ?? "";
      if (!text) return;
      const base = slugify(text);
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count + 1}`;
      node.id = id;
      list.push({ id, text });
    });
    setHeadings(list);
  }, [contentRef]);

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav
      aria-label="On this page"
      className="sticky hidden self-start lg:block"
      style={{ top: "var(--pink-sticky-top)" }}
    >
      <p
        className="pink-label mb-3 pb-3"
        style={{ borderBottom: "1px solid var(--pink-ink)" }}
      >
        On this page
      </p>
      <ul className="flex flex-col">
        {headings.map((h) => (
          <li
            key={h.id}
            style={{ borderBottom: "1px solid var(--pink-line-soft)" }}
          >
            <a
              href={`#${h.id}`}
              className="block py-2.5 text-[15px] transition-colors"
              style={{
                color:
                  activeId === h.id ? "var(--pink-rose)" : "var(--pink-body)",
              }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function formatUpdated(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type Props = {
  content: unknown;
  /** Set when `page.type === "policy"` — renders a "Last updated" date line
   * above the article body (playbook → GenericPage: "If page.type ===
   * 'policy', show a 'Last updated' date line."). */
  isPolicy?: boolean;
  updatedAt?: Date | string;
  /** The `global.page-sidebar` CTA + contact note, already gated by the
   * server parent. Rendered under the TOC when one exists, or full-width
   * below the article when it doesn't (the TOC column disappears, but the
   * owner's sidebar content should not — see build report for reasoning). */
  sidebar?: React.ReactNode;
};

/**
 * The TOC + article grid for the generic CMS page. Client component because
 * the TOC needs a DOM ref + IntersectionObserver; the server parent
 * (`pink-generic-page.tsx`) resolves everything else and hands this off
 * (server → client handoff idiom).
 */
export function PinkGenericBody({
  content,
  isPolicy,
  updatedAt,
  sidebar,
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const hasToc = countH2Headings(content) >= 2;

  const gridClass = hasToc
    ? "grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,214px)_minmax(0,1fr)] lg:gap-[56px]"
    : "grid grid-cols-1";

  return (
    <section className="px-5 py-11 md:px-10 md:py-[44px]">
      <div className={`mx-auto max-w-[1400px] pb-16 md:pb-[88px] ${gridClass}`}>
        {hasToc && (
          <div className="flex flex-col gap-10">
            <PinkGenericToc contentRef={contentRef} />
            {sidebar}
          </div>
        )}

        <div className="flex flex-col gap-12">
          <div ref={contentRef}>
            {isPolicy && updatedAt && (
              <p
                className="pink-label mb-6"
                style={{ color: "var(--pink-subtle)" }}
              >
                Last updated · {formatUpdated(updatedAt)}
              </p>
            )}
            <TiptapRenderer
              content={content as TiptapJSON}
              className="pink-prose max-w-[74ch]"
            />
          </div>
          {!hasToc && sidebar}
        </div>
      </div>
    </section>
  );
}
