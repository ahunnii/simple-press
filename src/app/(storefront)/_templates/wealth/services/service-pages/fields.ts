/**
 * Wealth-specific service-page template field definitions.
 *
 * Two templates:
 *   wealth-essay   — long-form editorial layout, seeded with the real DCWF
 *                    "Non-Extractive Financing" (Lending) page.
 *   wealth-program — hero + centered copy + outlined CTA, seeded with the
 *                    real "Worker-Owned Detroit" program page.
 *
 * Field key convention: "<def-id>.<field-slug>".
 *
 * `page: "homepage"` on every field below follows the established convention
 * for per-service-template fields (see vii-atelier / pink-table): these
 * fields live on `Service.customFields`, edited at `/admin/services/[id]`,
 * NOT the visual editor — there is no `sections.ts` entry for a service
 * detail page, so the `page` value is otherwise unused here. The admin
 * service editor groups fields by `group`, not `page`.
 *
 * List-field convention: repeating "bold lead — body" bullet groups (Our
 * Priorities, Our Process steps, Loan Terms, Shared Values) are modeled as
 * `list` fields with a `{ lead, body }` (or plain `{ text }`) itemSchema,
 * parsed with `parseTemplateListRows` — the same mechanism vii-collection's
 * "sections" and pink's "steps-list" already use. This was chosen over the
 * textarea-with-line-parsing fallback field-conventions.md allows: `list`
 * fields are a first-class, already-sanctioned mechanism, so there was
 * nothing to fight.
 */
import type { ServiceTemplateDef } from "~/lib/service-templates";
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

// ─── wealth-essay ─────────────────────────────────────────────────────────

