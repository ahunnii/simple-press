"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

import type { DefaultBlogPageTemplateProps } from "../../types";
import {
  blobIncludesQuery,
  buildBlogSearchBlob,
  deriveExcerpt,
} from "~/lib/blog-search";
import { formatDate } from "~/lib/utils";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";

type Page = DefaultBlogPageTemplateProps["pages"][number];

type Props = {
  pages: DefaultBlogPageTemplateProps["pages"];
  coverImage?: string;
};

function postExcerpt(post: Page, max: number): string {
  return post.excerpt?.trim() ? post.excerpt : deriveExcerpt(post.content, max);
}

const READ_LINK_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  fontWeight: 500,
  paddingBottom: 3,
} as const;

// ─── Cover story — the lead post, full-bleed image with overlaid title ────────

function CoverStory({ post, image }: { post: Page; image?: string }) {
  const src = image ?? post.image ?? "";
  const excerpt = postExcerpt(post, 200);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group"
      aria-label={post.title}
      style={{
        display: "block",
        position: "relative",
        overflow: "hidden",
        borderRadius: "var(--radius)",
        background: "var(--vii-navy)",
        minHeight: "clamp(420px, 56vw, 660px)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          priority
          sizes="(max-width: 1200px) 100vw, 1200px"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          style={{ objectPosition: "center 30%" }}
        />
      ) : null}

      {/* Scrim */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--vii-navy) 88%, transparent) 0%, color-mix(in srgb, var(--vii-navy) 45%, transparent) 48%, color-mix(in srgb, var(--vii-navy) 8%, transparent) 100%)",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "clamp(28px, 4.5vw, 64px)",
        }}
      >
        <ViiOverline tone="dark" align="left" style={{ marginBottom: 16 }}>
          {`Latest · ${formatDate(post.createdAt)}`}
        </ViiOverline>

        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "clamp(32px, 5vw, 64px)",
            lineHeight: 1.04,
            color: "var(--vii-paper)",
            margin: 0,
            maxWidth: "16ch",
            textWrap: "balance",
          }}
        >
          {post.title}
        </h2>

        {excerpt && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(15px, 1.4vw, 17px)",
              lineHeight: 1.7,
              color: "var(--vii-paper)",
              opacity: 0.88,
              margin: "18px 0 0",
              maxWidth: "56ch",
            }}
          >
            {excerpt}
          </p>
        )}

        <span
          aria-hidden="true"
          style={{
            ...READ_LINK_STYLE,
            marginTop: 26,
            color: "var(--vii-paper)",
            borderBottom: "1px solid var(--vii-copper-light)",
          }}
        >
          Read article
          <ArrowRight style={{ width: 14, height: 14 }} />
        </span>
      </div>
    </Link>
  );
}

// ─── Editorial index row — big serif title + thumbnail, hairline separated ────

