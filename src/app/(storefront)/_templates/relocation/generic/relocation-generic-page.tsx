"use client";

import { useEffect, useRef, useState } from "react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { RelocationReveal } from "../shared/relocation-reveal";
import { RelocationWaveHero } from "../shared/relocation-wave-hero";

type Page = NonNullable<RouterOutputs["content"]["getPageBySlug"]>;

/**
 * `GenericPage` — renders arbitrary CMS `Page` records at `/[slug]`
 * (design.md → "Generic (CMS pages)"): a compact wave hero carrying the
 * page's own title (+ excerpt as the hero subtitle, when set) followed by the
 * Tiptap prose body and `PlatformPolicyNotice`. No template fields — see
 * `./index.ts`'s doc comment.
 *
 * Deliberately does NOT branch on `page.image` the way the default/vii
 * GenericPage reference implementations do (cover-image hero vs. plain
 * header) — design.md fixes this slot to the template's one signature
 * primitive, the wave hero, for every page. Everything else (TOC sidebar
 * gated on real h2/h3 headings, "Last updated" for policy pages,
 * `PlatformPolicyNotice`) follows `default-generic-page.tsx` /
 * `coop-generic-page.tsx` closely, per the page-playbook's guidance that it's
 * "a solid reference implementation."
 *
 * `"use client"` only for the scroll-spy TOC (DOM heading walk + intersection
 * observer) — `RelocationWaveHero` is a plain (non-async) server component so
 * it composes fine inside this client tree.
 */

type Heading = { id: string; text: string; level: 2 | 3 };

/**
 * Walks the Tiptap JSON to detect whether the page has any h2/h3 headings.
 * When there are none, the two-column TOC grid is skipped so the article
 * renders full width instead of being squeezed into the content track.
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

function formatUpdated(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function RelocationToc({
  contentRef,
}: {
  contentRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

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
      className="sticky top-[calc(72px+32px)] hidden self-start min-[1025px]:block"
    >
      <p className="mb-4 [font-family:var(--font-relocation-display)] text-[0.6875rem] font-bold tracking-[0.14em] text-[var(--relocation-ink)] uppercase opacity-60">
        On this page
      </p>
      <ul className="flex flex-col gap-1.5 border-l border-[var(--relocation-border)]">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={cn(
                "relocation-hover-fade -ml-px block border-l-[2px] py-0.5 text-[0.8125rem] transition-colors",
                h.level === 3 ? "pl-5" : "pl-3",
                activeId === h.id
                  ? "border-[var(--relocation-terracotta)] font-bold text-[var(--relocation-ink)]"
                  : "border-transparent text-[var(--relocation-ink)] opacity-70 hover:opacity-100",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function RelocationGenericPage({ page }: { page: Page }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const showToc = hasTocHeadings(page.content);

  const articleBody = (
    // `threshold={0}` (not the 0.08 default) on purpose: a CMS body can be
    // taller than the viewport by more than 12×, and an IntersectionObserver
    // ratio threshold can never be reached by a target that large — the block
    // would stay at `opacity: 0` forever. Any-pixel-visible is the only safe
    // trigger for arbitrary-length content.
    <RelocationReveal threshold={0} className="w-full">
      {page.type === "policy" ? (
        <p className="mb-8 min-[1025px]:max-w-[46rem] [font-family:var(--font-relocation-display)] text-[0.75rem] font-bold tracking-[0.1em] text-[var(--relocation-ink)] uppercase opacity-60">
          Last updated · {formatUpdated(page.updatedAt)}
        </p>
      ) : null}

      {/* Content-width contract: every DIRECT CHILD of the prose div below is
          capped at 46rem on desktop, EXCEPT a child that either carries
          `sp-quote-breakout` (a full-width quote calculator asking to break
          out of the article column — see `quote-calculator-block.tsx`) or
          already has its own `max-w-*` utility (medium/small quote wrappers,
          `EmbedFrame`), which wins on its own specificity. The `:where()`
          wrapper around `:not()` is load-bearing: it drops the cap's
          specificity to zero so a plain `max-w-*` utility class on the child
          always beats it regardless of source order. */}
      <div ref={contentRef}>
        <TiptapRenderer
          content={page.content as TiptapJSON}
          className={cn(
            "prose w-full max-w-none",
            "min-[1025px]:[:where(&>:not(.sp-quote-breakout))]:max-w-[46rem]",
            "prose-headings:[font-family:var(--font-relocation-display)] prose-headings:font-bold prose-headings:text-[var(--relocation-charcoal)]",
            "prose-h2:text-[1.75rem] prose-h2:mt-12 prose-h2:mb-4",
            "prose-h3:text-[1.25rem] prose-h3:mt-8 prose-h3:mb-3",
            "prose-p:[font-family:var(--font-relocation-body)] prose-p:text-[1.125rem] prose-p:leading-[1.8125rem] prose-p:text-[var(--relocation-ink)]",
            "prose-li:text-[1.125rem] prose-li:leading-[1.8125rem] prose-li:text-[var(--relocation-ink)]",
            "prose-a:text-[var(--relocation-terracotta)] prose-a:underline prose-a:underline-offset-2 hover:prose-a:opacity-80",
            "prose-strong:text-[var(--relocation-charcoal)] prose-strong:font-bold",
            "prose-blockquote:border-[var(--relocation-terracotta)] prose-blockquote:text-[var(--relocation-ink)]",
            "prose-hr:border-[var(--relocation-border)]",
          )}
        />
      </div>

      <div className="min-[1025px]:max-w-[46rem]">
        <PlatformPolicyNotice slug={page.slug} />
      </div>
    </RelocationReveal>
  );

  return (
    <div>
      <RelocationWaveHero
        title={page.title}
        subtitle={page.excerpt ?? undefined}
        size="compact"
      />

      <section className="w-full bg-[var(--relocation-paper)] px-6 py-16 min-[572px]:px-10 min-[1025px]:px-16 min-[1025px]:py-24">
        <div className="mx-auto w-full max-w-[85rem]">
          {showToc ? (
            <div className="grid grid-cols-1 gap-16 min-[1025px]:grid-cols-[200px_1fr]">
              <RelocationToc contentRef={contentRef} />
              {articleBody}
            </div>
          ) : (
            articleBody
          )}
        </div>
      </section>
    </div>
  );
}
