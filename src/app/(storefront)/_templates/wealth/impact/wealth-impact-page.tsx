import type { WealthImpactNavLink } from "./wealth-impact-nav";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { routeEnabled } from "~/lib/features/route-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { getListFieldValue } from "~/lib/template-fields";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "..";
import { WealthBlock } from "../shared/wealth-block";
import { WealthCtaBand } from "../shared/wealth-cta-band";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import {
  hasImpactProse,
  parseImpactFinancials,
  parseImpactGoals,
  parseImpactLogos,
  parseImpactPastReports,
  parseImpactPeople,
  parseImpactPortfolio,
  parseImpactPrograms,
  parseImpactSources,
  parseImpactSpotlights,
  parseImpactStats,
  parseImpactStories,
  parseImpactSupport,
  parseImpactThanks,
  splitParagraphs,
  spotlightAnchorId,
} from "./impact-rows";
import { WEALTH_IMPACT_KEYS as K, WEALTH_IMPACT_SCALAR_KEYS } from "./index";
import {
  hasImpactAbout,
  IMPACT_ABOUT_ID,
  WealthImpactAbout,
} from "./wealth-impact-about";
import {
  IMPACT_FINANCIALS_ID,
  WealthImpactFinancials,
} from "./wealth-impact-financials";
import { IMPACT_GOALS_ID, WealthImpactGoals } from "./wealth-impact-goals";
import { val } from "./wealth-impact-head";
import { WealthImpactHero } from "./wealth-impact-hero";
import {
  hasImpactLetter,
  IMPACT_LETTER_ID,
  WealthImpactLetter,
} from "./wealth-impact-letter";
import { ImpactFootnoteFocus, WealthImpactNav } from "./wealth-impact-nav";
import {
  IMPACT_NUMBERS_ID,
  WealthImpactNumbers,
} from "./wealth-impact-numbers";
import { IMPACT_PAST_ID, WealthImpactPast } from "./wealth-impact-past";
import { IMPACT_PEOPLE_ID, WealthImpactPeople } from "./wealth-impact-people";
import {
  IMPACT_PORTFOLIO_ID,
  WealthImpactPortfolio,
} from "./wealth-impact-portfolio";
import {
  IMPACT_PROGRAMS_ID,
  WealthImpactPrograms,
} from "./wealth-impact-programs";
import {
  hasImpactReportEmbed,
  IMPACT_REPORT_ID,
  WealthImpactReport,
} from "./wealth-impact-report";
import {
  IMPACT_SOURCES_ID,
  WealthImpactSources,
} from "./wealth-impact-sources";
import { WealthImpactSpotlight } from "./wealth-impact-spotlights";
import {
  IMPACT_STORIES_ID,
  WealthImpactStories,
} from "./wealth-impact-stories";
import {
  IMPACT_SUPPORT_ID,
  WealthImpactSupport,
} from "./wealth-impact-support";
import {
  hasImpactThanks,
  IMPACT_THANKS_ID,
  WealthImpactThanks,
} from "./wealth-impact-thanks";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

/** Same fallback the header uses when the store has no logo. */
const DEFAULT_LOGO = "/templates/wealth/images/logo.png";

/** Mono heart from the mock's donate button (decorative). */
function HeartIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 13.5S2 10 2 6a3 3 0 015.4-1.8L8 5l.6-.8A3 3 0 0114 6c0 4-6 7.5-6 7.5z" />
    </svg>
  );
}

/** One numbered report section in render order (menu entry + number). */
type PlanEntry = { key: string; id: string; label: string };

/**
 * `/impact`: the Impact Report (design.md "Impact Report — v2"). Rendered by
 * GenericPage when the CMS page slug is `impact`. The report comes from
 * `wealth.impact.*` fields; the page's own rich text (when it has any)
 * renders as an optional intro under the sticky section menu.
 *
 * Order: cover (H1, section 01) → sticky menu → page intro → letter → who
 * we are → people → programs → by the numbers → spotlights (one section
 * each) → portfolio → co-op stories → goals → financials → thank you → full
 * report → ways to support → sources → past reports → donate band.
 *
 * Every data section renders only when the owner has NOT hidden it AND it
 * has content. Section numbers ("02 · …") and the menu are computed over the
 * sections that actually render, in that order. Sections are rendered as
 * adjacent siblings (no wrappers) so the same-tone hairline rule applies.
 */
