/**
 * `wealth-essay` — long-form editorial service detail page, seeded with the
 * real DCWF "Non-Extractive Financing" (Lending) page. Redesign pass 2
 * (2026-10-12): split hero (service photo when present, else a full-width
 * forest panel), paper prose + priorities, a surface block with numbered
 * badge steps, forest loan-terms and sage shared-values blocks, then a
 * forest closing band (design.md → "wealth-essay service variant").
 *
 * Fields live on `Service.customFields`, edited at `/admin/services/[id]` —
 * NOT the visual editor (there is no `sections.ts` entry for a service
 * detail page), so this file has no `sectionGroupAttr`/`fieldAttr`/
 * `isSectionVisible` calls. Mirrors vii's and pink's per-service-template
 * pages (see `vii-ledger-service-page.tsx`, `pink-table-service-page.tsx`).
 */
import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import type { TemplateListRow } from "~/lib/template-fields";
import { parseTemplateListRows } from "~/lib/template-fields";

import { WealthBlock } from "../../shared/wealth-block";
import { WealthCtaBand } from "../../shared/wealth-cta-band";
import { WealthLedgeButton } from "../../shared/wealth-ledge-button";
import { WealthReveal } from "../../shared/wealth-reveal";
import { WealthSplitHero } from "../../shared/wealth-split-hero";
import { resolveWealthEssayFields } from "./fields";

// `parseTemplateListRows` reads `customFields` directly and ignores a list
// field's `defaultValue` (list fields bypass `resolveFields` entirely — see
// field-conventions.md), so a fresh Service needs real hardcoded fallbacks
// here or these sections render empty. Mirrors pink's `DEFAULT_STEPS`
// pattern (`pink-services-index-page.tsx`).

const DEFAULT_PRIORITIES: TemplateListRow[] = [
  { text: "Actively practice democratic decision-making, or intend to" },
  {
    text: "Have equitable ownership among members, with the intention to grow member-owners",
  },
  {
    text: "Center Black, Brown, immigrants, and indigenous members, and/or focus on serving people of color",
  },
  {
    text: "Include women and gender non-conforming members, and/or focus on serving them",
  },
  { text: "Address a specific community need within Detroit" },
  { text: "Create meaningful, and living wage jobs, and ownership positions" },
  { text: "Have demonstrated financial viability and sustainability" },
];

const DEFAULT_PROCESS_STEPS: TemplateListRow[] = [
  {
    lead: "Intake (2-4 weeks)",
    body: "Submit contact info, a description of your business and governance structure, why you need funding, and any financial history. We assess fit and viability.",
  },
  {
    lead: "Business Model Preparation (8-12 weeks)",
    body: "In partnership with DCWF, we co-create a business model canvas, financial analysis, and answer questions that test your assumptions (who are your customers, how will you compete, can you scale to profitability).",
  },
  {
    lead: "Loan Approval (4-8 weeks)",
    body: "DCWF presents your business model to the Seed Commons Sustainability Committee, who evaluates financial sustainability, execution feasibility, capacity, and community impact.",
  },
  {
    lead: "Ongoing Assistance",
    body: "After funding, we check in regularly, provide training on governance and finances, and help you adapt when challenges come up.",
  },
  {
    lead: "Success & Repayment",
    body: "Steady revenue for worker-owners, timely repayment that gets reinvested in the next cooperative, and a stronger local economy.",
  },
];

const DEFAULT_TERMS: TemplateListRow[] = [
  {
    lead: "No personal guarantees or credit checks necessary",
    body: "We never go after personal assets to secure a loan.",
  },
  {
    lead: "Repayment as a percentage of monthly profits",
    body: "Not a fixed monthly cost. Our interest rate doesn't compound, and you don't begin repayment until you break even.",
  },
  {
    lead: "Ongoing support from DCWF",
    body: "We only succeed when your business does. Many businesses will continue to working with us for future financing needs.",
  },
];

const DEFAULT_VALUES: TemplateListRow[] = [
  {
    lead: "Cooperative, democratic ownership",
    body: "Resources move to locally-embedded, collective businesses under community control.",
  },
  {
    lead: "Productive Sustainability",
    body: "We investing in financially sound businesses to protect worker-owner interests and the longevity of our fund.",
  },
  {
    lead: "Maximizing community benefit",
    body: "Local wealth building with social, economic and environmental upside.",
  },
  {
    lead: "Radical inclusion",
    body: "We lend to those who have been historically excluded from capital and provide the technical assistance to close that gap.",
  },
  {
    lead: "Non-extraction",
    body: "Repayment only comes from profits we helped create, never extracted from individual owners.",
  },
];

function str(row: TemplateListRow, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value.trim() : "";
}

function rows(raw: unknown, fallback: TemplateListRow[]): TemplateListRow[] {
  const parsed = parseTemplateListRows(raw);
  return parsed.length > 0 ? parsed : fallback;
}

