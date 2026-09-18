"use client";

import { useEffect, useRef, useState } from "react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { UmscHeading } from "../shared/umsc-heading";
import { UmscLede } from "../shared/umsc-lede";
import { UmscPageHero } from "../shared/umsc-page-hero";
import { UmscReveal } from "../shared/umsc-reveal";

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
 * Prose classes for `TiptapRenderer` output, mapped onto umsc tokens
 * (design.md "GenericPage"): Marcellus h2/h3, gold-ink underlined links,
 * gold-hairline blockquotes, 66ch measure, tabular numerals in tables.
 *
 * The blockquote border/face is NOT expressed here — the Typography
 * plugin's own (unlayered) `blockquote` base rule out-specifies the
 * `prose-blockquote:` modifier utility for that property in this codebase
 * (`dream-generic-page.tsx` hit the identical fight first; see its
 * `DREAM_PROSE_CLASSNAME` comment). Rather than add an unlayered override to
 * the shared `globals.css` (out of this agent's file ownership), it's
 * asserted in the `<style>` block below, scoped to `.umsc-prose blockquote`.
 */
const UMSC_PROSE_CLASSNAME = cn(
  "umsc-prose prose w-full max-w-[66ch]",
  "prose-headings:umsc-serif prose-headings:font-normal prose-headings:text-[var(--umsc-ink)] prose-headings:tracking-[0.015em] prose-headings:text-balance",
  "prose-h2:text-[clamp(32px,4.2vw,56px)] prose-h2:leading-[1.08] prose-h2:mt-14 prose-h2:mb-4",
  "prose-h3:text-[clamp(22px,2.2vw,30px)] prose-h3:leading-[1.15] prose-h3:mt-10 prose-h3:mb-3",
  "prose-p:umsc-sans prose-p:text-[17px] prose-p:leading-[1.6] prose-p:text-[var(--umsc-ink)]",
  "prose-li:umsc-sans prose-li:text-[17px] prose-li:leading-[1.6] prose-li:text-[var(--umsc-ink)] prose-li:marker:text-[var(--umsc-gold-ink)]",
  "prose-strong:font-semibold prose-strong:text-[var(--umsc-ink)]",
  "prose-a:text-[var(--umsc-gold-ink)] prose-a:underline prose-a:underline-offset-[0.18em] hover:prose-a:text-[var(--umsc-ink)]",
  "prose-hr:border-[var(--umsc-hairline)]",
  "prose-img:border prose-img:border-[var(--umsc-line)]",
  "prose-table:text-[15px] prose-th:text-[var(--umsc-ink)] prose-th:border-[var(--umsc-hairline)] prose-td:border-[var(--umsc-hairline)] prose-td:text-[var(--umsc-ink)]",
  "prose-th:[font-variant-numeric:tabular-nums] prose-td:[font-variant-numeric:tabular-nums]",
  // Full-width embeds (galleries, breakout quote calculators) escape the
  // 66ch article measure — same convention as `dream-generic-page.tsx`.
  "[&_.gallery-container]:max-w-none [&_.sp-quote-breakout]:max-w-none",
);

/**
 * GenericPage — renders arbitrary CMS `Page` records (any published page not
 * covered by a dedicated slot: policies, one-off pages). No template fields
 * (see design.md "GenericPage" / page-playbooks.md — purely CMS content).
 * Hero branches on `page.image`: a black `UmscPageHero` with the image right
 * when set, else a plain text-only header (title + excerpt, no image slot).
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

      {hasImage ? (
        <UmscPageHero
          heading={page.title}
          lede={page.excerpt ?? undefined}
          image={page.image!}
          imageAlt=""
        />
      ) : (
        <section className="border-b border-[var(--umsc-hairline)] bg-[var(--umsc-cream)]">
          <div
            className="mx-auto px-6 py-16 sm:px-8 lg:py-24"
            style={{ maxWidth: "var(--umsc-container)" }}
          >
            <UmscHeading as="h1">{page.title}</UmscHeading>
            {page.excerpt && (
              <UmscLede className="mt-5">{page.excerpt}</UmscLede>
            )}
          </div>
        </section>
      )}

      <section className="px-6 py-16 sm:px-8">
        <div
          className="mx-auto w-full"
          style={{ maxWidth: "var(--umsc-container)" }}
        >
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
        </div>
      </section>
    </>
  );
}

/**
 * Shadcn-var → umsc-token bridge, applied as inline custom properties on the
 * `.umsc-embed` wrapper (see the `.umsc-account` block in globals.css for
 * the class-selector equivalent used by the future account layout —
 * this is the same variable set, just declared inline so it never touches
 * `globals.css`). Custom properties inherit down the DOM regardless of how
 * they're declared, so an embedded `QuoteCalculatorBlock`'s shared
 * Button/Input/Label/Card — which all read `--background`/`--border`/
 * `--ring`/etc via Tailwind's `bg-background`-style utilities — render in
 * umsc's paper/ink/purple-ring palette without editing those shared files.
 */
const UMSC_EMBED_VARS = {
  "--background": "var(--umsc-paper)",
  "--foreground": "var(--umsc-ink)",
  "--card": "var(--umsc-white)",
  "--card-foreground": "var(--umsc-ink)",
  "--popover": "var(--umsc-white)",
  "--popover-foreground": "var(--umsc-ink)",
  "--primary": "var(--umsc-black)",
  "--primary-foreground": "var(--umsc-paper)",
  "--secondary": "var(--umsc-cream)",
  "--secondary-foreground": "var(--umsc-ink)",
  "--muted": "var(--umsc-cream)",
  "--muted-foreground": "var(--umsc-muted)",
  "--accent": "var(--umsc-cream)",
  "--accent-foreground": "var(--umsc-ink)",
  "--destructive": "var(--umsc-error)",
  "--border": "var(--umsc-line)",
  "--input": "var(--umsc-line)",
  "--ring": "var(--umsc-purple)",
  "--radius": "0.2rem",
  fontFamily: "var(--font-sans)",
} as React.CSSProperties;

/**
 * Component-scoped CSS (per this agent's brief — NOT added to
 * `globals.css`): frames Tiptap `gallery` nodes in the umsc hairline
 * treatment, gives embedded shadcn `Card`s (from `quoteCalculator`) an
 * umsc-styled face, and asserts the gold-hairline blockquote the Typography
 * plugin's own unlayered base rule would otherwise win over a
 * `prose-blockquote:` utility (see `UMSC_PROSE_CLASSNAME`'s comment).
 */
const UMSC_EMBED_STYLE = `
  .umsc-prose blockquote {
    border-left: 2px solid var(--umsc-line-gold);
    padding-left: 1.25rem;
    font-style: normal;
    color: var(--umsc-ink);
  }
  .umsc-embed .gallery-container {
    border: 1px solid var(--umsc-line-gold);
    background: var(--umsc-white);
    padding: 1rem;
  }
  .umsc-embed [data-slot="card"] {
    background: var(--umsc-white);
    border: 1px solid var(--umsc-line);
    border-radius: 0.2rem;
    box-shadow: none;
  }
`;
