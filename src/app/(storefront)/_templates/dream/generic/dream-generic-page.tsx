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
 * Prose classes for `TiptapRenderer` output, mapped onto dream tokens
 * (Italiana h2/h3, rose-underline links, gold-hairline blockquotes, 66ch
 * measure, styled lists/tables).
 *
 * `.dream h1/h2/h3` and `.dream p` (globals.css, Phase 2) unconditionally
 * set `margin: 0` — written for `DreamH1`/`DreamHeading`'s flex-gap spacing
 * model, as plain unlayered CSS that beats any Tailwind Typography margin
 * utility regardless of specificity (Tailwind's generated utilities live in
 * `@layer utilities`, and unlayered rules always win over layered ones).
 * Rather than fight that with `!important` variants, heading/paragraph
 * rhythm below rides `padding` instead of `margin`, which that rule never
 * touches — see the E-phase3 report for the full note.
 */
export const DREAM_PROSE_CLASSNAME = cn(
  "prose w-full max-w-[66ch]",
  "prose-headings:[font-family:var(--font-dream-display)] prose-headings:font-normal prose-headings:text-[var(--dream-ink)] prose-headings:tracking-[-0.01em]",
  "prose-h2:m-0 prose-h2:pt-14 prose-h2:pb-4 prose-h2:text-[clamp(28px,3.2vw,38px)] prose-h2:leading-[1.15]",
  "prose-h3:m-0 prose-h3:pt-10 prose-h3:pb-3 prose-h3:text-[clamp(22px,2.4vw,27px)] prose-h3:leading-[1.2]",
  "prose-p:m-0 prose-p:pt-5 prose-p:text-[18px] prose-p:leading-[1.7] prose-p:text-[var(--dream-ink)]",
  "prose-li:[font-family:var(--font-dream-body)] prose-li:text-[18px] prose-li:leading-[1.7] prose-li:text-[var(--dream-ink)] prose-li:marker:text-[var(--dream-gold)] prose-li:my-1.5",
  "prose-ul:mt-3 prose-ul:pl-6 prose-ol:mt-3 prose-ol:pl-6",
  "prose-strong:font-semibold prose-strong:text-[var(--dream-ink)]",
  "prose-a:text-[var(--dream-soft)] prose-a:no-underline prose-a:pb-px prose-a:bg-no-repeat prose-a:[background-position:0_100%] prose-a:bg-[length:0%_1px] prose-a:[background-image:linear-gradient(var(--dream-rose),var(--dream-rose))] prose-a:transition-[background-size,color] prose-a:duration-200 hover:prose-a:text-[var(--dream-ink)] hover:prose-a:bg-[length:100%_1px]",
  // `prose-p:*` above (18px/1.7 Mulish) otherwise wins the cascade on the
  // `<p>` Tiptap nests inside `<blockquote>`, since Typography-plugin
  // modifier utilities are equal-specificity `:where()` rules — so the
  // pull-quote scale/face is reasserted directly on `blockquote > p` via an
  // arbitrary-variant descendant selector (same pattern as the
  // `sp-quote-breakout` override below), matching the testimonials
  // featured-quote voice rather than body-copy scale.
  "prose-blockquote:m-0 prose-blockquote:mt-8 prose-blockquote:border-l prose-blockquote:border-[var(--dream-line)] prose-blockquote:pl-6",
  "[&_blockquote>p]:pt-0 [&_blockquote>p]:font-[family-name:var(--font-dream-display)] [&_blockquote>p]:not-italic [&_blockquote>p]:text-[1.25rem] [&_blockquote>p]:leading-[1.55] [&_blockquote>p]:text-[var(--dream-ink)]",
  "prose-hr:my-10 prose-hr:border-[var(--dream-line)]",
  "prose-img:rounded-[var(--dream-radius-photo)] prose-img:border prose-img:border-[var(--dream-line)] prose-img:mt-8",
  "prose-table:text-[16px] prose-th:text-[var(--dream-ink)] prose-th:border-[var(--dream-line)] prose-td:border-[var(--dream-line)] prose-td:text-[var(--dream-ink)]",
  // Quote-calculator breakout blocks escape the 66ch article measure.
  "[&_.sp-quote-breakout]:max-w-none",
);

/**
 * GenericPage — renders arbitrary CMS `Page` records (any published page not
 * covered by a dedicated slot). No template fields (see generic/index.ts);
 * cover-vs-plain hero branches on `page.image` (design.md GenericPage note).
 */
export function DreamGenericPage({
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

  const articleBody = (
    <div className="w-full">
      {isPolicy ? (
        <p className="mb-8 text-[14px] text-[var(--dream-soft)]">
          Last updated · {formatUpdated(page.updatedAt)}
        </p>
      ) : null}

      {/* `.dream-embed` bridges shadcn vars → dream tokens so embedded
          Tiptap `gallery`/`quoteCalculator` nodes render on-brand. */}
      <div ref={contentRef} className="dream-embed">
        <TiptapRenderer
          content={page.content as TiptapJSON}
          className={DREAM_PROSE_CLASSNAME}
        />
      </div>

      <PlatformPolicyNotice slug={page.slug} />
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
        // Text-only variant: title + excerpt, no invented copy — `lede`
        // renders as an empty (zero-height) paragraph when `page.excerpt`
        // is blank; see the E-phase3 report for the noted primitive gap.
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
