import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { routeEnabled, routeFlags } from "~/lib/features/route-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "..";
import { getPageWidth, PROSE_WIDE_CLASS } from "../../_components/page-width";
import { WEALTH_IMPACT_SLUG } from "../impact/constants";
import { WealthImpactPage } from "../impact/wealth-impact-page";
import { WealthBlock } from "../shared/wealth-block";
import { WealthCtaBand } from "../shared/wealth-cta-band";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthReveal } from "../shared/wealth-reveal";
import { WealthSplitHero } from "../shared/wealth-split-hero";
import { extractH2Headings, WEALTH_TOC_MIN_H2 } from "./headings";
import { WEALTH_PAGE_CTA_KEYS, WEALTH_PAGE_HERO_KEYS } from "./index";
import { WealthProseAnchors } from "./wealth-prose-anchors";

type Business = NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
type Page = NonNullable<RouterOutputs["content"]["getPageBySlug"]>;

const FIELD_KEYS = [
  ...Object.values(WEALTH_PAGE_HERO_KEYS),
  ...Object.values(WEALTH_PAGE_CTA_KEYS),
];

function formatUpdated(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * GenericPage: any published CMS page without a dedicated slot (including
 * the Resources page). Redesign 2026-10-12: split hero (page photo + title +
 * excerpt), the page's rich text inside `.wealth-prose`, then a closing
 * forest CTA band. Server component; the only client pieces are the reveal
 * wrappers, the Tiptap renderer, and the anchor stamper used when the page
 * is long enough to get an "On this page" list.
 */
export async function WealthGenericPage({
  business,
  page,
}: {
  business: Business;
  page: Page;
}) {
  // The Impact Report is a CMS page with slug "impact" rendered from fields.
  if (page.slug === WEALTH_IMPACT_SLUG) {
    return <WealthImpactPage business={business} page={page} />;
  }

  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, FIELD_KEYS);

  const isPolicy = page.type === "policy";
  const hasImage = !!page.image?.trim();

  const heroHref = f[WEALTH_PAGE_HERO_KEYS.buttonUrl] ?? "";
  const ctaHref = f[WEALTH_PAGE_CTA_KEYS.buttonUrl] ?? "";

  // An owner-typed link to a feature that is switched off would 404: drop the
  // button instead. Flags are only fetched when a link actually points at a
  // gated route (the common /contact default needs no lookup).
  const gated = [heroHref, ctaHref].some((h) => routeFlags(h).length > 0);
  const isEnabled = gated ? (await getBusinessFlags()).isEnabled : () => true;
  const heroLinkLive = heroHref !== "" && routeEnabled(heroHref, isEnabled);
  const ctaLinkLive = ctaHref !== "" && routeEnabled(ctaHref, isEnabled);

  // Hero button: optional, never on policy pages.
  const heroLabel = (f[WEALTH_PAGE_HERO_KEYS.buttonLabel] ?? "").trim();
  const showHeroButton = !isPolicy && heroLabel.length > 0 && heroLinkLive;

  // Closing band: hideable section, never on policy pages. A blank heading
  // would leave an empty h2, so it hides the band too.
  const ctaHeading = (f[WEALTH_PAGE_CTA_KEYS.heading] ?? "").trim();
  const showCta =
    !isPolicy &&
    ctaHeading.length > 0 &&
    isSectionVisible(customFields, "wealth", "global.page-cta");
  const ctaBody = (f[WEALTH_PAGE_CTA_KEYS.body] ?? "").trim();
  const ctaLabel = (f[WEALTH_PAGE_CTA_KEYS.buttonLabel] ?? "").trim();

  // "On this page" only earns its place on long pages.
  const headings = extractH2Headings(page.content);
  const showToc = headings.length >= WEALTH_TOC_MIN_H2;

  // Page width (admin → Pages). Standard: a left-aligned 680px column on the
  // container's left edge (the no-image hero title's edge). Wide: the full
  // 1200 container, running text still capped at 680 via `.sp-prose-wide`;
  // the TOC and the policy notice stay inside the 680 column either way.
  const wide = getPageWidth(page) === "wide";

  const prose = (
    <TiptapRenderer
      content={page.content as TiptapJSON}
      className={wide ? `wealth-prose ${PROSE_WIDE_CLASS}` : "wealth-prose"}
    />
  );

  const toc = showToc ? (
    <nav
      aria-label="On this page"
      className="mb-[calc(var(--wealth-rhythm)*2.5)] border-l-[3px] border-[var(--wealth-accent)] pl-5"
    >
      <p className="wealth-eyebrow wealth-eyebrow--block">On this page</p>
      <ul className="mt-3 grid list-none gap-x-8 gap-y-2 p-0 sm:grid-cols-2">
        {headings.map((h) => (
          <li key={h.id}>
            <a href={`#${h.id}`} className="wealth-link">
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  ) : null;

  const body = showToc ? (
    <WealthProseAnchors headings={headings}>{prose}</WealthProseAnchors>
  ) : (
    prose
  );

  return (
    <>
      <WealthSplitHero
        ratio="sixty"
        image={hasImage ? page.image : null}
        className="wealth-generic-hero"
        aria-labelledby="page-title"
        {...sectionGroupAttr("global", "page-hero")}
      >
        {isPolicy ? (
          <p className="wealth-eyebrow" style={{ marginBottom: 0 }}>
            Policy
          </p>
        ) : null}
        <WealthReveal>
          <h1 id="page-title" className="wealth-hero__title">
            {page.title}
          </h1>
        </WealthReveal>
        <WealthReveal delay={1}>
          <hr className="wealth-hero__rule" />
        </WealthReveal>
        {page.excerpt?.trim() ? (
          <WealthReveal delay={2}>
            <p className="wealth-hero__excerpt">{page.excerpt}</p>
          </WealthReveal>
        ) : null}
        {isPolicy ? (
          <WealthReveal delay={2}>
            <p className="wealth-eyebrow">
              Last updated · {formatUpdated(page.updatedAt)}
            </p>
          </WealthReveal>
        ) : null}
        {showHeroButton ? (
          <WealthReveal delay={3} className="wealth-btn-row">
            <WealthLedgeButton onDark href={heroHref}>
              <span {...fieldAttr(WEALTH_PAGE_HERO_KEYS.buttonLabel)}>
                {heroLabel}
              </span>
            </WealthLedgeButton>
          </WealthReveal>
        ) : null}
      </WealthSplitHero>

      <WealthBlock as="div" className="wealth-generic-prose-section">
        {wide ? (
          <>
            {toc ? <div className="wealth-prose-col">{toc}</div> : null}
            {body}
            <div className="wealth-prose-col">
              <PlatformPolicyNotice slug={page.slug} />
            </div>
          </>
        ) : (
          <div className="wealth-prose-col">
            {toc}
            {body}
            <PlatformPolicyNotice slug={page.slug} />
          </div>
        )}
      </WealthBlock>

      {showCta ? (
        <WealthReveal>
          <WealthCtaBand
            className="wealth-generic-cta"
            aria-labelledby="page-cta-heading"
            headingId="page-cta-heading"
            heading={ctaHeading}
            headingProps={fieldAttr(WEALTH_PAGE_CTA_KEYS.heading)}
            body={ctaBody || undefined}
            bodyProps={fieldAttr(WEALTH_PAGE_CTA_KEYS.body)}
            bgImage={f[WEALTH_PAGE_CTA_KEYS.image] ?? ""}
            action={
              ctaLabel && ctaLinkLive ? (
                <WealthLedgeButton onDark href={ctaHref}>
                  <span {...fieldAttr(WEALTH_PAGE_CTA_KEYS.buttonLabel)}>
                    {ctaLabel}
                  </span>
                </WealthLedgeButton>
              ) : undefined
            }
            {...sectionGroupAttr("global", "page-cta")}
          />
        </WealthReveal>
      ) : null}
    </>
  );
}
