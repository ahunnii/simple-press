"use client";

import { useEffect, useRef, useState } from "react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { WealthH1 } from "../shared/wealth-h1";
import { WealthReveal } from "../shared/wealth-reveal";
import { WealthGenericCoverHero } from "./wealth-generic-cover-hero";

type Page = NonNullable<RouterOutputs["content"]["getPageBySlug"]>;

const KICKER: Record<string, string> = {
  policy: "Policy",
};

function formatUpdated(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type Heading = { id: string; text: string; level: 2 | 3 };

/** Walks the Tiptap JSON to detect h2/h3 headings — decides whether to render the TOC grid. */
function hasTocHeadings(content: unknown): boolean {
  const walk = (node: unknown): boolean => {
    if (node == null || typeof node !== "object") return false;
    const n = node as { type?: string; attrs?: { level?: number }; content?: unknown };
    if (n.type === "heading" && (n.attrs?.level === 2 || n.attrs?.level === 3)) {
      return true;
    }
    return Array.isArray(n.content) && n.content.some(walk);
  };
  return walk(content);
}

function WealthToc({ contentRef }: { contentRef: React.RefObject<HTMLDivElement | null> }) {
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
    <nav aria-label="On this page" className="sticky top-[calc(72px+32px)] hidden self-start lg:block">
      <p
        className="mb-4 text-[11px] font-medium tracking-[0.14em] uppercase"
        style={{ color: "var(--wealth-muted)", fontFamily: "var(--font-wealth-mono)" }}
      >
        On this page
      </p>
      <ul className="flex flex-col gap-1.5 border-l" style={{ borderColor: "var(--wealth-surface-2)" }}>
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
                  ? { borderColor: "var(--wealth-primary)", color: "var(--wealth-ink)", fontWeight: 500 }
                  : { borderColor: "transparent", color: "var(--wealth-muted)" }
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

// Tailwind typography modifiers mapped onto wealth tokens — italic PT Sans
// H2s, border-b primary links, Titillium body, generous 25.5px rhythm.
// Inline (not a globals.css class) because globals.css is off-limits for
// this agent; mirrors wealth-blog-post-page.tsx's PROSE_CLASSNAME.
const PROSE_CLASSNAME =
  "prose w-full max-w-[1440px] " +
  "prose-headings:[font-family:var(--font-wealth-sub)] prose-headings:italic prose-headings:font-normal prose-headings:text-[var(--wealth-ink)] " +
  "prose-h2:text-[21px] prose-h2:leading-[1.4] prose-h2:tracking-[0.21px] prose-h2:mt-[calc(var(--wealth-rhythm)*2)] prose-h2:mb-[var(--wealth-rhythm)] " +
  "prose-h3:text-[19px] prose-h3:mt-[var(--wealth-rhythm)] prose-h3:mb-3 " +
  "prose-p:[font-family:var(--font-wealth-body)] prose-p:text-[17px] prose-p:leading-[25.5px] prose-p:text-[var(--wealth-ink)] " +
  "prose-li:[font-family:var(--font-wealth-body)] prose-li:text-[17px] prose-li:leading-[25.5px] prose-li:text-[var(--wealth-ink)] prose-li:marker:text-[var(--wealth-primary)] " +
  "prose-strong:font-semibold prose-strong:text-[var(--wealth-ink)] " +
  "prose-a:text-[var(--wealth-primary)] prose-a:no-underline prose-a:border-b prose-a:border-[var(--wealth-primary)] " +
  "prose-blockquote:text-[var(--wealth-ink)] prose-blockquote:border-[var(--wealth-primary)] " +
  "prose-hr:border-[var(--wealth-surface-2)] " +
  "prose-img:rounded-none prose-th:text-[var(--wealth-ink)] prose-th:border-[var(--wealth-surface-2)] prose-td:border-[var(--wealth-surface-2)]";

/**
 * GenericPage — renders arbitrary CMS `Page` records (any published page not
 * covered by a dedicated slot; the Resources page — link lists, numbered
 * principles — lives here as CMS content per design.md). No template fields
 * (see generic/index.ts); cover-vs-plain hero branches on `page.image`,
 * exactly like vii/generic/vii-generic-page.tsx.
 */
export function WealthGenericPage({ page }: { page: Page }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const kicker = KICKER[page.type] ?? "";
  const showToc = hasTocHeadings(page.content);
  const isPolicy = page.type === "policy";
  const hasCover = !!page.image?.trim();

  const articleBody = (
    <div className="w-full">
      {isPolicy && (
        <p
          className="mb-8 text-[11px] font-medium tracking-[0.12em] uppercase"
          style={{ color: "var(--wealth-muted)", fontFamily: "var(--font-wealth-mono)" }}
        >
          Last updated · {formatUpdated(page.updatedAt)}
        </p>
      )}

      <div ref={contentRef}>
        <TiptapRenderer content={page.content as TiptapJSON} className={PROSE_CLASSNAME} />
      </div>

      <PlatformPolicyNotice slug={page.slug} />
    </div>
  );

  return (
    <>
      {hasCover ? (
        <WealthGenericCoverHero
          image={page.image!}
          title={page.title}
          excerpt={page.excerpt ?? undefined}
          kicker={kicker}
        />
      ) : (
        /* Plain editorial fallback — shown when no cover image is set. */
        <div
          style={{
            background: "var(--wealth-paper)",
            borderBottom: "1px solid var(--wealth-surface-2)",
            padding:
              "calc(var(--wealth-rhythm) * 2) var(--wealth-gutter) calc(var(--wealth-rhythm) * 1.5)",
          }}
        >
          <div className="mx-auto text-center" style={{ maxWidth: "var(--wealth-container)" }}>
            {kicker && (
              <p
                style={{
                  fontFamily: "var(--font-wealth-mono)",
                  fontSize: 13,
                  fontWeight: 400,
                  letterSpacing: "1.9px",
                  textTransform: "uppercase",
                  color: "var(--wealth-eyebrow)",
                  marginBottom: 12,
                }}
              >
                {kicker}
              </p>
            )}
            <WealthH1>{page.title}</WealthH1>
            {page.excerpt && (
              <p
                className="mx-auto"
                style={{
                  fontFamily: "var(--font-wealth-body)",
                  fontSize: 17,
                  lineHeight: "25.5px",
                  color: "var(--wealth-muted)",
                  maxWidth: 620,
                  marginTop: 20,
                }}
              >
                {page.excerpt}
              </p>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          background: "var(--wealth-paper)",
          padding: "calc(var(--wealth-rhythm) * 2) var(--wealth-gutter)",
        }}
      >
        <div className="mx-auto w-full" style={{ maxWidth: "var(--wealth-container)" }}>
          <WealthReveal>
            {showToc ? (
              <div className="grid grid-cols-1 gap-16 lg:grid-cols-[200px_1fr]">
                <WealthToc contentRef={contentRef} />
                {articleBody}
              </div>
            ) : (
              articleBody
            )}
          </WealthReveal>
        </div>
      </div>
    </>
  );
}
