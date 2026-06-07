"use client";

import { useEffect, useRef, useState } from "react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type Page = NonNullable<RouterOutputs["content"]["getPageBySlug"]>;

const EYEBROW: Record<string, string> = {
  policy: "Policy",
  blog: "Journal",
  custom: "",
  page: "",
};

function formatUpdated(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type Heading = { id: string; text: string; level: 2 | 3 };

function Toc({
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
      <p className="mb-4 text-[11px] font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
        On this page
      </p>
      <ul className="flex flex-col gap-1.5 border-l border-[#e8e8e8]">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={cn(
                "-ml-px block border-l-[2px] py-0.5 text-[13px] transition-colors",
                h.level === 3 ? "pl-5" : "pl-3",
                activeId === h.id
                  ? "border-[#0a0a0a] font-medium text-[#0a0a0a]"
                  : "border-transparent text-[#6b6b6b] hover:text-[#0a0a0a]",
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

export function DefaultGenericPage({ page }: { page: Page }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const eyebrow = EYEBROW[page.type] ?? "";

  return (
    <div>
      {/* ── Page hero ──────────────────────────────────────────────────── */}
      <section className="border-b border-[#e8e8e8] px-6 pt-20 pb-14 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          {eyebrow && (
            <span className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
              {eyebrow}
            </span>
          )}
          <h1 className="mt-3 font-serif text-[clamp(40px,5vw,72px)] leading-[1.04] font-semibold tracking-[-0.03em]">
            {page.title}
          </h1>
          {page.excerpt && (
            <p className="mt-4 max-w-[560px] text-[17px] text-[#6b6b6b]">
              {page.excerpt}
            </p>
          )}
        </div>
      </section>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <section className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-[200px_1fr]">
            {/* TOC sidebar */}
            <Toc contentRef={contentRef} />

            {/* Article body */}
            <div className="min-w-0">
              <p className="mb-8 text-[12px] font-medium tracking-[0.1em] text-[#a3a3a3] uppercase">
                Last updated · {formatUpdated(page.updatedAt)}
              </p>

              <div ref={contentRef}>
                <TiptapRenderer
                  content={page.content as TiptapJSON}
                  className="prose prose-lg prose-headings:font-serif prose-headings:font-medium prose-headings:tracking-tight prose-headings:text-[#0a0a0a] prose-h2:text-[28px] prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-[20px] prose-h3:mt-8 prose-h3:mb-3 prose-p:text-[15px] prose-p:leading-[1.75] prose-p:text-[#6b6b6b] prose-a:text-[#0a0a0a] prose-a:underline hover:prose-a:no-underline prose-strong:text-[#0a0a0a] prose-strong:font-medium prose-li:text-[15px] prose-li:leading-[1.75] prose-li:text-[#6b6b6b] prose-blockquote:border-[#e8e8e8] prose-blockquote:text-[#6b6b6b] prose-hr:border-[#e8e8e8] prose-table:text-sm prose-th:text-[11px] prose-th:font-medium prose-th:tracking-[0.1em] prose-th:uppercase prose-th:text-[#6b6b6b] max-w-none"
                />
              </div>

              <PlatformPolicyNotice slug={page.slug} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
