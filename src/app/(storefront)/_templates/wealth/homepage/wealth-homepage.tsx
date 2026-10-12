import type { DefaultHomepageTemplateProps } from "../../types";
import type { WealthQuote } from "../shared/wealth-quote-carousel";
import type { WealthNewsCard } from "./wealth-news-section";
import type { WealthProgramCardData } from "./wealth-programs-section";
import type { RouterOutputs } from "~/trpc/react";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { listItemAttr } from "~/lib/preview/section-attrs";
import { resolvePopup } from "~/lib/site-banner/resolve";
import { isSectionVisible } from "~/lib/sp-meta";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";
import { navHrefOffFlag } from "~/app/(storefront)/_components/nav/nav-flags";

import { resolveFields } from "..";
import { hasImpactPage, isImpactHref } from "../lib/has-impact-page";
import { WealthCoopsSection } from "./wealth-coops-section";
import { toWealthNewsRows } from "./wealth-homepage-news";
import { toWealthCoopLogoRows, toWealthStatRows } from "./wealth-homepage-rows";
import { WealthIntroSection } from "./wealth-intro-section";
import { WealthMissionSection } from "./wealth-mission-section";
import { WealthNewsSection } from "./wealth-news-section";
import { WealthPopup } from "./wealth-popup";
import { WealthProgramsSection } from "./wealth-programs-section";
import { WealthQuotesSection } from "./wealth-quotes-section";
import { WealthStatsSection } from "./wealth-stats-section";
import { WealthSupportSection } from "./wealth-support-section";

const FIELD_KEYS = [
  // Split hero
  "wealth.homepage.mission-image",
  "wealth.homepage.mission-image-alt",
  "wealth.homepage.mission-eyebrow",
  "wealth.homepage.mission-statement",
  "wealth.homepage.mission-cta-label",
  "wealth.homepage.mission-cta-url",
  "wealth.homepage.mission-link-label",
  "wealth.homepage.mission-link-url",
  // Intro
  "wealth.homepage.intro-eyebrow",
  "wealth.homepage.intro-heading",
  "wealth.homepage.programs-intro",
  // Programs
  "wealth.homepage.programs-tile-lending-label",
  "wealth.homepage.programs-tile-lending-copy",
  "wealth.homepage.programs-tile-lending-url",
  "wealth.homepage.programs-tile-incubator-label",
  "wealth.homepage.programs-tile-incubator-copy",
  "wealth.homepage.programs-tile-incubator-url",
  "wealth.homepage.programs-tile-transitions-label",
  "wealth.homepage.programs-tile-transitions-copy",
  "wealth.homepage.programs-tile-transitions-url",
  "wealth.homepage.programs-tile-cend-label",
  "wealth.homepage.programs-tile-cend-copy",
  "wealth.homepage.programs-tile-cend-url",
  "wealth.homepage.programs-cta-label",
  "wealth.homepage.programs-cend-cta-label",
  "wealth.homepage.cooperative-heading",
  "wealth.homepage.cooperative-body",
  "wealth.homepage.cooperative-link-label",
  "wealth.homepage.cooperative-link-url",
  // From our co-ops
  "wealth.homepage.quotes-eyebrow",
  "wealth.homepage.quotes-heading",
  // By the numbers
  "wealth.homepage.band-image",
  "wealth.homepage.band-image-alt",
  "wealth.homepage.stats-eyebrow",
  "wealth.homepage.stats-heading",
  "wealth.homepage.stats-link-label",
  "wealth.homepage.stats-link-url",
  // Meet the Co-ops
  "wealth.homepage.coops-image",
  "wealth.homepage.coops-image-alt",
  "wealth.homepage.coops-eyebrow",
  "wealth.homepage.coops-heading",
  "wealth.homepage.coops-body",
  "wealth.homepage.coops-button-label",
  "wealth.homepage.coops-button-url",
  // News & Notes
  "wealth.homepage.news-eyebrow",
  "wealth.homepage.news-heading",
  "wealth.homepage.news-link-label",
  "wealth.homepage.news-link-url",
  "wealth.homepage.news-button-label",
  // Support band
  "wealth.homepage.support-eyebrow",
  "wealth.homepage.support-heading",
  "wealth.homepage.support-body",
  "wealth.homepage.support-button-label",
  "wealth.homepage.support-image",
];

type Testimonials = RouterOutputs["testimonial"]["list"];
type BlogPages = RouterOutputs["content"]["getBlogPages"];

const NEWS_CARD_COUNT = 3;

/** "Nov 24, 2025" */
function formatPostDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(typeof date === "string" ? new Date(date) : date);
}