function JournalRow({ post, withRule }: { post: Page; withRule: boolean }) {
  const excerpt = postExcerpt(post, 170);

  return (
    <article
      style={{
        borderTop: withRule ? "1px solid var(--vii-hairline)" : "none",
        paddingTop: withRule ? "clamp(28px, 4vw, 52px)" : 0,
        paddingBottom: "clamp(28px, 4vw, 52px)",
      }}
    >
      <Link
        href={`/blog/${post.slug}`}
        className="group vii-blog-card"
        style={{
          display: "flex",
          gap: "clamp(24px, 4vw, 56px)",
          flexWrap: "wrap",
          alignItems: "center",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        {/* Text */}
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: "var(--vii-ink-soft)",
              margin: "0 0 14px",
            }}
          >
            {formatDate(post.createdAt)}
          </p>

          <h3
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(26px, 3.4vw, 44px)",
              lineHeight: 1.08,
              color: "var(--vii-navy)",
              margin: 0,
              textWrap: "balance",
            }}
            className="transition-opacity group-hover:opacity-75"
          >
            {post.title}
          </h3>

          {excerpt && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(14px, 1.3vw, 16px)",
                lineHeight: 1.7,
                color: "var(--vii-ink-soft)",
                margin: "16px 0 0",
                maxWidth: "56ch",
              }}
            >
              {excerpt}
            </p>
          )}

          <span
            aria-hidden="true"
            style={{
              ...READ_LINK_STYLE,
              marginTop: 22,
              color: "var(--vii-navy)",
              borderBottom: "1px solid var(--vii-copper)",
            }}
          >
            Read article
            <ArrowRight style={{ width: 13, height: 13 }} />
          </span>
        </div>

        {/* Thumbnail */}
        <div
          style={{
            flex: "0 1 400px",
            width: "100%",
            maxWidth: 400,
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "4 / 3",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              background: "var(--vii-tan)",
            }}
          >
            {post.image ? (
              <Image
                src={post.image}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
              />
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export function ViiBlogClient({ pages, coverImage }: Props) {
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const postsWithSearch = useMemo(
    () => pages.map((p) => ({ post: p, searchBlob: buildBlogSearchBlob(p) })),
    [pages],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return postsWithSearch
      .filter(({ searchBlob }) => blobIncludesQuery(searchBlob, q))
      .map(({ post }) => post);
  }, [query, pages, postsWithSearch]);

  const isSearching = query.trim().length > 0;
  const cover = isSearching ? undefined : pages[0];
  const rows = isSearching ? filtered : pages.slice(1);

  const { ref: coverRef, visible: coverVisible } = useViiReveal(0.08);
  const { ref: rowsRef, visible: rowsVisible } = useViiReveal(0.05);

  return (
    <section
      aria-labelledby="vii-journal-list"
      style={{
        background: "var(--vii-cream)",
        padding:
          "clamp(8px, 2vw, 24px) clamp(24px, 6vw, 96px) clamp(80px, 12vw, 140px)",
      }}
    >
      <h2 id="vii-journal-list" className="sr-only">
        Stories
      </h2>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Search */}
        <div
          style={{
            maxWidth: 400,
            marginBottom: "clamp(40px, 6vw, 72px)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: `1.5px solid ${searchFocused ? "var(--vii-copper-deep)" : "var(--vii-tan)"}`,
            paddingBottom: 10,
            transition: "border-color 0.2s ease",
          }}
        >
          <Search
            aria-hidden="true"
            style={{
              width: 15,
              height: 15,
              color: searchFocused ? "var(--vii-copper-deep)" : "var(--vii-ink-soft)",
              flexShrink: 0,
              transition: "color 0.2s ease",
            }}
          />
          <input
            type="search"
            placeholder="Search posts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            aria-label="Search journal posts"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              // No `outline: none` — let the global `.vii *:focus-visible`
              // copper ring provide a guaranteed keyboard focus indicator.
              // The container's tan→copper underline remains the visual focus cue.
              outlineOffset: 2,
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              color: "var(--vii-navy)",
              letterSpacing: "0.02em",
            }}
          />
        </div>

        {/* Live region: screen-reader result count */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {isSearching
            ? `${filtered.length} post${filtered.length === 1 ? "" : "s"} found`
            : ""}
        </p>

        {isSearching && filtered.length === 0 ? (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              color: "var(--vii-ink-soft)",
              textAlign: "center",
              padding: "clamp(48px, 8vw, 96px) 0",
            }}
          >
            No stories match your search.
          </p>
        ) : (
          <>
            {/* Cover story */}
            {cover && (
              <div
                ref={coverRef}
                className={`vii-reveal${coverVisible ? " is-visible" : ""}`}
                style={{ marginBottom: "clamp(48px, 7vw, 88px)" }}
              >
                <CoverStory post={cover} image={coverImage} />
              </div>
            )}

            {/* Index rows */}
            {rows.length > 0 && (
              <>
                {cover && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 20,
                      marginBottom: "clamp(28px, 4vw, 48px)",
                    }}
                  >
                    <ViiOverline align="left" tone="light">
                      More stories
                    </ViiOverline>
                    <div
                      aria-hidden="true"
                      style={{
                        flex: 1,
                        height: 1,
                        background: "var(--vii-hairline)",
                      }}
                    />
                  </div>
                )}

                <div
                  ref={rowsRef}
                  className={`vii-reveal${rowsVisible ? " is-visible" : ""}`}
                >
                  {rows.map((post, i) => (
                    <JournalRow key={post.slug} post={post} withRule={i !== 0} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