// ─── Lists ──────────────────────────────────────────────────────────────────

/** Plain sentence bullets: forest squares, two columns on wide screens. */
function PriorityList({ items }: { items: TemplateListRow[] }) {
  const shown = items.filter((row) => str(row, "text") !== "");
  if (shown.length === 0) return null;
  return (
    <ul className="wealth-essay-bullets">
      {shown.map((row, i) => (
        <li key={row._id ?? i}>{str(row, "text")}</li>
      ))}
    </ul>
  );
}

/** Square numeral badges joined by a hairline (the `.wealth-prose` ol look). */
function ProcessSteps({ items }: { items: TemplateListRow[] }) {
  const shown = items.filter(
    (row) => str(row, "lead") !== "" || str(row, "body") !== "",
  );
  if (shown.length === 0) return null;
  return (
    <ol className="wealth-essay-steps">
      {shown.map((row, i) => {
        const lead = str(row, "lead");
        const body = str(row, "body");
        return (
          <li key={row._id ?? i}>
            {lead ? (
              <strong className="wealth-essay-steps__lead">{lead}</strong>
            ) : null}
            {body ? <p className="wealth-essay-steps__body">{body}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Bold-lead items in a grid between hairlines (terms + shared values). */
function LeadGrid({ items }: { items: TemplateListRow[] }) {
  const shown = items.filter(
    (row) => str(row, "lead") !== "" || str(row, "body") !== "",
  );
  if (shown.length === 0) return null;
  // Exactly three items sit as one row on wide screens instead of 2 + 1.
  return (
    <ul
      className={
        shown.length === 3
          ? "wealth-essay-grid wealth-essay-grid--3"
          : "wealth-essay-grid"
      }
    >
      {shown.map((row, i) => {
        const lead = str(row, "lead");
        const body = str(row, "body");
        return (
          <li key={row._id ?? i}>
            {lead ? (
              <strong className="wealth-essay-grid__lead">{lead}</strong>
            ) : null}
            {body ? <p className="wealth-essay-grid__body">{body}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export function WealthEssayServicePage({ service }: ServiceTemplateProps) {
  const customFields = service.customFields;
  const raw = customFields as Record<string, unknown> | null | undefined;

  const f = resolveWealthEssayFields(customFields, [
    "wealth-essay.title",
    "wealth-essay.deck",
    "wealth-essay.lend-to-heading",
    "wealth-essay.lend-to-paragraph-1",
    "wealth-essay.lend-to-paragraph-2",
    "wealth-essay.priorities-heading",
    "wealth-essay.priorities-lead",
    "wealth-essay.process-heading",
    "wealth-essay.process-intro",
    "wealth-essay.terms-eyebrow",
    "wealth-essay.values-eyebrow",
    "wealth-essay.cta-heading",
    "wealth-essay.cta-label",
    "wealth-essay.cta-url",
  ]);

  const priorities = rows(
    raw?.["wealth-essay.priorities-list"],
    DEFAULT_PRIORITIES,
  );
  const processSteps = rows(
    raw?.["wealth-essay.process-steps"],
    DEFAULT_PROCESS_STEPS,
  );
  const terms = rows(raw?.["wealth-essay.terms-list"], DEFAULT_TERMS);
  const values = rows(raw?.["wealth-essay.values-list"], DEFAULT_VALUES);

  const title = (f["wealth-essay.title"] ?? "").trim() || service.name;
  const deck = (f["wealth-essay.deck"] ?? "").trim();
  const heroImage = service.image?.trim() ?? "";

  const lendHeading = (f["wealth-essay.lend-to-heading"] ?? "").trim();
  const lendP1 = (f["wealth-essay.lend-to-paragraph-1"] ?? "").trim();
  const lendP2 = (f["wealth-essay.lend-to-paragraph-2"] ?? "").trim();
  const showLend = lendHeading !== "" || lendP1 !== "" || lendP2 !== "";

  const prioritiesHeading = (f["wealth-essay.priorities-heading"] ?? "").trim();
  const prioritiesLead = (f["wealth-essay.priorities-lead"] ?? "").trim();
  const showPriorities =
    prioritiesHeading !== "" || prioritiesLead !== "" || priorities.length > 0;

  const processHeading = (f["wealth-essay.process-heading"] ?? "").trim();
  const processIntro = (f["wealth-essay.process-intro"] ?? "").trim();

  const termsEyebrow = (f["wealth-essay.terms-eyebrow"] ?? "").trim();
  const valuesEyebrow = (f["wealth-essay.values-eyebrow"] ?? "").trim();

  const ctaHeading = (f["wealth-essay.cta-heading"] ?? "").trim();
  const ctaLabel = (f["wealth-essay.cta-label"] ?? "").trim();
  const ctaUrl = f["wealth-essay.cta-url"] ?? "";
  const hasCtaButton = ctaLabel !== "" && ctaUrl !== "";

  return (
    <article>
      {/* 1. Hero — service photo (split) or a full-width panel */}
      <WealthSplitHero
        as="header"
        ratio="sixty"
        image={heroImage || null}
        imageAlt={service.name}
        aria-labelledby="wealth-essay-title"
      >
        <WealthReveal>
          <h1 id="wealth-essay-title" className="wealth-hero__title">
            {title}
          </h1>
        </WealthReveal>
        {deck ? (
          <>
            <WealthReveal delay={1}>
              <hr className="wealth-hero__rule" />
            </WealthReveal>
            <WealthReveal delay={2}>
              <p className="wealth-hero__excerpt">{deck}</p>
            </WealthReveal>
          </>
        ) : null}
      </WealthSplitHero>

      {/* 2. Who we lend to — paper prose column */}
      {showLend ? (
        <WealthBlock
          tone="paper"
          container="narrow"
          spacing="flush-bottom"
          aria-labelledby={lendHeading ? "wealth-essay-lend-h" : undefined}
          className="wealth-essay-lend"
        >
          <WealthReveal threshold={0}>
            {lendHeading ? (
              <h2 id="wealth-essay-lend-h" className="wealth-essay-h2">
                {lendHeading}
              </h2>
            ) : null}
            <div className="wealth-essay-copy">
              {lendP1 ? <p className="wealth-lead">{lendP1}</p> : null}
              {lendP2 ? <p>{lendP2}</p> : null}
            </div>
          </WealthReveal>
        </WealthBlock>
      ) : null}

      {/* 3. Priorities — paper */}
      {showPriorities ? (
        <WealthBlock
          tone="paper"
          container="narrow"
          aria-labelledby={
            prioritiesHeading ? "wealth-essay-priorities-h" : undefined
          }
          className="wealth-essay-priorities"
        >
          <WealthReveal threshold={0}>
            <div className="wealth-essay-head">
              {prioritiesHeading ? (
                <h2 id="wealth-essay-priorities-h" className="wealth-essay-h2">
                  {prioritiesHeading}
                </h2>
              ) : null}
              {prioritiesLead ? (
                <p className="wealth-essay-lead">{prioritiesLead}</p>
              ) : null}
            </div>
            <PriorityList items={priorities} />
          </WealthReveal>
        </WealthBlock>
      ) : null}

      {/* 4. Our process — surface block */}
      {processHeading || processIntro || processSteps.length > 0 ? (
        <WealthBlock
          tone="surface"
          container="narrow"
          aria-labelledby={
            processHeading ? "wealth-essay-process-h" : undefined
          }
          className="wealth-essay-process"
        >
          <WealthReveal threshold={0}>
            <div className="wealth-essay-head">
              {processHeading ? (
                <h2 id="wealth-essay-process-h" className="wealth-essay-h2">
                  {processHeading}
                </h2>
              ) : null}
              {processIntro ? (
                <p className="wealth-essay-lead">{processIntro}</p>
              ) : null}
            </div>
            <ProcessSteps items={processSteps} />
          </WealthReveal>
        </WealthBlock>
      ) : null}

      {/* 5. Loan terms — forest block */}
      {terms.length > 0 ? (
        <WealthBlock
          tone="forest"
          aria-labelledby={termsEyebrow ? "wealth-essay-terms-h" : undefined}
          className="wealth-essay-terms"
        >
          <WealthReveal threshold={0}>
            {termsEyebrow ? (
              <h2
                id="wealth-essay-terms-h"
                className="wealth-eyebrow wealth-eyebrow--block"
              >
                {termsEyebrow}
              </h2>
            ) : null}
            <LeadGrid items={terms} />
          </WealthReveal>
        </WealthBlock>
      ) : null}

      {/* 6. Shared values — sage block */}
      {values.length > 0 ? (
        <WealthBlock
          tone="sage"
          aria-labelledby={valuesEyebrow ? "wealth-essay-values-h" : undefined}
          className="wealth-essay-values"
        >
          <WealthReveal threshold={0}>
            {valuesEyebrow ? (
              <h2
                id="wealth-essay-values-h"
                className="wealth-eyebrow wealth-eyebrow--block"
              >
                {valuesEyebrow}
              </h2>
            ) : null}
            <LeadGrid items={values} />
          </WealthReveal>
        </WealthBlock>
      ) : null}

      {/* 7. Closing band — hidden when the button label/url is blank (the
          long-standing way to hide the closing CTA) */}
      {hasCtaButton ? (
        <WealthReveal>
          <WealthCtaBand
            aria-labelledby={ctaHeading ? "wealth-essay-cta-h" : undefined}
            headingId="wealth-essay-cta-h"
            heading={ctaHeading}
            action={
              <WealthLedgeButton onDark href={ctaUrl}>
                {ctaLabel}
              </WealthLedgeButton>
            }
          />
        </WealthReveal>
      ) : null}
    </article>
  );
}