/** Keeps a post excerpt card-sized: cut at a word boundary with an ellipsis. */
function clampExcerpt(text: string, max = 150): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, "")}…`;
}

function toQuotes(testimonials: Testimonials): WealthQuote[] {
  return testimonials
    .filter((t) => t.text.trim() !== "")
    .map((t) => {
      const role = [t.customerTitle, t.customerCompany]
        .map((part) => part?.trim() ?? "")
        .filter(Boolean)
        .join(", ");
      const photo = t.photoUrls[0];
      return {
        id: t.id,
        quote: t.text,
        name: t.customerName,
        role: role || undefined,
        image: photo ?? undefined,
        imageAlt: photo ? `Photo shared by ${t.customerName}` : undefined,
      };
    });
}

/**
 * Wealth homepage (2026-10-12 redesign) — an async orchestrator. It owns
 * field resolution, feature-flag / visibility gating, data fetching and
 * render order; each band's markup lives in its own file (design.md
 * "Per-page section concepts › Homepage — REDESIGN").
 *
 * Order: split hero · intro · programs · from our co-ops (approved
 * testimonials) · by the numbers (owner figures only) · meet the co-ops ·
 * news & notes (blog posts, else press) · support band.
 *
 * A11y: the page has no visible h1 (the hero panel is a statement, not a
 * title), so a screen-reader-only h1 carrying the business name anchors the
 * outline; every section heading below it is an h2.
 */
export async function WealthHomepage({
  business,
}: DefaultHomepageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);

  const { isEnabled } = resolveFlags(business.featureFlags);

  // B2.5: hide a field-driven button/link when its route's flag is off —
  // never swap in another destination. Returns "" so callers can test `!== ""`.
  const gate = (href: string): string => {
    if (href === "") return "";
    const flag = navHrefOffFlag(href, isEnabled);
    return flag === null || isEnabled(flag) ? href : "";
  };

  // B2.4: the owner's popup (Content > Popups), rendered on the homepage only.
  const popup = resolvePopup(business.siteContent, isEnabled);

  const visible = (group: string) =>
    isSectionVisible(customFields, "wealth", `homepage.${group}`);

  const showIntro = visible("intro");
  const showPrograms = visible("programs");
  const showQuotes = visible("quotes") && isEnabled("testimonials");
  const showNews = visible("news");
  const showSupport = visible("support") && isEnabled("donations");
  const statRows = toWealthStatRows(
    customFields?.["wealth.homepage.stats-items"],
  );
  const showStats = visible("stats") && statRows.length > 0;
  const showCoops = visible("coops");

  // Every remote read is optional: the procedures are feature-gated and throw
  // when their flag is off, so a missing catch would take the page down.
  const wantBlog = showNews && isEnabled("blog");
  const [testimonials, blogPages] = await Promise.all([
    showQuotes
      ? api.testimonial
          .list({ publicOnly: true })
          .catch(() => [] as Testimonials)
      : Promise.resolve([] as Testimonials),
    wantBlog
      ? api.content.getBlogPages().catch(() => [] as BlogPages)
      : Promise.resolve([] as BlogPages),
  ]);
  const quotes = toQuotes(testimonials);

  // The stats link defaults to the Impact Report, which only exists once the
  // owner publishes a page at /impact. Hide it until then; a custom URL the
  // owner set is left alone.
  const statsLinkHref = gate(f["wealth.homepage.stats-link-url"] ?? "");
  const statsLinkLive =
    !showStats ||
    statsLinkHref === "" ||
    !isImpactHref(statsLinkHref) ||
    (await hasImpactPage());

  // `||` (not `??`) is intentional for every image src below: an owner who
  // clears an image saves `""`, and the real cloned asset is the designed
  // fallback — `??` would keep the blank.
  /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
  const missionImage =
    f["wealth.homepage.mission-image"] ||
    "/templates/wealth/images/mission-hero.png";
  const statsImage =
    f["wealth.homepage.band-image"] ||
    "/templates/wealth/images/event-band.jpg";
  const coopsImage =
    f["wealth.homepage.coops-image"] ||
    "/templates/wealth/images/coops-hero.jpg";
  /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

  const programCards: WealthProgramCardData[] = (
    ["lending", "incubator", "transitions", "cend"] as const
  ).map((slug) => ({
    slug,
    title: f[`wealth.homepage.programs-tile-${slug}-label`] ?? "",
    copy: f[`wealth.homepage.programs-tile-${slug}-copy`] ?? "",
    href: gate(f[`wealth.homepage.programs-tile-${slug}-url`] ?? ""),
    ctaLabel:
      slug === "cend"
        ? (f["wealth.homepage.programs-cend-cta-label"] ?? "")
        : (f["wealth.homepage.programs-cta-label"] ?? ""),
    ctaLabelKey:
      slug === "cend"
        ? "wealth.homepage.programs-cend-cta-label"
        : "wealth.homepage.programs-cta-label",
  }));

  // News & Notes: the newest blog posts, else the press-mention fallback.
  const postCards: WealthNewsCard[] = blogPages
    .slice(0, NEWS_CARD_COUNT)
    .map((page) => ({
      key: page.id,
      href: `/blog/${page.slug}`,
      title: page.title,
      meta: formatPostDate(page.createdAt),
      excerpt: page.excerpt ? clampExcerpt(page.excerpt) : undefined,
      image: page.image ?? undefined,
    }));
  const pressCards: WealthNewsCard[] = toWealthNewsRows(
    customFields?.["wealth.homepage.news-items"],
  )
    .slice(0, NEWS_CARD_COUNT)
    .map((item, i) => ({
      key: `${item.url}-${i}`,
      href: item.url,
      title: item.title,
      meta: item.source || undefined,
      attrs: listItemAttr("wealth.homepage.news-items", i),
    }));
  const newsCards = postCards.length > 0 ? postCards : pressCards;

  return (
    <HydrateClient>
      <PageTransition>
        <h1 className="sr-only">{business.name}</h1>

        <WealthMissionSection
          image={missionImage}
          imageAlt={f["wealth.homepage.mission-image-alt"] ?? ""}
          eyebrow={f["wealth.homepage.mission-eyebrow"] ?? ""}
          statement={f["wealth.homepage.mission-statement"] ?? ""}
          ctaLabel={f["wealth.homepage.mission-cta-label"] ?? ""}
          ctaHref={gate(f["wealth.homepage.mission-cta-url"] ?? "")}
          linkLabel={f["wealth.homepage.mission-link-label"] ?? ""}
          linkHref={gate(f["wealth.homepage.mission-link-url"] ?? "")}
        />

        {showIntro && (
          <WealthIntroSection
            eyebrow={f["wealth.homepage.intro-eyebrow"] ?? ""}
            heading={f["wealth.homepage.intro-heading"] ?? ""}
            lead={f["wealth.homepage.programs-intro"] ?? ""}
            spacing={showPrograms ? "flush-bottom" : "default"}
          />
        )}

        {showPrograms && (
          <WealthProgramsSection
            cards={programCards}
            footnoteHeading={f["wealth.homepage.cooperative-heading"] ?? ""}
            footnoteBody={f["wealth.homepage.cooperative-body"] ?? ""}
            footnoteLinkLabel={
              f["wealth.homepage.cooperative-link-label"] ?? ""
            }
            footnoteLinkHref={gate(
              f["wealth.homepage.cooperative-link-url"] ?? "",
            )}
            spacing={showIntro ? "flush-top" : "default"}
            titleAs={showIntro ? "h3" : "h2"}
          />
        )}

        {showQuotes && quotes.length > 0 && (
          <WealthQuotesSection
            eyebrow={f["wealth.homepage.quotes-eyebrow"] ?? ""}
            heading={f["wealth.homepage.quotes-heading"] ?? ""}
            quotes={quotes}
          />
        )}

        {showStats && (
          <WealthStatsSection
            image={statsImage}
            imageAlt={f["wealth.homepage.band-image-alt"] ?? ""}
            eyebrow={f["wealth.homepage.stats-eyebrow"] ?? ""}
            heading={f["wealth.homepage.stats-heading"] ?? ""}
            stats={statRows}
            linkLabel={f["wealth.homepage.stats-link-label"] ?? ""}
            linkHref={statsLinkLive ? statsLinkHref : ""}
          />
        )}

        {showCoops && (
          <WealthCoopsSection
            image={coopsImage}
            imageAlt={f["wealth.homepage.coops-image-alt"] ?? ""}
            eyebrow={f["wealth.homepage.coops-eyebrow"] ?? ""}
            heading={f["wealth.homepage.coops-heading"] ?? ""}
            body={f["wealth.homepage.coops-body"] ?? ""}
            buttonLabel={f["wealth.homepage.coops-button-label"] ?? ""}
            buttonHref={gate(f["wealth.homepage.coops-button-url"] ?? "")}
            logos={toWealthCoopLogoRows(
              customFields?.["wealth.testimonials.coops"],
            )}
          />
        )}

        {showNews && (
          <WealthNewsSection
            eyebrow={f["wealth.homepage.news-eyebrow"] ?? ""}
            heading={f["wealth.homepage.news-heading"] ?? ""}
            linkLabel={f["wealth.homepage.news-link-label"] ?? ""}
            linkHref={gate(f["wealth.homepage.news-link-url"] ?? "")}
            buttonLabel={f["wealth.homepage.news-button-label"] ?? ""}
            cards={newsCards}
          />
        )}

        {showSupport && (
          <WealthSupportSection
            eyebrow={f["wealth.homepage.support-eyebrow"] ?? ""}
            heading={f["wealth.homepage.support-heading"] ?? ""}
            body={f["wealth.homepage.support-body"] ?? ""}
            buttonLabel={f["wealth.homepage.support-button-label"] ?? ""}
            image={f["wealth.homepage.support-image"] ?? ""}
          />
        )}

        {popup ? <WealthPopup popup={popup} /> : null}
      </PageTransition>
    </HydrateClient>
  );
}
