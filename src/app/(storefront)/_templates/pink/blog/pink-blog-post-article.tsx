"use client";

import { useEffect, useRef, useState } from "react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import { formatPrice, getEffectivePrice } from "~/lib/prices";
import { slugify } from "~/lib/utils";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { api } from "~/trpc/react";

import { PinkProductCard } from "../shared/pink-product-card";
import { countH2Headings } from "./pink-blog-shared";

type Heading = { id: string; text: string };

/**
 * Sticky 3px scroll-progress bar under the header (design.md → Motion →
 * "Blog post adds a 3px sticky scroll-progress bar..."). Purely functional,
 * not a decorative entrance — left ungated by `prefers-reduced-motion`.
 */
function PinkScrollProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const p = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      setPct(Math.min(100, Math.max(0, p)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="sticky z-40"
      style={{ top: "var(--pink-header-h)", height: "3px", background: "var(--pink-line)" }}
    >
      <div
        style={{ height: "100%", width: `${pct}%`, background: "var(--pink-rose)", transition: "width .12s linear" }}
      />
    </div>
  );
}

function PinkShareBlock() {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-8 flex flex-col gap-2.5">
      <p className="pink-label">Share</p>
      <button
        type="button"
        onClick={() => {
          if (typeof navigator === "undefined" || !navigator.clipboard) return;
          navigator.clipboard
            .writeText(window.location.href)
            .then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => {
              // Clipboard unavailable — no-op, the URL is still in the address bar.
            });
        }}
        className="w-fit text-left text-[14px] font-medium transition-colors"
        style={{ color: "var(--pink-rose)" }}
        aria-live="polite"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

/** "In this post" — auto-built TOC from the article's own H2s (design.md:
 * "one 15px row per H2 in page.content", sticky, ink hover). DOM-based (not
 * JSON-based) so the ids match exactly what TiptapRenderer produces. */
function PinkPostToc({ contentRef }: { contentRef: React.RefObject<HTMLDivElement | null> }) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const nodes = el.querySelectorAll("h2");
    const list: Heading[] = [];
    const seen = new Map<string, number>();
    nodes.forEach((node) => {
      const text = node.textContent?.trim() ?? "";
      if (!text) return;
      const base = slugify(text);
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count + 1}`;
      node.id = id;
      list.push({ id, text });
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

  if (headings.length < 2) return null;

  return (
    <nav aria-label="In this post" className="sticky hidden self-start lg:block" style={{ top: "110px" }}>
      <p className="pink-label mb-3 pb-3" style={{ borderBottom: "1px solid var(--pink-ink)" }}>
        In this post
      </p>
      <ul className="flex flex-col">
        {headings.map((h) => (
          <li key={h.id} style={{ borderBottom: "1px solid var(--pink-line-soft)" }}>
            <a
              href={`#${h.id}`}
              className="block py-2.5 text-[15px] transition-colors"
              style={{ color: activeId === h.id ? "var(--pink-rose)" : "var(--pink-body)" }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
      <PinkShareBlock />
    </nav>
  );
}

/**
 * Right rail — genuinely DB-driven product cards (design.md: "Right rail:
 * DB-driven related product/collection cards"). `BlogPostPage` isn't passed
 * a product list, and adding one means editing the shared `/blog/[slug]`
 * route (out of this agent's assigned directories), so this queries
 * `product.getRailProducts` client-side instead — a real, publicly-callable
 * tenant-scoped procedure, gated behind the `products` flag. Collections are
 * not shown (no per-post collection linkage exists) — products only.
 */
function PinkPostProductRail() {
  const { data } = api.product.getRailProducts.useQuery(
    { limit: 3 },
    { retry: false },
  );
  const products = data ?? [];
  if (products.length === 0) return null;

  return (
    <aside aria-label="From the studio" className="hidden lg:block">
      <div className="sticky flex flex-col gap-5" style={{ top: "110px" }}>
        <p className="pink-label pb-3" style={{ borderBottom: "1px solid var(--pink-ink)" }}>
          From the studio
        </p>
        <div className="flex flex-col gap-6">
          {products.map((p) => (
            <PinkProductCard
              key={p.id}
              href={`/shop/${p.slug}`}
              imageUrl={p.images[0]?.url}
              imageAlt={p.name}
              title={p.name}
              price={formatPrice(getEffectivePrice(p))}
              wishlist={{
                productId: p.id,
                slug: p.slug,
                rawPrice: getEffectivePrice(p),
              }}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

/**
 * The interactive three-column post body: progress bar + TOC/share rail +
 * article + product rail. Server parent (`pink-blog-post-page.tsx`) renders
 * the dark header and full-bleed lead image around this; this component owns
 * everything that needs scroll listeners, DOM refs, or a live query.
 */
export function PinkBlogPostArticle({ content }: { content: TiptapJSON }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { isEnabled } = useStorefrontFlags();
  const showRail = isEnabled("products");
  const hasToc = countH2Headings(content) >= 2;

  const gridClass =
    hasToc && showRail
      ? "grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)_minmax(0,180px)] lg:gap-[52px]"
      : hasToc
        ? "grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)] lg:gap-[52px]"
        : showRail
          ? "grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,180px)] lg:gap-[52px]"
          : "grid grid-cols-1";

  return (
    <>
      <PinkScrollProgress />

      <section className="px-5 py-12 md:px-10 md:py-16">
        <div className={`mx-auto max-w-[1400px] ${gridClass}`}>
          {hasToc && <PinkPostToc contentRef={contentRef} />}

          <div ref={contentRef}>
            <TiptapRenderer
              content={content}
              className="pink-prose pink-prose-article max-w-[68ch]"
            />
          </div>

          {showRail && <PinkPostProductRail />}
        </div>
      </section>
    </>
  );
}
