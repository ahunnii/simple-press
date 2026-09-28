"use client";

import { useEffect, useRef, useState } from "react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { UmscPageHero } from "../shared/umsc-page-hero";
import { UmscReveal } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";
import {
  UMSC_EMBED_STYLE,
  UMSC_EMBED_VARS,
  UMSC_PROSE_CLASSNAME,
} from "./umsc-prose";

type Page = NonNullable<RouterOutputs["content"]["getPageBySlug"]>;

function formatUpdated(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type Heading = { id: string; text: string; level: 2 | 3 };

/**
 * Walks the Tiptap JSON to detect h2/h3 headings — mirrors
 * `vii-generic-page.tsx`'s `hasTocHeadings`. A TOC grid with no headings
 * would squeeze the article (and any gallery/embed) into the narrow sidebar
 * track, so the two-column layout only ever renders when there's something
 * to link to.
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

function UmscToc({
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
    const seen = new Map<string, number>();
    nodes.forEach((node) => {
      const text = node.textContent?.trim() ?? "";
      if (!text) return;
      const base = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count + 1}`;
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
      className="sticky top-[calc(72px+32px)] hidden self-start lg:block"
    >
      <p className="umsc-sans mb-4 text-[11px] font-medium tracking-[0.14em] text-[var(--umsc-muted)] uppercase">
        On this page
      </p>
      <ul className="flex flex-col gap-1.5 border-l border-[var(--umsc-hairline)]">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={cn(
                "umsc-sans -ml-px block border-l-2 py-1 text-[13px] transition-colors",
                h.level === 3 ? "pl-5" : "pl-3",
                activeId === h.id
                  ? "border-[var(--umsc-gold-ink)] font-medium text-[var(--umsc-ink)]"
                  : "border-transparent text-[var(--umsc-muted)]",
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

/**
 * GenericPage — renders arbitrary CMS `Page` records (any published page not
 * covered by a dedicated slot: policies, one-off pages). No template fields
 * (see design.md "GenericPage" / page-playbooks.md — purely CMS content).
 * Hero: the black `UmscPageHero` — with `page.image` on the right when set,
 * text-only otherwise (it used to be a cream band; unified 2026-09-28 with
 * the PF25 edge fix so every interior page wears one band). The body sits
 * on `UmscSection`, so hero h1, TOC and article share the 80px edge (B1.7).
 */
export function UmscGenericPage({ page }: { page: Page }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const showToc = hasTocHeadings(page.content);
  const isPolicy = page.type === "policy";
  const hasImage = !!page.image?.trim();

  const articleBody = (
    <div className="w-full">
      {isPolicy && (
        <p className="umsc-sans mb-8 text-[11px] font-medium tracking-[0.12em] text-[var(--umsc-muted)] uppercase">
          Last updated · {formatUpdated(page.updatedAt)}
        </p>
      )}

      {/* `.umsc-embed` bridges shadcn vars onto umsc tokens (via the inline
          custom-property `style` below — no selector needed, custom
          properties inherit) so an embedded `quoteCalculator`'s shared
          Button/Input/Card render on-brand; the `<style>` tag frames Tiptap
          `gallery` nodes and asserts the blockquote hairline (see
          `UMSC_PROSE_CLASSNAME`'s comment for why that one property can't
          ride a `prose-blockquote:` utility here). */}
      <div ref={contentRef} className="umsc-embed" style={UMSC_EMBED_VARS}>
        <TiptapRenderer
          content={page.content as TiptapJSON}
          className={UMSC_PROSE_CLASSNAME}
        />
      </div>

      <PlatformPolicyNotice slug={page.slug} />
    </div>
  );

  return (
    <>
      <style>{UMSC_EMBED_STYLE}</style>

      {/* One band for every CMS page (PF25 / B1.2): the black
          `UmscPageHero` — image right when the page has one, text-only
          otherwise — so policies and one-off pages share the title band,
          container and left edge with every other interior page. */}
      <UmscPageHero
        heading={page.title}
        lede={page.excerpt ?? undefined}
        image={hasImage ? page.image! : undefined}
        imageAlt=""
      />

      <UmscSection tone="paper" aria-label={page.title}>
        <UmscReveal>
          {showToc ? (
            <div className="grid grid-cols-1 gap-16 lg:grid-cols-[200px_1fr]">
              <UmscToc contentRef={contentRef} />
              {articleBody}
            </div>
          ) : (
            articleBody
          )}
        </UmscReveal>
      </UmscSection>
    </>
  );
}
