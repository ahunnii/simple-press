import type { DefaultBlogPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { PinkDarkBand } from "../shared/pink-dark-band";
import { PinkEyebrow } from "../shared/pink-eyebrow";
import { PinkPageHeader } from "../shared/pink-page-header";
import { PinkBlogListing } from "./pink-blog-listing";

type PinkBlogPageProps = DefaultBlogPageTemplateProps & {
  customFields?: Record<string, string>;
};

const FIELD_KEYS = [
  "pink.blog.header-eyebrow",
  "pink.blog.header-heading",
  "pink.blog.header-intro",
  "pink.blog.subscribe-heading",
  "pink.blog.subscribe-body",
  "pink.blog.subscribe-button",
  "pink.blog.subscribe-link",
  "pink.blog.featured-badge",
  "pink.blog.grid-empty-heading",
  "pink.blog.grid-empty-body",
  "pink.blog.grid-empty-cta-label",
  "pink.blog.grid-empty-cta-link",
  "pink.blog.search-empty-state",
  "pink.blog.ask-eyebrow",
  "pink.blog.ask-heading",
  "pink.blog.ask-body",
  "pink.blog.ask-button",
  "pink.blog.ask-link",
  "pink.global.nav-blog",
];

/**
 * `BlogPage` slot for pink — see docs/templates/pink/design.md →
 * "Per-page section concepts → Blog (index)". Server component: resolves
 * every field once, then hands the interactive featured/grid/sort UI off to
 * `PinkBlogListing` (server → client handoff idiom).
 */
export function PinkBlogPage({ pages, customFields }: PinkBlogPageProps) {
  const f = resolveFields(customFields, FIELD_KEYS);

  const eyebrow = f["pink.blog.header-eyebrow"] ?? "";
  const heading = f["pink.blog.header-heading"] ?? "The journal";
  const intro = f["pink.blog.header-intro"] ?? "";

  const subscribeHeading = (f["pink.blog.subscribe-heading"] ?? "").trim();
  const subscribeBody = (f["pink.blog.subscribe-body"] ?? "").trim();
  const subscribeButton = (f["pink.blog.subscribe-button"] ?? "").trim();
  const subscribeLink = f["pink.blog.subscribe-link"] ?? "/contact";
  const showSubscribe =
    isSectionVisible(customFields, "pink", "blog.subscribe-cta") &&
    subscribeHeading.length > 0 &&
    subscribeButton.length > 0;

  const journalLabel = f["pink.global.nav-blog"] ?? "Journal";
  const showFeatured = isSectionVisible(customFields, "pink", "blog.featured");
  const featuredBadge = f["pink.blog.featured-badge"] ?? "Latest";

  const askEyebrow = f["pink.blog.ask-eyebrow"] ?? "";
  const askHeading = (f["pink.blog.ask-heading"] ?? "").trim();
  const askBody = f["pink.blog.ask-body"] ?? "";
  const askButton = (f["pink.blog.ask-button"] ?? "").trim();
  const askLink = f["pink.blog.ask-link"] ?? "/contact";
  const showAsk =
    isSectionVisible(customFields, "pink", "blog.ask") &&
    askHeading.length > 0 &&
    askButton.length > 0;

  return (
    <div>
      <PinkPageHeader
        breadcrumb={[{ label: "Home", href: "/" }, { label: heading }]}
        eyebrow={eyebrow}
        eyebrowFieldKey="pink.blog.header-eyebrow"
        heading={heading}
        headingFieldKey="pink.blog.header-heading"
        intro={intro}
        introFieldKey="pink.blog.header-intro"
        sectionAttrs={sectionGroupAttr("blog", "header")}
        rightSlot={
          showSubscribe ? (
            <div
              className="flex max-w-[280px] flex-col gap-3 px-6 py-6"
              style={{ background: "var(--pink-ink-panel)" }}
              {...sectionGroupAttr("blog", "subscribe-cta")}
            >
              <h2
                className="pink-display"
                style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.01em" }}
                {...fieldAttr("pink.blog.subscribe-heading")}
              >
                {subscribeHeading}
              </h2>
              {subscribeBody && (
                <p
                  className="text-[14px] leading-[1.6]"
                  style={{ color: "var(--pink-ink-muted)" }}
                  {...fieldAttr("pink.blog.subscribe-body")}
                >
                  {subscribeBody}
                </p>
              )}
              <a
                href={subscribeLink}
                className="pink-btn pink-btn-solid w-fit"
                {...fieldAttr("pink.blog.subscribe-button")}
              >
                {subscribeButton}
              </a>
            </div>
          ) : undefined
        }
      />

      <PinkBlogListing
        pages={pages}
        journalLabel={journalLabel}
        showFeatured={showFeatured}
        featuredBadge={featuredBadge}
        emptyHeading={f["pink.blog.grid-empty-heading"] ?? "Nothing published yet"}
        emptyBody={f["pink.blog.grid-empty-body"] ?? ""}
        emptyCtaLabel={f["pink.blog.grid-empty-cta-label"] ?? ""}
        emptyCtaLink={f["pink.blog.grid-empty-cta-link"] ?? "/shop"}
        searchEmptyMessage={f["pink.blog.search-empty-state"] ?? "No posts match your search."}
      />

      {showAsk && (
        <PinkDarkBand ariaLabel="Have a question" sectionAttrs={sectionGroupAttr("blog", "ask")}>
          <div className="grid gap-8 md:grid-cols-[1fr_.9fr] md:items-center">
            <div className="flex flex-col gap-4">
              {askEyebrow && (
                <PinkEyebrow tone="dark" fieldKey="pink.blog.ask-eyebrow">
                  {askEyebrow}
                </PinkEyebrow>
              )}
              <h2
                className="pink-display max-w-[24ch]"
                style={{ fontSize: "clamp(26px, 2.8vw, 38px)", fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.1 }}
                {...fieldAttr("pink.blog.ask-heading")}
              >
                {askHeading}
              </h2>
              {askBody && (
                <p
                  className="max-w-[50ch] text-[16px] leading-[1.7]"
                  style={{ color: "var(--pink-ink-body)" }}
                  {...fieldAttr("pink.blog.ask-body")}
                >
                  {askBody}
                </p>
              )}
              <div className="mt-2">
                <a
                  href={askLink}
                  className="pink-btn pink-btn-solid w-fit"
                  {...fieldAttr("pink.blog.ask-button")}
                >
                  {askButton}
                </a>
              </div>
            </div>
          </div>
        </PinkDarkBand>
      )}
    </div>
  );
}
