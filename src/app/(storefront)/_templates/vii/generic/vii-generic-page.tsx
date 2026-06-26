"use client";

import { useEffect, useRef, useState } from "react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { PageTransition } from "~/components/page-animations";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { ViiOverline } from "../shared/vii-overline";
import { ViiReveal } from "../shared/vii-reveal";
import { ViiGenericCoverHero } from "./vii-generic-cover-hero";

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
    nodes.forEach((node) => {
      const text = node.textContent?.trim() ?? "";
      if (!text) return;
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
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
  const articleBody = (
    <div className="w-full">
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
            "prose w-full max-w-[1440px]",
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

      <PlatformPolicyNotice slug={page.slug} />
    </div>
  );

  return (
    <PageTransition>
      <div className="vii">
        {/* ── Page hero ───────────────────────────────────────────────── */}
        {hasCover ? (
          <ViiGenericCoverHero
            image={page.image!}
            title={page.title}
            excerpt={page.excerpt ?? undefined}
            kicker={kicker}
          />
        ) : (
          /* Cream editorial fallback — shown when no cover image is set */
          <section
            className="px-6 pt-36 pb-16 lg:px-8 lg:pt-44"
            style={{
              background: "var(--vii-cream)",
              borderBottom: "1px solid var(--vii-hairline)",
            }}
          >
            <div className="mx-auto max-w-[1440px]">
              {kicker && (
                <div className="mb-5">
                  <ViiOverline align="left" tone="light">
                    {kicker}
                  </ViiOverline>
                </div>
              )}
              <h1
                className="font-serif font-semibold tracking-tight"
                style={{
                  fontSize: "clamp(2rem, 4vw, 3.5rem)",
                  lineHeight: 1.1,
                  color: "var(--vii-navy)",
                  textWrap: "balance",
                }}
              >
                {page.title}
              </h1>
              {page.excerpt && (
                <p
                  className="mt-5 max-w-[560px] text-[17px] leading-[1.6]"
                  style={{
                    fontFamily: "var(--font-sans)",
                    color: "var(--vii-ink-soft)",
                  }}
                >
                  {page.excerpt}
                </p>
              )}
            </div>
          </section>
        )}

        {/* ── Content ─────────────────────────────────────────────────── */}
        <section className="px-6 py-16 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">
            <ViiReveal>
              {showToc ? (
                <div className="grid grid-cols-1 gap-16 lg:grid-cols-[200px_1fr]">
                  {/* TOC sidebar */}
                  <ViiToc contentRef={contentRef} />

                  {/* Article body */}
                  {articleBody}
                </div>
              ) : (
                // No headings → no TOC. Render full-width so galleries and
                // other content aren't collapsed into the narrow grid track.
                articleBody
              )}
            </ViiReveal>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
