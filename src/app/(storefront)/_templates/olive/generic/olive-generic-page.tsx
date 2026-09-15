"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { formatDate } from "~/lib/utils";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { hasOliveImage, OliveSection } from "../shared";

type Page = NonNullable<RouterOutputs["content"]["getPageBySlug"]>;

type Heading = { id: string; text: string; level: 2 | 3 };

/**
 * Walks the Tiptap JSON to detect whether the page has any h2/h3 headings.
 * Used to decide whether to render the two-column TOC grid — with no
 * headings the grid would auto-place the lone article column into the
 * narrow sidebar track, squeezing the content.
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

function OliveToc({
  contentRef,
}: {
  contentRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState("");

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
    return () => {
      observer.disconnect();
    };
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav
      aria-label="On this page"
      className="olive-card sticky hidden flex-col gap-3 self-start p-5 lg:flex"
      style={{ top: "calc(var(--olive-header-h) + 24px)" }}
    >
      <p className="olive-label">On this page</p>
      <ul className="flex flex-col gap-2">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              aria-current={activeId === h.id ? "true" : undefined}
              className="flex items-center gap-2"
              style={{
                paddingLeft: h.level === 3 ? "0.875rem" : 0,
                fontSize: "0.8125rem",
                lineHeight: 1.4,
                color:
                  activeId === h.id
                    ? "var(--olive-ink)"
                    : "var(--olive-ink-soft)",
                fontWeight: activeId === h.id ? 500 : 400,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  flexShrink: 0,
                  borderRadius: "999px",
                  backgroundColor: "var(--olive-sage-bright)",
                  opacity: activeId === h.id ? 1 : 0,
                }}
              />
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * OliveGenericPage — arbitrary CMS `Page` records (about-us drafts, help
 * pages, custom landing pages, and platform policy pages). No template
 * fields, no sections — the route also passes `business`, unused here, same
 * as `ViiGenericPage`.
 */
export function OliveGenericPage({ page }: { page: Page }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const showToc = hasTocHeadings(page.content);
  const isPolicy = page.type === "policy";
  const hasCover = hasOliveImage(page.image);

  const articleBody = (
    <div style={{ width: "100%", maxWidth: "68ch" }}>
      {isPolicy ? (
        <p className="olive-caption" style={{ marginBottom: "2rem" }}>
          Last updated · {formatDate(page.updatedAt)}
        </p>
      ) : null}

      <div ref={contentRef}>
        <TiptapRenderer
          content={page.content as TiptapJSON}
          className="olive-prose"
        />
      </div>

      <PlatformPolicyNotice slug={page.slug} />
    </div>
  );

  return (
    <>
      {hasCover ? (
        <section
          aria-label={page.title}
          className="relative w-full overflow-hidden"
          style={{ minHeight: "clamp(280px, 36vw, 420px)" }}
        >
          <Image
            src={page.image!}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 flex items-end p-4 sm:p-8">
            <div className="olive-card flex max-w-[min(34rem,90%)] flex-col gap-2 p-6">
              <h1 className="olive-h1">{page.title}</h1>
              {page.excerpt ? (
                <p className="olive-caption" style={{ maxWidth: "48ch" }}>
                  {page.excerpt}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <OliveSection tone="white" aria-label={page.title}>
          <h1 className="olive-h1">{page.title}</h1>
          {page.excerpt ? (
            <p
              className="olive-caption"
              style={{ marginTop: "0.75rem", maxWidth: "60ch" }}
            >
              {page.excerpt}
            </p>
          ) : null}
        </OliveSection>
      )}

      <OliveSection
        tone="white"
        style={hasCover ? undefined : { paddingTop: 0 }}
      >
        {showToc ? (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr]">
            <OliveToc contentRef={contentRef} />
            {articleBody}
          </div>
        ) : (
          articleBody
        )}
      </OliveSection>
    </>
  );
}
