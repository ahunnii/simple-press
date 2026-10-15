"use client";

import { useEffect, useRef, useState } from "react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { cn } from "~/lib/utils";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamSection } from "../shared/dream-section";
import { DreamGenericCoverHero } from "./dream-generic-cover-hero";
import { DREAM_PROSE_CLASSNAME } from "./dream-prose";

type Business = NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
type Page = NonNullable<RouterOutputs["content"]["getPageBySlug"]>;

function formatUpdated(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type Heading = { id: string; text: string; level: 2 | 3 };

/** Walks the Tiptap JSON to detect h2/h3 headings — decides whether to render the TOC. */
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

/** Sticky scroll-spy "On this page" nav, shown only when `hasTocHeadings` is true. */
function DreamToc({
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
      className="sticky hidden self-start lg:block"
      style={{ top: "calc(var(--dream-header-h) + 32px)" }}
    >
      <p className="mb-4 text-[13px] font-semibold text-[var(--dream-ink)]">
        On this page
      </p>
      <ul className="flex flex-col gap-1.5 border-l border-[var(--dream-line)]">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={cn(
                "-ml-px block border-l-2 py-1 text-[13px] transition-colors",
                h.level === 3 ? "pl-5" : "pl-3",
                activeId === h.id
                  ? "border-[var(--dream-rose)] font-medium text-[var(--dream-ink)]"
                  : "border-transparent text-[var(--dream-soft)]",
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
 * Client half of `DreamGenericPage` — the page hero plus the CMS body (and
 * its scroll-spy TOC, which is why this is a client component). Cover-vs-
 * plain hero branches on `page.image` (design.md GenericPage note). The
 * server wrapper in `./dream-generic-page.tsx` adds the closing quote band.
 */
export function DreamGenericPageBody({
  business,
  page,
}: {
  business: Business;
  page: Page;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const showToc = hasTocHeadings(page.content);
  const isPolicy = page.type === "policy";
  const hasCover = !!page.image?.trim();

  const logoUrl =
    business.siteContent?.logoUrl ?? "/templates/dream/images/logo.webp";
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    business.name,
  );

  // No TOC → the article is the only column, so the prose measure centers
  // under the (centered) page hero instead of hugging the left edge. With a
  // TOC the prose stays left-aligned in the main column beside it.
  const centered = !showToc;
  const measure = centered ? "mx-auto w-full max-w-[var(--dream-measure)]" : undefined;

  const articleBody = (
    <div className="w-full">
      {isPolicy ? (
        <p className={cn("mb-8 text-[14px] text-[var(--dream-soft)]", measure)}>
          Last updated · {formatUpdated(page.updatedAt)}
        </p>
      ) : null}

      {/* `.dream-embed` bridges shadcn vars → dream tokens so embedded
          Tiptap `gallery`/`quoteCalculator` nodes render on-brand. Its
          `--centered` modifier tells the CSS where the prose column
          sits so gallery/video blocks can break out of it symmetrically. */}
      <div
        ref={contentRef}
        className={cn("dream-embed", centered && "dream-embed--centered")}
      >
        <TiptapRenderer
          content={page.content as TiptapJSON}
          className={cn(DREAM_PROSE_CLASSNAME, centered && "mx-auto")}
        />
      </div>

      {centered ? (
        <div className={measure}>
          <PlatformPolicyNotice slug={page.slug} />
        </div>
      ) : (
        <PlatformPolicyNotice slug={page.slug} />
      )}
    </div>
  );

  return (
    <>
      {hasCover ? (
        <DreamGenericCoverHero
          image={page.image!}
          title={page.title}
          excerpt={page.excerpt ?? undefined}
        />
      ) : (
        // Text-only variant: title + excerpt, no invented copy —
        // `DreamPageHero` skips the lede when `page.excerpt` is blank.
        <DreamPageHero
          logoUrl={logoUrl}
          logoAlt={logoAlt}
          title={page.title}
          lede={page.excerpt ?? ""}
        />
      )}

      <DreamSection tone="paper">
        {showToc ? (
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-[220px_1fr]">
            <DreamToc contentRef={contentRef} />
            {articleBody}
          </div>
        ) : (
          articleBody
        )}
      </DreamSection>
    </>
  );
}
