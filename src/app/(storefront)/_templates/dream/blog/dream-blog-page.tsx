"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import type { DefaultBlogPageTemplateProps } from "../../types";
import type { RouterOutputs } from "~/trpc/react";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { formatDate } from "~/lib/utils";

import { resolveFields } from "..";
import { DreamHeading } from "../shared/dream-heading";
import { DreamInput } from "../shared/dream-input";
import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamPhoto } from "../shared/dream-photo";
import { DreamSection } from "../shared/dream-section";
import { DreamBlogPostCard } from "./dream-blog-post-card";

type Business = NonNullable<RouterOutputs["business"]["simplifiedGet"]>;

type Props = DefaultBlogPageTemplateProps & {
  business: Business;
  customFields?: Record<string, string>;
};

const FIELD_KEYS = [
  "dream.blog.hero-heading",
  "dream.blog.hero-accent",
  "dream.blog.hero-lede",
  "dream.blog.listing-search-empty",
  "dream.blog.listing-empty-heading",
  "dream.blog.listing-empty-body",
];

/**
 * `/blog` — the journal index (parity-plan-2026-09-28 PF19). `DreamPageHero`
 * band, then a client-side search (`buildBlogSearchBlob`/`blobIncludesQuery`,
 * matching Default's blog page) with a featured lead post above a grid of
 * `DreamBlogPostCard` tiles — same cover-story-plus-grid hierarchy Default
 * and the page playbook recommend.
 */
export function DreamBlogPage({ pages, business, customFields }: Props) {
  const fields =
    customFields ??
    (business.siteContent?.customFields as Record<string, string> | undefined);
  const f = resolveFields(fields, FIELD_KEYS);

  const logoUrl =
    business.siteContent?.logoUrl ?? "/templates/dream/images/logo.webp";
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    business.name ?? "",
  );

  const [query, setQuery] = useState("");

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

  const [featured, ...rest] = filtered;
  const gridPosts = query.trim() ? filtered : rest;

  return (
    <>
      <DreamPageHero
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        title={f["dream.blog.hero-heading"] ?? ""}
        accent={f["dream.blog.hero-accent"] ?? ""}
        lede={f["dream.blog.hero-lede"] ?? ""}
        titleFieldKey="dream.blog.hero-heading"
        accentFieldKey="dream.blog.hero-accent"
        ledeFieldKey="dream.blog.hero-lede"
        sectionAttrs={sectionGroupAttr("blog", "header")}
      />

      <DreamSection
        sectionAttrs={sectionGroupAttr("blog", "listing")}
        aria-label="Journal"
      >
        {pages.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <DreamHeading as="h2" fieldKey="dream.blog.listing-empty-heading">
              {f["dream.blog.listing-empty-heading"] ?? ""}
            </DreamHeading>
            {f["dream.blog.listing-empty-body"] ? (
              <p
                {...fieldAttr("dream.blog.listing-empty-body")}
                className="max-w-[60ch] text-[16px] leading-relaxed text-[var(--dream-soft)]"
              >
                {f["dream.blog.listing-empty-body"]}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mb-10 flex max-w-sm items-center gap-3 border-b border-[var(--dream-line)] pb-3">
              <Search
                className="h-4 w-4 shrink-0 text-[var(--dream-soft)]"
                aria-hidden="true"
              />
              <DreamInput
                type="search"
                placeholder="Search the journal…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search blog posts"
                className="border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
              />
            </div>
            {/* Live region: announces the filtered result count to screen readers */}
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {query.trim()
                ? `${filtered.length} ${filtered.length === 1 ? "story" : "stories"} found`
                : ""}
            </p>

            {query.trim() && filtered.length === 0 ? (
              <p
                {...fieldAttr("dream.blog.listing-search-empty")}
                className="py-16 text-center text-[var(--dream-soft)]"
              >
                {f["dream.blog.listing-search-empty"] ?? ""}
              </p>
            ) : (
              <>
                {!query.trim() && featured ? (
                  <Link
                    href={`/blog/${featured.slug}`}
                    className="group mb-16 grid grid-cols-1 gap-8 no-underline lg:grid-cols-2 lg:items-center"
                  >
                    <DreamPhoto
                      src={featured.image ?? ""}
                      alt={featured.title}
                      aspect="4 / 3"
                      fallbackTone="sky"
                      priority
                    />
                    <div className="flex flex-col gap-3">
                      <span className="text-[13px] text-[var(--dream-soft)]">
                        {formatDate(featured.createdAt)}
                      </span>
                      <span
                        className="text-[clamp(26px,3vw,38px)] leading-[1.15] text-[var(--dream-ink)] text-balance"
                        style={{ fontFamily: "var(--font-dream-display)" }}
                      >
                        {featured.title}
                      </span>
                      {featured.excerpt ? (
                        <p className="line-clamp-3 max-w-[60ch] text-[16px] leading-[1.6] text-[var(--dream-soft)]">
                          {featured.excerpt}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                ) : null}

                {gridPosts.length > 0 ? (
                  <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                    {gridPosts.map((post) => (
                      <DreamBlogPostCard key={post.slug} post={post} />
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </>
        )}
      </DreamSection>
    </>
  );
}
