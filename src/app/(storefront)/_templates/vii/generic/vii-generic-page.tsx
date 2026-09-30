"use client";

import { useEffect, useRef, useState } from "react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { PageTransition } from "~/components/page-animations";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { VII_TEXT_MEASURE } from "../shared/vii-page-edge";
import { ViiReveal } from "../shared/vii-reveal";
import { ViiGenericCoverHero } from "./vii-generic-cover-hero";
import { ViiPageBand } from "./vii-page-band";
import { ViiPageSection } from "./vii-page-section";

type Page = NonNullable<RouterOutputs["content"]["getPageBySlug"]>;

const KICKER: Record<string, string> = {
  policy: "Policy",
  blog: "Blog",
};

function formatUpdated(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type Heading = { id: string; text: string; level: 2 | 3 };

/**
 * Walks the Tiptap JSON to detect whether the page has any h2/h3 headings —
 * mirroring what {@link ViiToc} looks for in the rendered DOM. Used to decide
 * whether to render the two-column TOC grid: when there are no headings the
 * grid would otherwise auto-place the lone article column into the narrow
 * 200px track, squeezing galleries and other content into a thin strip.
 */
function hasTocHeadings(content: unknown): boolean {
  const walk = (node: unknown): boolean => {
    if (node == null || typeof node !== "object") return false;
    const n = node as {
      type?: string;
      attrs?: { level?: number };
      content?: unknown;
    };
    if (
      n.type === "heading" &&
      (n.attrs?.level === 2 || n.attrs?.level === 3)
    ) {
      return true;
    }
    return Array.isArray(n.content) && n.content.some(walk);
  };
  return walk(content);
}

function ViiToc({
  contentRef,
}: {
  contentRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    // Inject IDs into rendered headings and build the TOC list
    const nodes = el.querySelectorAll("h2, h3");
    const list: Heading[] = [];
    const seen = new Map<string, number>();
    nodes.forEach((node) => {
      const text = node.textContent?.trim() ?? "";
      if (!text) return;
      const base = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      // De-duplicate: two identical-text headings would otherwise collide on
      // the same DOM id, breaking anchors and scroll-spy for the later one.
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count + 1}`;
      node.id = id;
      list.push({ id, text, level: node.tagName === "H2" ? 2 : 3 });
    });
    setHeadings(list);
  }, [contentRef]);

  // Scroll-spy: highlight the current section
  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
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
      className="sticky top-[calc(72px+32px)] hidden self-start lg:block"
    >
      <p
        className="mb-4 text-[11px] font-medium tracking-[0.14em] uppercase"
        style={{ color: "var(--vii-ink-soft)" }}
      >
        On this page
      </p>
      <ul
        className="flex flex-col gap-1.5 border-l"
        style={{ borderColor: "var(--vii-hairline)" }}
      >
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={cn(
                "-ml-px block border-l-[2px] py-0.5 text-[13px] transition-colors",
                h.level === 3 ? "pl-5" : "pl-3",
              )}
              style={
                activeId === h.id
                  ? {
                      borderColor: "var(--vii-copper-deep)",
                      color: "var(--vii-navy)",
                      fontWeight: 500,
                    }
                  : {
                      borderColor: "transparent",
                      color: "var(--vii-ink-soft)",
                    }
              }
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ViiGenericPage({ page }: { page: Page }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const kicker = KICKER[page.type] ?? "";
  const showToc = hasTocHeadings(page.content);
  const isPolicy = page.type === "policy";
  const hasCover = !!page.image?.trim();

  // Article body — identical regardless of whether the TOC sidebar is shown.
  // It sits on vii's page edge (the hero's left edge, 86px at 1440 — B1.7):
  // running text (paragraphs, headings, lists, quotes) is capped at a
  // readable measure, while galleries, images and tables keep the full
  // column so media isn't shrunk to the text width.
  const articleBody = (
    <div className="w-full min-w-0">
      {isPolicy && (
        <p
          className="mb-8 text-[11px] font-medium tracking-[0.12em] uppercase"
          style={{ color: "var(--vii-ink-soft)" }}
        >
          Last updated · {formatUpdated(page.updatedAt)}
        </p>
      )}

      {/* Colors are applied via prose-* modifiers (which set color directly on
          descendants) rather than --tw-prose-* vars on a parent — the latter are
          shadowed by .prose's own var declarations on the rendered element. */}
      <div ref={contentRef}>
        <TiptapRenderer
          content={page.content as TiptapJSON}
          className={cn(
            "prose w-full max-w-none",
            // Readable measure for running text; media stays column-wide.
            "[&_:is(p,h2,h3,h4,h5,h6,ul,ol,blockquote,pre,hr)]:max-w-[720px]",
            // Headings — Playfair Display, navy
            "prose-headings:font-serif prose-headings:font-medium prose-headings:tracking-tight",
            "prose-headings:text-[var(--vii-navy)]",
            "prose-h2:text-[1.5rem] prose-h2:mt-12 prose-h2:mb-4",
            "prose-h3:text-[1.2rem] prose-h3:mt-8 prose-h3:mb-3",
            // Body text — Jost, ink-soft
            "prose-p:text-[15px] prose-p:leading-[1.6] prose-p:text-[var(--vii-ink-soft)]",
            "prose-li:text-[15px] prose-li:leading-[1.6] prose-li:text-[var(--vii-ink-soft)]",
            // Links — copper-deep (meets AA on light bg)
            "prose-a:underline prose-a:underline-offset-2 prose-a:text-[var(--vii-copper-deep)]",
            // Strong — navy
            "prose-strong:font-semibold prose-strong:text-[var(--vii-navy)]",
            // Quotes, rules & table borders — ink-soft / tan / hairline
            "prose-blockquote:text-[var(--vii-ink-soft)] prose-blockquote:border-[var(--vii-tan)]",
            "prose-hr:border-[var(--vii-hairline)]",
            "prose-th:text-[var(--vii-navy)] prose-th:border-[var(--vii-hairline)] prose-td:border-[var(--vii-hairline)]",
          )}
        />
      </div>

      <div style={{ maxWidth: VII_TEXT_MEASURE }}>
        <PlatformPolicyNotice slug={page.slug} />
      </div>
    </div>
  );

  return (
    <PageTransition>
      {/* No nested `.vii` scope here: the layout root already carries it
          (plus the owner's palette overrides inline). A second `.vii` would
          re-declare the stock tokens and mask the chosen palette. */}

      {/* ── Page hero ───────────────────────────────────────────────── */}
      {hasCover ? (
        <ViiGenericCoverHero
          image={page.image!}
          title={page.title}
          excerpt={page.excerpt ?? undefined}
          kicker={kicker}
        />
      ) : (
        /* Cream editorial band — shown when no cover image is set. The
           optional pages (events, videos, donate, FAQ) reuse this band. */
        <ViiPageBand
          title={page.title}
          overline={kicker}
          intro={page.excerpt ?? undefined}
        />
      )}

      {/* ── Content ─────────────────────────────────────────────────── */}
      <ViiPageSection paddingY="clamp(48px, 6vw, 64px)">
        <ViiReveal>
          {showToc ? (
            // Article on the page edge, TOC in a right-hand rail, so the
            // body's left edge never moves off the hero's.
            <div className="grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,1fr)_200px]">
              <div className="lg:col-start-2 lg:row-start-1">
                <ViiToc contentRef={contentRef} />
              </div>
              <div className="min-w-0 lg:col-start-1 lg:row-start-1">
                {articleBody}
              </div>
            </div>
          ) : (
            articleBody
          )}
        </ViiReveal>
      </ViiPageSection>
    </PageTransition>
  );
}
