/**
 * `wealth-essay` — long-form editorial service detail page, seeded with the
 * real DCWF "Non-Extractive Financing" (Lending) page (design.md →
 * "wealth-essay service variant").
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

import { WealthEyebrow } from "../../shared/wealth-eyebrow";
import { WealthH1 } from "../../shared/wealth-h1";
import { WealthHr } from "../../shared/wealth-hr";
import { WealthLedgeButton } from "../../shared/wealth-ledge-button";
import { WealthReveal } from "../../shared/wealth-reveal";
import { WealthSection } from "../../shared/wealth-section";
import { WealthSectionHeading } from "../../shared/wealth-section-heading";
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
  return typeof value === "string" ? value : "";
}

function rows(raw: unknown, fallback: TemplateListRow[]): TemplateListRow[] {
  const parsed = parseTemplateListRows(raw);
  return parsed.length > 0 ? parsed : fallback;
}

// ─── PlainBulletList ────────────────────────────────────────────────────────

function PlainBulletList({ items }: { items: TemplateListRow[] }) {
  return (
    <ul
      className="marker:text-[var(--wealth-primary)]"
      style={{
        listStyle: "disc",
        paddingLeft: "1.25em",
        display: "flex",
        flexDirection: "column",
        gap: "0.6em",
        margin: "16px 0 0",
      }}
    >
      {items.map((row, i) => (
        <li key={row._id ?? i} style={{ lineHeight: 1.7 }}>
          {str(row, "text")}
        </li>
      ))}
    </ul>
  );
}

// ─── BoldLeadBulletList ─────────────────────────────────────────────────────

function BoldLeadBulletList({ items }: { items: TemplateListRow[] }) {
  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: "16px 0 0",
        display: "flex",
        flexDirection: "column",
        gap: "0.9em",
      }}
    >
      {items.map((row, i) => {
        const lead = str(row, "lead");
        const body = str(row, "body");
        return (
          <li key={row._id ?? i} style={{ lineHeight: 1.7 }}>
            {lead && <strong style={{ fontWeight: 700 }}>{lead}</strong>}
            {lead && body ? " — " : ""}
            {body}
          </li>
        );
      })}
    </ul>
  );
}

// ─── NumberedSteps ──────────────────────────────────────────────────────────

function NumberedSteps({ items }: { items: TemplateListRow[] }) {
  return (
    <ol
      style={{
        listStyle: "none",
        padding: 0,
        margin: "24px 0 0",
        display: "flex",
        flexDirection: "column",
        gap: "1.4em",
      }}
    >
      {items.map((row, i) => {
        const lead = str(row, "lead");
        const body = str(row, "body");
        return (
          <li
            key={row._id ?? i}
            style={{
              display: "grid",
              gridTemplateColumns: "2.4em 1fr",
              gap: "0.75em",
            }}
          >
            <span
              aria-hidden="true"
              className="wealth-eyebrow"
              style={{ color: "var(--wealth-primary)" }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <p style={{ margin: 0, lineHeight: 1.7 }}>
              {lead && <strong style={{ fontWeight: 700 }}>{lead}</strong>}
              {lead && body ? " — " : ""}
              {body}
            </p>
          </li>
        );
      })}
    </ol>
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

  const hasCta = !!f["wealth-essay.cta-label"] && !!f["wealth-essay.cta-url"];

  return (
    <article>
      <WealthReveal>
        <WealthSection className="text-center" reveal={false}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <WealthH1>
              {f["wealth-essay.title"] ?? service.name}
            </WealthH1>
            {f["wealth-essay.deck"] && (
              <p
                className="wealth-section-heading"
                style={{ margin: "16px 0 0" }}
              >
                {f["wealth-essay.deck"]}
              </p>
            )}
          </div>
        </WealthSection>
      </WealthReveal>

      <WealthHr />

      {/* Who we lend to */}
      <WealthSection>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <WealthSectionHeading>
            {f["wealth-essay.lend-to-heading"]}
          </WealthSectionHeading>
          <p style={{ margin: "16px 0 0", lineHeight: 1.7 }}>
            {f["wealth-essay.lend-to-paragraph-1"]}
          </p>
          <p style={{ margin: "16px 0 0", lineHeight: 1.7 }}>
            {f["wealth-essay.lend-to-paragraph-2"]}
          </p>
        </div>
      </WealthSection>

      {/* Our priorities */}
      <WealthSection>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <WealthSectionHeading>
            {f["wealth-essay.priorities-heading"]}
          </WealthSectionHeading>
          <p style={{ margin: "16px 0 0", lineHeight: 1.7 }}>
            {f["wealth-essay.priorities-lead"]}
          </p>
          <PlainBulletList items={priorities} />
        </div>
      </WealthSection>

      {/* Our process */}
      <WealthSection>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <WealthSectionHeading>
            {f["wealth-essay.process-heading"]}
          </WealthSectionHeading>
          <p style={{ margin: "16px 0 0", lineHeight: 1.7 }}>
            {f["wealth-essay.process-intro"]}
          </p>
          <NumberedSteps items={processSteps} />
        </div>
      </WealthSection>

      <WealthHr />

      {/* Loan terms band */}
      <WealthSection>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <WealthEyebrow as="p">{f["wealth-essay.terms-eyebrow"]}</WealthEyebrow>
          <BoldLeadBulletList items={terms} />
        </div>
      </WealthSection>

      <WealthHr />

      {/* Shared values band */}
      <WealthSection>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <WealthEyebrow as="p">
            {f["wealth-essay.values-eyebrow"]}
          </WealthEyebrow>
          <BoldLeadBulletList items={values} />
        </div>
      </WealthSection>

      <WealthHr />

      {/* Closing CTA — hidden when label or url is blank */}
      {hasCta && (
        <WealthSection className="text-center">
          <WealthLedgeButton
            href={f["wealth-essay.cta-url"] ?? "/contact"}
            variant="accent"
          >
            {f["wealth-essay.cta-label"]}
          </WealthLedgeButton>
        </WealthSection>
      )}
    </article>
  );
}