export const wealthEssayFields: TemplateField[] = [
  // Header
  {
    key: "wealth-essay.title",
    label: "Page Title",
    description: "The page's H1 (Jost display).",
    type: "text",
    page: "homepage",
    group: "wealth-essay.header",
    gridColumn: "col-span-1",
    defaultValue: "Non-Extractive Financing",
  },
  {
    key: "wealth-essay.deck",
    label: "Deck / Subtitle",
    description: "Italic PT Sans subtitle beneath the title.",
    type: "text",
    page: "homepage",
    group: "wealth-essay.header",
    gridColumn: "col-span-1",
    defaultValue: "DCWF provides loans to democratically owned businesses",
  },

  // Who we lend to
  {
    key: "wealth-essay.lend-to-heading",
    label: '"Who We Lend To" Heading',
    description: "Italic H2 for this section.",
    type: "text",
    page: "homepage",
    group: "wealth-essay.lend-to",
    gridColumn: "col-span-full",
    defaultValue: "Who we lend to:",
  },
  {
    key: "wealth-essay.lend-to-paragraph-1",
    label: "Paragraph 1",
    type: "textarea",
    page: "homepage",
    group: "wealth-essay.lend-to",
    gridColumn: "col-span-full",
    description: "First paragraph of the 'Who we lend to' section.",
    defaultValue:
      "Traditional banks overlook worker cooperatives because they don't fit the mold of a conventional business. DCWF was built because we see it differently: cooperatives are the future of a Detroit economy where workers control their labor, share in profits, and keep wealth in the community.",
  },
  {
    key: "wealth-essay.lend-to-paragraph-2",
    label: "Paragraph 2",
    type: "textarea",
    page: "homepage",
    group: "wealth-essay.lend-to",
    gridColumn: "col-span-full",
    description: "Second paragraph of the 'Who we lend to' section.",
    defaultValue:
      "We lend based on viability, not credit history. When a business succeeds, repayment flows back into the fund to finance the next cooperative. If it struggles, we don't extract payments at the cost of a workers' livelihoods. That's what “non-extractive” means in practice, capital that serves people, not the other way around.",
  },

  // Our priorities
  {
    key: "wealth-essay.priorities-heading",
    label: '"Our Priorities" Heading',
    description: "Italic H2 for this section.",
    type: "text",
    page: "homepage",
    group: "wealth-essay.priorities",
    gridColumn: "col-span-full",
    defaultValue: "Our Priorities:",
  },
  {
    key: "wealth-essay.priorities-lead",
    label: "Priorities Lead-in",
    type: "text",
    page: "homepage",
    group: "wealth-essay.priorities",
    gridColumn: "col-span-full",
    description: "Line introducing the bullet list.",
    defaultValue: "We work with businesses that:",
  },
  {
    key: "wealth-essay.priorities-list",
    label: "Priorities Bullets",
    description: "Plain bullet list — no bold lead-in, just the sentence.",
    type: "list",
    page: "homepage",
    group: "wealth-essay.priorities",
    gridColumn: "col-span-full",
    maxItems: 10,
    itemSchema: [
      {
        key: "text",
        label: "Bullet",
        type: "textarea",
        placeholder: "e.g. Address a specific community need within Detroit",
      },
    ],
    defaultValue: JSON.stringify([
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
      {
        text: "Create meaningful, and living wage jobs, and ownership positions",
      },
      { text: "Have demonstrated financial viability and sustainability" },
    ]),
  },

  // Our process
  {
    key: "wealth-essay.process-heading",
    label: '"Our Process" Heading',
    description: "Italic H2 for this section.",
    type: "text",
    page: "homepage",
    group: "wealth-essay.process",
    gridColumn: "col-span-full",
    defaultValue: "Our Process:",
  },
  {
    key: "wealth-essay.process-intro",
    label: "Process Intro",
    type: "textarea",
    page: "homepage",
    group: "wealth-essay.process",
    gridColumn: "col-span-full",
    description: "Short paragraph before the numbered steps.",
    defaultValue:
      "This process is hands-on and iterative, typically 5+ months from start to finish. The timeline depends on how quickly your cooperative can develop a strong business model, with our guidance at every stage.",
  },
  {
    key: "wealth-essay.process-steps",
    label: "Process Steps",
    description:
      "Up to 6 numbered steps, each a bold lead (e.g. a stage + timeframe) and a body sentence.",
    type: "list",
    page: "homepage",
    group: "wealth-essay.process",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      {
        key: "lead",
        label: "Lead",
        type: "text",
        placeholder: "e.g. Intake (2-4 weeks)",
      },
      { key: "body", label: "Body", type: "textarea" },
    ],
    defaultValue: JSON.stringify([
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
    ]),
  },

  // Loan terms band
  {
    key: "wealth-essay.terms-eyebrow",
    label: "Loan Terms Eyebrow",
    description: "Mono-caps eyebrow above the terms bullets.",
    type: "text",
    page: "homepage",
    group: "wealth-essay.terms",
    gridColumn: "col-span-full",
    defaultValue: "Our Non-Extractive Loan Terms",
  },
  {
    key: "wealth-essay.terms-list",
    label: "Loan Terms Bullets",
    description: "Up to 5 bold-lead bullets.",
    type: "list",
    page: "homepage",
    group: "wealth-essay.terms",
    gridColumn: "col-span-full",
    maxItems: 5,
    itemSchema: [
      { key: "lead", label: "Lead", type: "text" },
      { key: "body", label: "Body", type: "textarea" },
    ],
    defaultValue: JSON.stringify([
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
    ]),
  },

  // Shared values band
  {
    key: "wealth-essay.values-eyebrow",
    label: "Shared Values Eyebrow",
    description: "Mono-caps eyebrow above the values bullets.",
    type: "text",
    page: "homepage",
    group: "wealth-essay.values",
    gridColumn: "col-span-full",
    defaultValue: "Our Shared Values",
  },
  {
    key: "wealth-essay.values-list",
    label: "Shared Values Bullets",
    description: "Up to 6 bold-lead bullets.",
    type: "list",
    page: "homepage",
    group: "wealth-essay.values",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      { key: "lead", label: "Lead", type: "text" },
      { key: "body", label: "Body", type: "textarea" },
    ],
    defaultValue: JSON.stringify([
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
    ]),
  },

  // Closing CTA — hideable by leaving label/url blank (this template isn't
  // sp-group wired, so there's no `_sp` visibility toggle to hook into).
  {
    key: "wealth-essay.cta-label",
    label: "Closing CTA Button Label",
    description: "Leave blank to hide the closing CTA button.",
    type: "text",
    page: "homepage",
    group: "wealth-essay.cta",
    gridColumn: "col-span-1",
    defaultValue: "Book a consult",
  },
  {
    key: "wealth-essay.cta-url",
    label: "Closing CTA Button URL",
    description: "Where the closing CTA button links to.",
    type: "url",
    page: "homepage",
    group: "wealth-essay.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

const wealthEssayFieldGroups: TemplateFieldGroup[] = [
  {
    id: "wealth-essay.header",
    title: "Header",
    description: "Page title and italic deck.",
    icon: "📜",
    columns: 2,
  },
  {
    id: "wealth-essay.lend-to",
    title: "Who We Lend To",
    description: "Section heading and two paragraphs.",
    icon: "🤝",
    columns: 1,
  },
  {
    id: "wealth-essay.priorities",
    title: "Our Priorities",
    description: "Section heading, lead-in, and a plain bullet list.",
    icon: "✅",
    columns: 1,
  },
  {
    id: "wealth-essay.process",
    title: "Our Process",
    description: "Section heading, intro, and up to 6 numbered steps.",
    icon: "🔄",
    columns: 1,
  },
  {
    id: "wealth-essay.terms",
    title: "Loan Terms Band",
    description: "Mono eyebrow and bold-lead bullets between hairlines.",
    icon: "📋",
    columns: 1,
  },
  {
    id: "wealth-essay.values",
    title: "Shared Values Band",
    description: "Mono eyebrow and bold-lead bullets between hairlines.",
    icon: "💚",
    columns: 1,
  },
  {
    id: "wealth-essay.cta",
    title: "Closing Call to Action",
    description:
      "Book-a-consult button. Leave the label blank to hide it entirely.",
    icon: "📞",
    columns: 2,
  },
];

// ─── wealth-program ───────────────────────────────────────────────────────

export const wealthProgramFields: TemplateField[] = [
  // Hero
  {
    key: "wealth-program.hero-image",
    label: "Hero Image",
    description: "Full-width hero image at the top of the page.",
    type: "image",
    page: "homepage",
    group: "wealth-program.hero",
    gridColumn: "col-span-full",
    defaultValue: "/templates/wealth/images/program-hero.jpg",
  },
  {
    key: "wealth-program.hero-alt",
    label: "Hero Image Alt Text",
    description: "Describes the hero image for screen readers.",
    type: "text",
    page: "homepage",
    group: "wealth-program.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Detroit business owners and workers meeting to discuss employee ownership",
  },

  // Body
  {
    key: "wealth-program.heading",
    label: "Page Heading",
    description: "Centered Jost H1.",
    type: "text",
    page: "homepage",
    group: "wealth-program.body",
    gridColumn: "col-span-full",
    defaultValue: "Worker-Owned Detroit Program",
  },
  {
    key: "wealth-program.paragraph-1",
    label: "Paragraph 1",
    type: "textarea",
    page: "homepage",
    group: "wealth-program.body",
    gridColumn: "col-span-full",
    description: "First body paragraph.",
    defaultValue:
      "Detroit Community Wealth Fund has launched The Worker-Owned Detroit Program to support Detroit-based business owners and their workers to transition to employee ownership as a succession option.",
  },
  {
    key: "wealth-program.paragraph-2",
    label: "Paragraph 2",
    type: "textarea",
    page: "homepage",
    group: "wealth-program.body",
    gridColumn: "col-span-full",
    description: "Second body paragraph.",
    defaultValue:
      "The program will provide business owners looking to sell their employees technical assistance and support throughout the process. In the first round of financing, Detroit Community Wealth Fund, a non-extractive loan fund, will provide up to $2M in financing for businesses in Detroit. Detroit Cooperative Conversion's program goal is to strengthen the pathway for exiting and retiring business owners to sell their businesses to their employees by providing financing and technical assistance for business conversions. This approach is part of a growing national strategy to retain local talent, well-paying jobs, and businesses in a shifting economy.",
  },
  {
    key: "wealth-program.paragraph-3",
    label: "Paragraph 3",
    type: "textarea",
    page: "homepage",
    group: "wealth-program.body",
    gridColumn: "col-span-full",
    description: "Third body paragraph.",
    defaultValue:
      "Cooperative business conversions in Detroit will enable equitable transfer of wealth across the city, create ownership opportunities for Black and Brown Detroiters.",
  },

  // Primary CTA
  {
    key: "wealth-program.cta-label",
    label: "CTA Button Label",
    description: "Outlined mono-caps CTA button label.",
    type: "text",
    page: "homepage",
    group: "wealth-program.cta",
    gridColumn: "col-span-1",
    defaultValue: "Visit the Program Website Here",
  },
  {
    key: "wealth-program.cta-url",
    label: "CTA Button URL",
    description:
      "Where the CTA button links to. NOTE: the real Worker-Owned Detroit program page URL was not available at build time — defaults to /contact until an owner sets the real link.",
    type: "url",
    page: "homepage",
    group: "wealth-program.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },

  // Optional secondary block
  {
    key: "wealth-program.show-social",
    label: "Show social row",
    description:
      "Show the business's Facebook/Instagram icons below the CTA. Turn off to hide this optional block entirely.",
    type: "boolean",
    page: "homepage",
    group: "wealth-program.secondary",
    gridColumn: "col-span-1",
    defaultValue: "true",
  },
  {
    key: "wealth-program.secondary-cta-label",
    label: "Secondary CTA Label",
    description: "Leave blank to hide the secondary CTA link.",
    type: "text",
    page: "homepage",
    group: "wealth-program.secondary",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. Learn about CEND",
  },
  {
    key: "wealth-program.secondary-cta-url",
    label: "Secondary CTA URL",
    description: "Where the secondary CTA link goes.",
    type: "url",
    page: "homepage",
    group: "wealth-program.secondary",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "https://…",
  },
];

const wealthProgramFieldGroups: TemplateFieldGroup[] = [
  {
    id: "wealth-program.hero",
    title: "Hero",
    description: "Full-width hero image and alt text.",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "wealth-program.body",
    title: "Body",
    description: "Centered heading and three body paragraphs.",
    icon: "📝",
    columns: 1,
  },
  {
    id: "wealth-program.cta",
    title: "Call to Action",
    description: "Outlined mono-caps CTA button.",
    icon: "🔗",
    columns: 2,
  },
  {
    id: "wealth-program.secondary",
    title: "Social Row & Secondary CTA",
    description:
      "Optional social icon row and a second, quieter CTA link. Leave the secondary label blank to hide it.",
    icon: "🔉",
    columns: 2,
  },
];

// ─── Bound field resolvers (one per template) ─────────────────────────────

const _essayFieldMap = new Map<string, TemplateField>(
  wealthEssayFields.map((f) => [f.key, f]),
);

export function resolveWealthEssayFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _essayFieldMap);
}

const _programFieldMap = new Map<string, TemplateField>(
  wealthProgramFields.map((f) => [f.key, f]),
);

export function resolveWealthProgramFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _programFieldMap);
}

// ─── Exported defs ─────────────────────────────────────────────────────────

export const wealthServiceTemplateDefs: ServiceTemplateDef[] = [
  {
    id: "wealth-essay",
    label: "Essay",
    description:
      "Long-form editorial layout: title + deck, essay sections with bold-lead bullets and a numbered process, loan-terms and shared-values bands between hairlines, and a closing consult CTA.",
    fields: wealthEssayFields,
    fieldGroups: wealthEssayFieldGroups,
  },
  {
    id: "wealth-program",
    label: "Program",
    description:
      "Full-width hero image, centered heading and copy, an outlined mono-caps CTA, and an optional social row with a secondary CTA.",
    fields: wealthProgramFields,
    fieldGroups: wealthProgramFieldGroups,
  },
];
