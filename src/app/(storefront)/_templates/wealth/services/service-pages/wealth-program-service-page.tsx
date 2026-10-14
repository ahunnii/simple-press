/**
 * `wealth-program` — split hero (tinted photo + forest panel with the CTA),
 * a paper copy column, and a forest closing band with social icons and a
 * second button; seeded with the real "Worker-Owned Detroit" program page
 * (design.md → "wealth-program service variant", redesign pass 2).
 *
 * Fields live on `Service.customFields`, edited at `/admin/services/[id]` —
 * NOT the visual editor (there is no `sections.ts` entry for a service
 * detail page), so this file has no `sectionGroupAttr`/`fieldAttr`/
 * `isSectionVisible` calls. Mirrors vii's and pink's per-service-template
 * pages (see `vii-ledger-service-page.tsx`, `pink-table-service-page.tsx`).
 *
 * NOTE / QA follow-up: the real Worker-Owned Detroit program page URL was
 * not available at build time (see fields.ts) — `cta-url` defaults to
 * `/contact` until an owner sets the real link.
 */
import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import { resolveSocialLinks } from "~/lib/social-links";

import { WealthBlock } from "../../shared/wealth-block";
import { WealthLedgeButton } from "../../shared/wealth-ledge-button";
import { WealthReveal } from "../../shared/wealth-reveal";
import { WealthSplitHero } from "../../shared/wealth-split-hero";
import { resolveWealthProgramFields } from "./fields";

const DEFAULT_HERO_IMAGE = "/templates/wealth/images/program-hero.jpg";

export function WealthProgramServicePage({
  business,
  service,
}: ServiceTemplateProps) {
  const f = resolveWealthProgramFields(service.customFields, [
    "wealth-program.hero-image",
    "wealth-program.hero-alt",
    "wealth-program.heading",
    "wealth-program.paragraph-1",
    "wealth-program.paragraph-2",
    "wealth-program.paragraph-3",
    "wealth-program.cta-label",
    "wealth-program.cta-url",
    "wealth-program.follow-heading",
    "wealth-program.show-social",
    "wealth-program.secondary-cta-label",
    "wealth-program.secondary-cta-url",
  ]);

  const heroImage = f["wealth-program.hero-image"] ?? DEFAULT_HERO_IMAGE;
  const title = (f["wealth-program.heading"] ?? "").trim() || service.name;

  const ctaLabel = (f["wealth-program.cta-label"] ?? "").trim();
  const ctaUrl = (f["wealth-program.cta-url"] ?? "").trim() || "/contact";
  const ctaExternal = /^https?:\/\//i.test(ctaUrl);

  const paragraphs = [
    f["wealth-program.paragraph-1"],
    f["wealth-program.paragraph-2"],
    f["wealth-program.paragraph-3"],
  ].filter((p): p is string => !!p && p.trim() !== "");
  const [lead, ...rest] = paragraphs;

  const showSocial = f["wealth-program.show-social"] !== "false";
  const social = showSocial
    ? resolveSocialLinks(business.siteContent?.socialLinks)
    : [];
  const secondaryLabel = (f["wealth-program.secondary-cta-label"] ?? "").trim();
  const secondaryUrl = f["wealth-program.secondary-cta-url"] ?? "";
  const hasSecondary = secondaryLabel !== "" && secondaryUrl !== "";
  const showBand = social.length > 0 || hasSecondary;
  const followHeading = (f["wealth-program.follow-heading"] ?? "").trim();

  return (
    <article>
      {/* 1. Split hero — tinted photo + forest panel with the CTA. The CTA
          stays inside the hero panel; this page has no editor groups, so
          there is no nested data-sp-group to avoid. */}
      <WealthSplitHero
        as="header"
        ratio="two-thirds"
        image={heroImage}
        imageAlt={f["wealth-program.hero-alt"] ?? ""}
        aria-labelledby="wealth-program-title"
      >
        <WealthReveal>
          <h1 id="wealth-program-title" className="wealth-hero__title">
            {title}
          </h1>
        </WealthReveal>
        <WealthReveal delay={1}>
          <hr className="wealth-hero__rule" />
        </WealthReveal>
        {ctaLabel ? (
          <WealthReveal delay={2} className="wealth-btn-row">
            <WealthLedgeButton onDark href={ctaUrl}>
              {ctaLabel}
              {ctaExternal ? <span aria-hidden="true"> &#8599;</span> : null}
            </WealthLedgeButton>
          </WealthReveal>
        ) : null}
      </WealthSplitHero>

      {/* 2. Body — paper copy column, first paragraph as the lead */}
      {lead ? (
        <WealthBlock
          tone="paper"
          container="prose"
          className="wealth-program-page-body"
        >
          <WealthReveal threshold={0} className="wealth-program-page-copy">
            <p className="wealth-lead">{lead}</p>
            {rest.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </WealthReveal>
        </WealthBlock>
      ) : null}

      {/* 3. Follow + secondary CTA — surface band (keeps the forest footer
          from doubling up beneath a forest strip) */}
      {showBand ? (
        <WealthBlock
          tone="surface"
          spacing="tight"
          aria-labelledby={
            followHeading ? "wealth-program-follow-h" : undefined
          }
          className="wealth-program-page-follow"
        >
          {followHeading ? (
            <h2
              id="wealth-program-follow-h"
              className="wealth-eyebrow wealth-eyebrow--block wealth-program-page-follow__head"
            >
              {followHeading}
            </h2>
          ) : null}
          <WealthReveal className="wealth-program-page-follow__inner">
            {social.length > 0 ? (
              <ul className="wealth-program-page-social">
                {social.map(({ key, url, label, Icon }) => (
                  <li key={key}>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <span
                        className="wealth-program-page-social__icon"
                        aria-hidden="true"
                      >
                        <Icon />
                      </span>
                      <span className="sr-only">
                        {label} (opens in new tab)
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {hasSecondary ? (
              <WealthLedgeButton href={secondaryUrl}>
                {secondaryLabel}
              </WealthLedgeButton>
            ) : null}
          </WealthReveal>
        </WealthBlock>
      ) : null}
    </article>
  );
}