export async function WealthImpactPage({ business, page }: Props) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, WEALTH_IMPACT_SCALAR_KEYS);
  const { isEnabled } = await getBusinessFlags();
  const visible = (group: string) =>
    isSectionVisible(customFields, "wealth", `impact.${group}`);
  const listOf = (key: string) => getListFieldValue(customFields, key);
  /** Internal links to a switched-off feature would 404, so blank them. */
  const liveHref = (href: string) =>
    href && routeEnabled(href, isEnabled) ? href : "";

  // ── Data (parsed once; each section renders only with content) ─────────
  const people = parseImpactPeople(listOf(K.peopleItems));
  const programs = parseImpactPrograms(listOf(K.programsItems)).map((p) => ({
    ...p,
    linkUrl: liveHref(p.linkUrl),
  }));
  const stats = parseImpactStats(listOf(K.numbersItems));
  const spotlights = parseImpactSpotlights(listOf(K.spotlightsItems));
  const portfolio = parseImpactPortfolio(
    listOf(K.portfolioItems),
    "",
    val(f, K.portfolioDateLabel),
  ).map((g) => ({
    ...g,
    rows: g.rows.map((r) => ({ ...r, url: liveHref(r.url) })),
  }));
  const stories = parseImpactStories(listOf(K.storiesItems)).map((s) => ({
    ...s,
    url: liveHref(s.url),
  }));
  const goals = parseImpactGoals(listOf(K.goalsItems));
  const financials = parseImpactFinancials(
    listOf(K.financialsItems),
    val(f, K.financialsNavLabel),
  );
  const thanks = parseImpactThanks(listOf(K.thanksItems));
  const logos = parseImpactLogos(listOf(K.thanksLogos)).map((l) => ({
    ...l,
    url: liveHref(l.url),
  }));
  const ways = parseImpactSupport(listOf(K.supportItems));
  const sources = parseImpactSources(listOf(K.sourcesItems)).map((s) => ({
    ...s,
    url: liveHref(s.url),
  }));
  const past = parseImpactPastReports(listOf(K.pastItems)).filter(
    (r) => liveHref(r.url) !== "",
  );

  const show = {
    letter: visible("letter") && hasImpactLetter(f),
    about: visible("about") && hasImpactAbout(f),
    people: visible("people") && people.length > 0,
    programs: visible("programs") && programs.length > 0,
    numbers: visible("numbers") && stats.length > 0,
    spotlights: visible("spotlights") && spotlights.length > 0,
    portfolio: visible("portfolio") && portfolio.length > 0,
    stories: visible("stories") && stories.length > 0,
    goals: visible("goals") && goals.length > 0,
    financials: visible("financials") && financials.length > 0,
    thanks: visible("thanks") && hasImpactThanks({ columns: thanks, logos }),
    report: visible("report") && hasImpactReportEmbed(f),
    // A closing line alone is content too (the ways list is optional).
    support:
      visible("support") &&
      (ways.length > 0 || splitParagraphs(val(f, K.supportClosing)).length > 0),
    sources: visible("sources") && sources.length > 0,
    past: visible("past") && past.length > 0,
    // A blank heading would leave an empty h2, so it hides the band too.
    cta:
      isEnabled("donations") && visible("cta") && val(f, K.ctaHeading) !== "",
  };

  // [N] only links when its source actually renders below.
  const sourceCount = show.sources ? sources.length : 0;

  // ── Render-order plan: section numbers + menu entries ──────────────────
  const plan: PlanEntry[] = [];
  const add = (on: boolean, key: string, id: string, label: string) => {
    if (on) plan.push({ key, id, label });
  };
  add(show.letter, "letter", IMPACT_LETTER_ID, val(f, K.letterNavLabel));
  add(show.about, "about", IMPACT_ABOUT_ID, val(f, K.aboutNavLabel));
  add(show.people, "people", IMPACT_PEOPLE_ID, val(f, K.peopleNavLabel));
  add(
    show.programs,
    "programs",
    IMPACT_PROGRAMS_ID,
    val(f, K.programsNavLabel),
  );
  add(show.numbers, "numbers", IMPACT_NUMBERS_ID, val(f, K.numbersNavLabel));
  if (show.spotlights) {
    spotlights.forEach((s, i) =>
      add(true, `spotlight-${i + 1}`, spotlightAnchorId(i + 1), s.navLabel),
    );
  }
  add(
    show.portfolio,
    "portfolio",
    IMPACT_PORTFOLIO_ID,
    val(f, K.portfolioNavLabel),
  );
  add(show.stories, "stories", IMPACT_STORIES_ID, val(f, K.storiesNavLabel));
  add(show.goals, "goals", IMPACT_GOALS_ID, val(f, K.goalsNavLabel));
  add(
    show.financials,
    "financials",
    IMPACT_FINANCIALS_ID,
    val(f, K.financialsNavLabel),
  );
  add(show.thanks, "thanks", IMPACT_THANKS_ID, val(f, K.thanksNavLabel));
  add(show.report, "report", IMPACT_REPORT_ID, val(f, K.reportNavLabel));
  add(show.support, "support", IMPACT_SUPPORT_ID, val(f, K.supportNavLabel));
  add(show.sources, "sources", IMPACT_SOURCES_ID, val(f, K.sourcesNavLabel));
  add(show.past, "past", IMPACT_PAST_ID, val(f, K.pastNavLabel));

  /** The cover is 01, so the first report section is 02. */
  const num = (key: string) => plan.findIndex((e) => e.key === key) + 2;

  const navLinks: WealthImpactNavLink[] = plan
    .filter((e) => e.label !== "")
    .map(({ id, label }) => ({ id, label }));

  const logoUrl = business.siteContent?.logoUrl?.trim() ?? "";
  const ctaHref = liveHref(val(f, K.ctaButtonUrl));
  const ctaLabel = val(f, K.ctaButtonLabel);

  return (
    <>
      <WealthImpactHero
        f={f}
        logoUrl={logoUrl !== "" ? logoUrl : DEFAULT_LOGO}
        businessName={business.name}
        pageTitle={page.title}
        firstSectionId={plan[0]?.id ?? null}
        pdfHref={liveHref(val(f, K.heroPdfUrl))}
      />

      {/* A one-section report needs no menu. Never inside a reveal (sticky). */}
      {navLinks.length > 1 ? (
        <WealthImpactNav links={navLinks} label={val(f, K.heroYear)} />
      ) : null}
      {sourceCount > 0 ? <ImpactFootnoteFocus /> : null}

      {hasImpactProse(page.content) ? (
        // No reveal: rich text can embed forms, which must never start hidden.
        <WealthBlock tone="paper" container="prose">
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className="wealth-prose"
          />
        </WealthBlock>
      ) : null}

      {show.letter ? (
        <WealthImpactLetter
          f={f}
          number={num("letter")}
          sourceCount={sourceCount}
        />
      ) : null}
      {show.about ? (
        <WealthImpactAbout
          f={f}
          number={num("about")}
          sourceCount={sourceCount}
        />
      ) : null}
      {show.people ? (
        <WealthImpactPeople f={f} number={num("people")} groups={people} />
      ) : null}
      {show.programs ? (
        <WealthImpactPrograms
          f={f}
          programs={programs}
          number={num("programs")}
        />
      ) : null}
      {show.numbers ? (
        <WealthImpactNumbers
          f={f}
          stats={stats}
          financialsId={show.financials ? IMPACT_FINANCIALS_ID : null}
          number={num("numbers")}
          sourceCount={sourceCount}
        />
      ) : null}
      {show.spotlights
        ? spotlights.map((s, i) => (
            <WealthImpactSpotlight
              key={s.id}
              f={f}
              spotlight={s}
              n={i + 1}
              number={num(`spotlight-${i + 1}`)}
              sourceCount={sourceCount}
            />
          ))
        : null}
      {show.portfolio ? (
        <WealthImpactPortfolio
          f={f}
          number={num("portfolio")}
          groups={portfolio}
        />
      ) : null}
      {show.stories ? (
        <WealthImpactStories
          f={f}
          stories={stories}
          seeAllUrl={liveHref(val(f, K.storiesLinkUrl))}
          number={num("stories")}
        />
      ) : null}
      {show.goals ? (
        <WealthImpactGoals
          f={f}
          goals={goals}
          number={num("goals")}
          sourceCount={sourceCount}
        />
      ) : null}
      {show.financials ? (
        <WealthImpactFinancials
          f={f}
          groups={financials}
          number={num("financials")}
        />
      ) : null}
      {show.thanks ? (
        <WealthImpactThanks
          f={f}
          columns={thanks}
          logos={logos}
          number={num("thanks")}
        />
      ) : null}
      {show.report ? (
        <WealthImpactReport
          f={f}
          number={num("report")}
          pdfHref={liveHref(val(f, K.heroPdfUrl))}
        />
      ) : null}
      {show.support ? (
        <WealthImpactSupport
          f={f}
          ways={ways}
          buttonHref={liveHref(val(f, K.supportButtonUrl))}
          number={num("support")}
          sourceCount={sourceCount}
        />
      ) : null}
      {show.sources ? (
        <WealthImpactSources f={f} sources={sources} number={num("sources")} />
      ) : null}
      {show.past ? (
        <WealthImpactPast f={f} reports={past} number={num("past")} />
      ) : null}

      {show.cta ? (
        <WealthCtaBand
          {...sectionGroupAttr("impact", "cta")}
          aria-labelledby="impact-cta-h"
          headingId="impact-cta-h"
          eyebrow={val(f, K.ctaEyebrow) || undefined}
          eyebrowProps={fieldAttr(K.ctaEyebrow)}
          heading={val(f, K.ctaHeading)}
          headingProps={fieldAttr(K.ctaHeading)}
          body={val(f, K.ctaBody) || undefined}
          bodyProps={fieldAttr(K.ctaBody)}
          bgImage={val(f, K.ctaBgImage) || null}
          action={
            ctaHref && ctaLabel ? (
              <WealthLedgeButton href={ctaHref} variant="donate" onDark>
                <HeartIcon />
                <span {...fieldAttr(K.ctaButtonLabel)}>{ctaLabel}</span>
              </WealthLedgeButton>
            ) : null
          }
        />
      ) : null}
    </>
  );
}
