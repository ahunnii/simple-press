import type {
  TemplateField,
  TemplateFieldGroup,
  TemplateListItemField,
} from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

export { WEALTH_IMPACT_SLUG } from "./constants";

/**
 * Impact Report fields (design.md "Impact Report — v2"; v1 keys unchanged,
 * every v2 addition is a new optional key or list column). The report renders
 * on the CMS page whose slug is `impact` (GenericPage branch), so every field
 * lives on the `impact` page key.
 *
 * Field-declaration leaf: TYPE-ONLY imports from `~/lib/template-fields`.
 * The list parsers live in `./impact-rows.ts` (runtime import of
 * `parseTemplateListRows`) to avoid the registry's circular-import TDZ.
 *
 * No sample data ships: every data list has NO `defaultRows`, and its section
 * stays hidden until the owner fills at least one valid row. Text defaults
 * (headings, small labels, nav labels) are real copy in DCWF's voice.
 */

const P = "wealth.impact";

export const WEALTH_IMPACT_KEYS = {
  // Cover
  heroEyebrow: `${P}.hero-eyebrow`,
  heroYear: `${P}.hero-year`,
  heroTheme: `${P}.hero-theme`,
  heroDeck: `${P}.hero-deck`,
  heroButtonLabel: `${P}.hero-button-label`,
  heroPdfLabel: `${P}.hero-pdf-label`,
  heroPdfUrl: `${P}.hero-pdf-url`,
  heroPeriod: `${P}.hero-period`,
  heroImage: `${P}.hero-image`,
  heroImageAlt: `${P}.hero-image-alt`,
  // Letter
  letterNavLabel: `${P}.letter-nav-label`,
  letterImage: `${P}.letter-image`,
  letterImageAlt: `${P}.letter-image-alt`,
  letterEyebrow: `${P}.letter-eyebrow`,
  letterHeading: `${P}.letter-heading`,
  letterBody: `${P}.letter-body`,
  letterSignoff: `${P}.letter-signoff`,
  letterName: `${P}.letter-name`,
  letterRole: `${P}.letter-role`,
  /** NEW v2: decorative signature image on the sign-off card. */
  letterSignatureImage: `${P}.letter-signature-image`,
  // Who we are (NEW v2)
  aboutNavLabel: `${P}.about-nav-label`,
  aboutEyebrow: `${P}.about-eyebrow`,
  missionHeading: `${P}.mission-heading`,
  missionBody: `${P}.mission-body`,
  missionImage: `${P}.mission-image`,
  missionImageAlt: `${P}.mission-image-alt`,
  historyHeading: `${P}.history-heading`,
  historyBody: `${P}.history-body`,
  historyImage: `${P}.history-image`,
  historyImageAlt: `${P}.history-image-alt`,
  // Our people (NEW v2)
  peopleNavLabel: `${P}.people-nav-label`,
  peopleEyebrow: `${P}.people-eyebrow`,
  peopleHeading: `${P}.people-heading`,
  peopleItems: `${P}.people-items`,
  // By the numbers
  numbersNavLabel: `${P}.numbers-nav-label`,
  numbersEyebrow: `${P}.numbers-eyebrow`,
  numbersHeading: `${P}.numbers-heading`,
  numbersLinkLabel: `${P}.numbers-link-label`,
  numbersItems: `${P}.stats-items`,
  numbersNote: `${P}.numbers-note`,
  numbersBgImage: `${P}.numbers-bg-image`,
  /** NEW v2: italic lead under the heading. */
  numbersIntro: `${P}.numbers-intro`,
  // Programs
  programsNavLabel: `${P}.programs-nav-label`,
  programsEyebrow: `${P}.programs-eyebrow`,
  programsHeading: `${P}.programs-heading`,
  programsIntro: `${P}.programs-intro`,
  programsItems: `${P}.programs-items`,
  /** NEW v2: hub overview centre label; blank hides the hub. */
  programsHubLabel: `${P}.programs-hub-label`,
  /** NEW v2: heading over the hub overview. */
  programsHubHeading: `${P}.programs-hub-heading`,
  // Spotlights (NEW v2): one section per row, no scalar fields
  spotlightsItems: `${P}.spotlights-items`,
  // Lending portfolio (NEW v2)
  portfolioNavLabel: `${P}.portfolio-nav-label`,
  portfolioEyebrow: `${P}.portfolio-eyebrow`,
  portfolioHeading: `${P}.portfolio-heading`,
  portfolioIntro: `${P}.portfolio-intro`,
  portfolioItems: `${P}.portfolio-items`,
  portfolioDetailLabel: `${P}.portfolio-detail-label`,
  portfolioDateLabel: `${P}.portfolio-date-label`,
  // Co-op stories
  storiesNavLabel: `${P}.stories-nav-label`,
  storiesEyebrow: `${P}.stories-eyebrow`,
  storiesHeading: `${P}.stories-heading`,
  storiesLinkLabel: `${P}.stories-link-label`,
  storiesLinkUrl: `${P}.stories-link-url`,
  storiesButtonLabel: `${P}.stories-button-label`,
  storiesItems: `${P}.stories-items`,
  // Where we're going
  goalsNavLabel: `${P}.goals-nav-label`,
  goalsEyebrow: `${P}.goals-eyebrow`,
  goalsHeading: `${P}.goals-heading`,
  goalsItems: `${P}.goals-items`,
  /** NEW v2 */
  goalsIntro: `${P}.goals-intro`,
  /** NEW v2 */
  goalsImage: `${P}.goals-image`,
  /** NEW v2 */
  goalsImageAlt: `${P}.goals-image-alt`,
  /** NEW v2: label over the goals box; blank hides it. */
  goalsListLabel: `${P}.goals-list-label`,
  // Financials
  financialsNavLabel: `${P}.financials-nav-label`,
  financialsEyebrow: `${P}.financials-eyebrow`,
  financialsHeading: `${P}.financials-heading`,
  financialsNote: `${P}.financials-note`,
  financialsStat1Value: `${P}.financials-stat-1-value`,
  financialsStat1Caption: `${P}.financials-stat-1-caption`,
  financialsStat2Value: `${P}.financials-stat-2-value`,
  financialsStat2Caption: `${P}.financials-stat-2-caption`,
  financialsColumnLabel: `${P}.financials-column-label`,
  financialsShareLabel: `${P}.financials-share-label`,
  financialsAmountLabel: `${P}.financials-amount-label`,
  financialsTotalLabel: `${P}.financials-total-label`,
  financialsItems: `${P}.financials-items`,
  // Thank you
  thanksNavLabel: `${P}.thanks-nav-label`,
  thanksEyebrow: `${P}.thanks-eyebrow`,
  thanksHeading: `${P}.thanks-heading`,
  thanksItems: `${P}.thanks-items`,
  thanksClosing: `${P}.thanks-closing`,
  /** NEW v2 */
  thanksImage: `${P}.thanks-image`,
  /** NEW v2 */
  thanksImageAlt: `${P}.thanks-image-alt`,
  /** NEW v2: logo wall list. */
  thanksLogos: `${P}.thanks-logos`,
  // Full report (NEW v2)
  reportNavLabel: `${P}.report-nav-label`,
  reportEyebrow: `${P}.report-eyebrow`,
  reportHeading: `${P}.report-heading`,
  /** `type: "iframe"`: JSON string → `parseTemplateIframeValue`. */
  reportEmbedUrl: `${P}.report-embed-url`,
  // Ways to support (NEW v2)
  supportNavLabel: `${P}.support-nav-label`,
  supportEyebrow: `${P}.support-eyebrow`,
  supportHeading: `${P}.support-heading`,
  supportItems: `${P}.support-items`,
  supportClosing: `${P}.support-closing`,
  supportImage: `${P}.support-image`,
  supportImageAlt: `${P}.support-image-alt`,
  supportButtonLabel: `${P}.support-button-label`,
  supportButtonUrl: `${P}.support-button-url`,
  // Sources (NEW v2)
  sourcesNavLabel: `${P}.sources-nav-label`,
  sourcesHeading: `${P}.sources-heading`,
  sourcesItems: `${P}.sources-items`,
  // Past reports
  pastNavLabel: `${P}.past-nav-label`,
  pastEyebrow: `${P}.past-eyebrow`,
  pastHeading: `${P}.past-heading`,
  pastItems: `${P}.past-items`,
  // Donate band
  ctaEyebrow: `${P}.cta-eyebrow`,
  ctaHeading: `${P}.cta-heading`,
  ctaBody: `${P}.cta-body`,
  ctaButtonLabel: `${P}.cta-button-label`,
  ctaButtonUrl: `${P}.cta-button-url`,
  ctaBgImage: `${P}.cta-bg-image`,
} as const;

const K = WEALTH_IMPACT_KEYS;

/** List-field max rows (also enforced by the parsers). */
export const WEALTH_IMPACT_MAX = {
  stats: 8,
  /** v2: 6 → 8 (the hub overview holds up to 8 tiles). */
  programs: 8,
  stories: 6,
  goals: 4,
  financials: 24,
  thanks: 4,
  past: 10,
  // NEW v2
  people: 16,
  spotlights: 4,
  portfolio: 40,
  logos: 24,
  support: 6,
  sources: 20,
} as const;

// ─── Small builders (keep each declaration to the fields that vary) ──────────

type Scalar = "text" | "textarea" | "image" | "url" | "iframe";

function field(
  type: Scalar,
  key: string,
  group: string,
  label: string,
  description: string,
  defaultValue: string,
  extra: { placeholder?: string; wide?: boolean } = {},
): TemplateField {
  return {
    key,
    label,
    description,
    type,
    page: "impact",
    group: `impact.${group}`,
    gridColumn:
      extra.wide || type === "textarea" || type === "image" || type === "iframe"
        ? "col-span-full"
        : "col-span-1",
    defaultValue,
    ...(extra.placeholder ? { placeholder: extra.placeholder } : {}),
  };
}

function list(
  key: string,
  group: string,
  label: string,
  description: string,
  itemLabel: string,
  maxItems: number,
  itemSchema: TemplateListItemField[],
  summaryKey: string,
): TemplateField {
  return {
    key,
    label,
    description,
    type: "list",
    page: "impact",
    group: `impact.${group}`,
    gridColumn: "col-span-full",
    maxItems,
    itemLabel,
    summaryKey,
    itemSchema,
  };
}

function navLabel(key: string, group: string, defaultValue: string) {
  return field(
    "text",
    key,
    group,
    "Section menu label",
    "Short name for this section in the report's sticky section menu.",
    defaultValue,
  );
}

/**
 * Appended to every report textarea that turns `[N]` into a footnote link
 * (impact-markup.tsx `renderImpactText`).
 */
const FOOTNOTE_HINT =
  " To cite a source, type its number from the Sources list in square brackets, like [1].";

/** Appended to report textareas that support `**bold**` runs. */
const BOLD_HINT =
  " Wrap words in double asterisks, like **this**, to make them bold.";

// ─── Fields ──────────────────────────────────────────────────────────────────

const heroData: TemplateField[] = [
  field(
    "text",
    K.heroEyebrow,
    "hero",
    "Small label",
    "Small capitals line next to your logo at the top of the report.",
    "Annual impact report",
  ),
  field(
    "text",
    K.heroYear,
    "hero",
    "Report year",
    "The report's year line above the main heading. Also labels the sticky section menu on wide screens.",
    "2025 Impact Report",
    { placeholder: "e.g. 2026 Impact Report" },
  ),
  field(
    "text",
    K.heroTheme,
    "hero",
    "Theme heading",
    "The report's large main heading, usually the year's theme.",
    "Building What We Own",
  ),
  field(
    "textarea",
    K.heroDeck,
    "hero",
    "Introduction",
    "One or two sentences under the main heading.",
    "A year of patient, non-extractive capital in Detroit’s worker-owned businesses — what it built, who built it, and what we’re building next.",
    { placeholder: "A sentence or two summing up the year" },
  ),
  field(
    "text",
    K.heroButtonLabel,
    "hero",
    "Read button label",
    "Button that jumps to the first section of the report. Hidden while no section has content yet.",
    "Read the report",
  ),
  field(
    "url",
    K.heroPdfUrl,
    "hero",
    "PDF link",
    "Link to a downloadable copy of the report (upload the PDF to your Media Library or paste a link). Leave blank to hide.",
    "",
    { placeholder: "https://…/impact-report.pdf" },
  ),
  field(
    "text",
    K.heroPdfLabel,
    "hero",
    "PDF link label",
    "Text for the PDF link. Only shows when a PDF link is set.",
    "Download the PDF",
  ),
  field(
    "text",
    K.heroPeriod,
    "hero",
    "Reporting period",
    "Small line under the buttons, shown next to your business name. Leave blank to hide.",
    "",
    { placeholder: "e.g. January – December 2025" },
  ),
  field(
    "image",
    K.heroImage,
    "hero",
    "Cover photo",
    "Photo beside the cover text (tinted to match the cover). Leave blank for a text-only cover that spans the full width.",
    "",
  ),
  field(
    "text",
    K.heroImageAlt,
    "hero",
    "Cover photo description",
    "Describes the cover photo for screen readers.",
    "",
    { wide: true, placeholder: "Who is in the photo and what they are doing" },
  ),
];

const letterData: TemplateField[] = [
  navLabel(K.letterNavLabel, "letter", "Letter"),
  field(
    "text",
    K.letterEyebrow,
    "letter",
    "Small label",
    "Small capitals line above the letter's heading.",
    "A letter from our Executive Director",
  ),
  field(
    "text",
    K.letterHeading,
    "letter",
    "Heading",
    "The letter's heading.",
    "A note on the year",
    { wide: true },
  ),
  field(
    "textarea",
    K.letterBody,
    "letter",
    "Letter",
    "The letter itself. Leave a blank line between paragraphs; the first paragraph is shown larger as the opening. The whole section stays hidden until this has text." +
      FOOTNOTE_HINT,
    "",
    {
      placeholder:
        "Write the letter here, with a blank line between paragraphs",
    },
  ),
  field(
    "text",
    K.letterSignoff,
    "letter",
    "Sign-off",
    "Short line above the signature.",
    "In solidarity,",
  ),
  field(
    "text",
    K.letterName,
    "letter",
    "Signed by",
    "Name shown under the portrait and as the signature. Leave blank to hide the signature.",
    "",
    { placeholder: "Full name" },
  ),
  field(
    "text",
    K.letterRole,
    "letter",
    "Title",
    "The signer's role, shown under their name. Leave blank to hide.",
    "",
    { placeholder: "e.g. Executive Director" },
  ),
  field(
    "image",
    K.letterImage,
    "letter",
    "Portrait",
    "Portrait beside the letter, cropped to a circle. Leave blank to hide.",
    "",
  ),
  field(
    "text",
    K.letterImageAlt,
    "letter",
    "Portrait description",
    "Describes the portrait for screen readers.",
    "",
    { wide: true, placeholder: "Name and role of the person pictured" },
  ),
  field(
    "image",
    K.letterSignatureImage,
    "letter",
    "Signature image",
    "Optional picture of a handwritten signature, shown on the sign-off card above the name. A transparent PNG works best. It is decorative, so it needs no description. Leave blank to hide.",
    "",
  ),
];

// Who we are (NEW v2): mission over a photo, then a history split.
const aboutData: TemplateField[] = [
  navLabel(K.aboutNavLabel, "about", "Who We Are"),
  field(
    "text",
    K.aboutEyebrow,
    "about",
    "Small label",
    "Small capitals line above the mission heading.",
    "Who we are",
  ),
  field(
    "text",
    K.missionHeading,
    "about",
    "Mission heading",
    "Heading on the mission card.",
    "Our mission",
  ),
  field(
    "textarea",
    K.missionBody,
    "about",
    "Mission statement",
    "Your mission, shown large on a card over the mission photo. This section stays hidden until the mission or the history has text." +
      FOOTNOTE_HINT,
    "",
    { placeholder: "Your mission statement, word for word" },
  ),
  field(
    "image",
    K.missionImage,
    "about",
    "Mission photo",
    "Wide photo behind the mission card, tinted so the card stands out. Leave blank for a plain background.",
    "",
  ),
  field(
    "text",
    K.missionImageAlt,
    "about",
    "Mission photo description",
    "Describes the mission photo for screen readers.",
    "",
    { wide: true, placeholder: "Who is in the photo and what they are doing" },
  ),
  field(
    "text",
    K.historyHeading,
    "about",
    "History heading",
    "Heading beside your history.",
    "History",
  ),
  field(
    "textarea",
    K.historyBody,
    "about",
    "History",
    "How and why you started. Leave a blank line between paragraphs. Leave blank to hide the history." +
      FOOTNOTE_HINT,
    "",
    { placeholder: "When you were founded, and why" },
  ),
  field(
    "image",
    K.historyImage,
    "about",
    "History photo",
    "Tall photo beside the history, running to the edge of the screen. Leave blank for text only.",
    "",
  ),
  field(
    "text",
    K.historyImageAlt,
    "about",
    "History photo description",
    "Describes the history photo for screen readers.",
    "",
    { wide: true, placeholder: "Who is in the photo and what they are doing" },
  ),
];

// Our people (NEW v2): grouped circle portraits.
const peopleData: TemplateField[] = [
  navLabel(K.peopleNavLabel, "people", "Our People"),
  field(
    "text",
    K.peopleEyebrow,
    "people",
    "Small label",
    "Small capitals line above the heading.",
    "Our people",
  ),
  field(
    "text",
    K.peopleHeading,
    "people",
    "Heading",
    "Heading above the portraits.",
    "The people doing the work",
  ),
  list(
    K.peopleItems,
    "people",
    "People",
    "One row per person. People with the same group (such as Meet our team or Meet our board) are shown together under that heading, in the order the groups first appear; a person with a blank group joins the group above. The section stays hidden until at least one person has a name.",
    "person",
    WEALTH_IMPACT_MAX.people,
    [
      {
        key: "group",
        label: "Group",
        type: "text",
        optional: true,
        description:
          "Heading this person is listed under. Leave blank to use the group of the row above.",
        placeholder: "e.g. Meet our team",
      },
      {
        key: "name",
        label: "Name",
        type: "text",
        description: "The person's full name.",
      },
      {
        key: "role",
        label: "Role",
        type: "text",
        optional: true,
        description: "Their title or role.",
        placeholder: "e.g. Board Treasurer",
      },
      {
        key: "image",
        label: "Photo",
        type: "image",
        optional: true,
        description:
          "Portrait, cropped to a circle. Without one, the person's initials are shown instead.",
      },
      {
        key: "imageAlt",
        label: "Photo description",
        type: "text",
        optional: true,
        description: "Describes the photo for screen readers.",
      },
    ],
    "name",
  ),
];

const numbersData: TemplateField[] = [
  navLabel(K.numbersNavLabel, "numbers", "By the Numbers"),
  field(
    "text",
    K.numbersEyebrow,
    "numbers",
    "Small label",
    "Small capitals line above the heading.",
    "By the numbers",
  ),
  field(
    "text",
    K.numbersHeading,
    "numbers",
    "Heading",
    "Large heading above the figures.",
    "What the year added up to.",
  ),
  field(
    "textarea",
    K.numbersIntro,
    "numbers",
    "Introduction",
    "Short paragraph under the heading. Leave blank to hide.",
    "",
    { placeholder: "A sentence on what these figures show" },
  ),
  field(
    "text",
    K.numbersLinkLabel,
    "numbers",
    "Financials link label",
    "Link beside the heading that jumps to the Financials section. Only shows when Financials has rows.",
    "See the financials",
  ),
  list(
    K.numbersItems,
    "numbers",
    "Figures",
    "The year's big numbers. Without details they show four across on wide screens and two on phones; once any figure has a detail, every figure shows as a row with its title and detail beside the number. The section stays hidden until at least one figure is added.",
    "figure",
    WEALTH_IMPACT_MAX.stats,
    [
      {
        key: "value",
        label: "Number",
        type: "text",
        description: "The figure as it should read, such as $386K, 26 or 150+.",
        placeholder: "e.g. $386K",
      },
      {
        key: "caption",
        label: "Caption",
        type: "textarea",
        optional: true,
        description: "What the number counts, in a short line.",
        placeholder: "e.g. lent to worker-owned businesses this year",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        optional: true,
        description:
          "Short heading for the figure, shown in the row layout beside the number.",
        placeholder: "e.g. Co-ops in the Incubator",
      },
      {
        key: "detail",
        label: "Detail",
        type: "textarea",
        optional: true,
        description:
          "A few sentences on the figure. Adding a detail to any figure switches the section to rows." +
          FOOTNOTE_HINT,
      },
    ],
    "value",
  ),
  field(
    "textarea",
    K.numbersNote,
    "numbers",
    "Footnote",
    "Small note under the figures, such as which years they cover. Leave blank to hide.",
    "",
    {
      placeholder:
        "e.g. Top row: this year only. Bottom row: since we were founded.",
    },
  ),
  field(
    "image",
    K.numbersBgImage,
    "numbers",
    "Background photo",
    "Optional photo shown very faintly behind the figures. It is decorative, so it needs no description. Leave blank for a plain background.",
    "",
  ),
];

const programsData: TemplateField[] = [
  navLabel(K.programsNavLabel, "programs", "Programs"),
  field(
    "text",
    K.programsEyebrow,
    "programs",
    "Small label",
    "Small capitals line above the heading.",
    "Programs",
  ),
  field(
    "text",
    K.programsHeading,
    "programs",
    "Heading",
    "Heading above the program rows.",
    "How we build ownership",
  ),
  field(
    "textarea",
    K.programsIntro,
    "programs",
    "Introduction",
    "Short paragraph under the heading. Leave blank to hide.",
    "Financing, education and community, working together: capital for the business, skills for the owners, and neighbors who’ve done it before.",
    { placeholder: "A sentence on how the programs fit together" },
  ),
  field(
    "text",
    K.programsHubLabel,
    "programs",
    "Overview centre label",
    "Short name shown in the centre of the program overview diagram, such as your initials. The diagram appears when this is set and at least three programs exist. Leave blank to hide the diagram.",
    "",
    { placeholder: "e.g. DCWF" },
  ),
  field(
    "text",
    K.programsHubHeading,
    "programs",
    "Overview heading",
    "Heading above the program overview diagram.",
    "How it all fits together",
  ),
  list(
    K.programsItems,
    "programs",
    "Programs",
    "One row per program. Programs with a photo show as rows with the photo alternating sides; programs with a description but no photo show as cards, two across; programs with only a title appear in the overview diagram only. The section stays hidden until at least one program has a title.",
    "program",
    WEALTH_IMPACT_MAX.programs,
    [
      {
        key: "label",
        label: "Small label",
        type: "text",
        optional: true,
        description: "Small capitals line above the title.",
        placeholder: "e.g. 01 · Lending",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "The program's name.",
        placeholder: "e.g. Non-Extractive Financing",
      },
      {
        key: "short",
        label: "Short name",
        type: "text",
        optional: true,
        description:
          "Acronym or one-word name shown large in the overview diagram, above the title.",
        placeholder: "e.g. CIP",
      },
      {
        key: "copy",
        label: "Description",
        type: "textarea",
        optional: true,
        description:
          "What the program did this year. Leave a blank line between paragraphs.",
      },
      {
        key: "image",
        label: "Photo",
        type: "image",
        optional: true,
        description:
          "Photo beside the text. Without one, the row shows text only.",
      },
      {
        key: "imageAlt",
        label: "Photo description",
        type: "text",
        optional: true,
        description: "Describes the photo for screen readers.",
      },
      {
        key: "statValue",
        label: "Highlight number",
        type: "text",
        optional: true,
        description:
          "One large figure for this program. Leave blank to hide the highlight.",
        placeholder: "e.g. $43K",
      },
      {
        key: "statCaption",
        label: "Highlight caption",
        type: "text",
        optional: true,
        description: "What the highlight number counts.",
        placeholder: "e.g. average loan this year",
      },
      {
        key: "linkLabel",
        label: "Link label",
        type: "text",
        optional: true,
        description:
          "Text for the link under the row. Needs a link address too.",
        placeholder: "e.g. Read the story",
      },
      {
        key: "linkUrl",
        label: "Link address",
        type: "url",
        optional: true,
        description:
          "Where the link goes: a page on your site (like /services) or a full web address.",
      },
    ],
    "title",
  ),
];

const storiesData: TemplateField[] = [
  navLabel(K.storiesNavLabel, "stories", "Co-op Stories"),
  field(
    "text",
    K.storiesEyebrow,
    "stories",
    "Small label",
    "Small capitals line above the heading.",
    "Co-op stories",
  ),
  field(
    "text",
    K.storiesHeading,
    "stories",
    "Heading",
    "Heading above the story cards.",
    "The businesses behind the numbers",
  ),
  field(
    "text",
    K.storiesLinkLabel,
    "stories",
    "See-all link label",
    "Link beside the heading. Needs a link address too.",
    "Meet all the co-ops",
  ),
  field(
    "url",
    K.storiesLinkUrl,
    "stories",
    "See-all link address",
    "Where the see-all link goes. Leave blank to hide the link.",
    "/testimonials",
  ),
  field(
    "text",
    K.storiesButtonLabel,
    "stories",
    "Card button label",
    "Button on each story card that has a link.",
    "Read more",
  ),
  list(
    K.storiesItems,
    "stories",
    "Stories",
    "One card per co-op or business. The section stays hidden until at least one story has a name.",
    "story",
    WEALTH_IMPACT_MAX.stories,
    [
      {
        key: "name",
        label: "Name",
        type: "text",
        description: "The business or co-op's name, shown as the card title.",
      },
      {
        key: "label",
        label: "Small label",
        type: "text",
        optional: true,
        description: "Small capitals line above the name.",
        placeholder: "e.g. Loan recipient",
      },
      {
        key: "summary",
        label: "Summary",
        type: "textarea",
        optional: true,
        description: "One or two sentences on their story.",
      },
      {
        key: "image",
        label: "Logo or photo",
        type: "image",
        optional: true,
        description: "Shown whole at the top of the card, so logos work well.",
      },
      {
        key: "imageAlt",
        label: "Logo or photo description",
        type: "text",
        optional: true,
        description:
          "Describes the image for screen readers, such as “Stuffed Detroit logo”.",
      },
      {
        key: "url",
        label: "Link address",
        type: "url",
        optional: true,
        description:
          "Where the card links: a blog post, a page on your site or their website. Leave blank for a card with no link.",
      },
    ],
    "name",
  ),
];

const goalsData: TemplateField[] = [
  navLabel(K.goalsNavLabel, "goals", "Where We’re Going"),
  field(
    "text",
    K.goalsEyebrow,
    "goals",
    "Small label",
    "Small capitals line above the heading.",
    "Where we’re going",
  ),
  field(
    "text",
    K.goalsHeading,
    "goals",
    "Heading",
    "Large heading above the numbered goals.",
    "What we’re building next",
  ),
  field(
    "textarea",
    K.goalsIntro,
    "goals",
    "Introduction",
    "A few paragraphs beside the heading on why these goals matter now. Leave a blank line between paragraphs. Leave blank to hide." +
      FOOTNOTE_HINT,
    "",
    { placeholder: "Why this work matters now" },
  ),
  field(
    "image",
    K.goalsImage,
    "goals",
    "Photo",
    "Tall photo beside the goals, running to the edge of the screen. Leave blank to hide.",
    "",
  ),
  field(
    "text",
    K.goalsImageAlt,
    "goals",
    "Photo description",
    "Describes the photo for screen readers.",
    "",
    { wide: true, placeholder: "Who is in the photo and what they are doing" },
  ),
  field(
    "text",
    K.goalsListLabel,
    "goals",
    "List heading",
    "Short line at the top of the goals box. Leave blank to hide.",
    "",
    { placeholder: "e.g. Your support is needed now to:" },
  ),
  list(
    K.goalsItems,
    "goals",
    "Goals",
    "Numbered goals, in order. The section stays hidden until at least one goal has a title.",
    "goal",
    WEALTH_IMPACT_MAX.goals,
    [
      {
        key: "title",
        label: "Goal",
        type: "text",
        description: "The goal in a few words.",
        placeholder: "e.g. Grow the Incubator",
      },
      {
        key: "line",
        label: "Detail",
        type: "textarea",
        optional: true,
        description: "One sentence on what it means in practice.",
      },
    ],
    "title",
  ),
];

const financialsData: TemplateField[] = [
  navLabel(K.financialsNavLabel, "financials", "Financials"),
  field(
    "text",
    K.financialsEyebrow,
    "financials",
    "Small label",
    "Small capitals line above the heading.",
    "Financials",
  ),
  field(
    "text",
    K.financialsHeading,
    "financials",
    "Heading",
    "Heading beside the financial tables.",
    "Where the money came from, and where it went",
    { wide: true },
  ),
  field(
    "textarea",
    K.financialsNote,
    "financials",
    "Fiscal year note",
    "Short note under the heading, such as the fiscal year and whether the figures are audited. Leave blank to hide.",
    "",
    {
      placeholder: "e.g. Fiscal year January–December 2025. Unaudited summary.",
    },
  ),
  field(
    "text",
    K.financialsStat1Value,
    "financials",
    "First headline number",
    "Large figure under the note. Leave blank to hide.",
    "",
    { placeholder: "e.g. $1.12M" },
  ),
  field(
    "text",
    K.financialsStat1Caption,
    "financials",
    "First headline caption",
    "What the first headline number counts.",
    "",
    { placeholder: "e.g. total revenue" },
  ),
  field(
    "text",
    K.financialsStat2Value,
    "financials",
    "Second headline number",
    "A second large figure. Leave blank to hide.",
    "",
    { placeholder: "e.g. 88¢" },
  ),
  field(
    "text",
    K.financialsStat2Caption,
    "financials",
    "Second headline caption",
    "What the second headline number counts.",
    "",
    { placeholder: "e.g. of every dollar went to programs" },
  ),
  list(
    K.financialsItems,
    "financials",
    "Financial lines",
    "One row per line item. Rows with the same group (such as Revenue, Expenses or Balance sheet) are collected into one expandable table, in the order the groups first appear; a row with a blank group joins the group above it. A total row is added when every amount in a group is a plain number. The section stays hidden until at least one row has a label.",
    "line",
    WEALTH_IMPACT_MAX.financials,
    [
      {
        key: "group",
        label: "Group",
        type: "text",
        optional: true,
        description:
          "Which table the row belongs to. Leave blank to use the group of the row above.",
        placeholder: "e.g. Revenue",
      },
      {
        key: "label",
        label: "Label",
        type: "text",
        description: "What the line is.",
        placeholder: "e.g. Foundation grants",
      },
      {
        key: "amount",
        label: "Amount",
        type: "text",
        optional: true,
        description: "The amount as it should read, such as $612,000.",
        placeholder: "e.g. $612,000",
      },
      {
        key: "share",
        label: "Share (%)",
        type: "text",
        optional: true,
        description:
          "This line's percentage of its group, from 0 to 100. It sizes the bar; leave blank for no bar.",
        placeholder: "e.g. 54.6",
      },
    ],
    "label",
  ),
  field(
    "text",
    K.financialsColumnLabel,
    "financials",
    "Line column heading",
    "Heading over the tables' first column.",
    "Line item",
  ),
  field(
    "text",
    K.financialsShareLabel,
    "financials",
    "Share column heading",
    "Heading over the percentage column.",
    "Share",
  ),
  field(
    "text",
    K.financialsAmountLabel,
    "financials",
    "Amount column heading",
    "Heading over the amount column.",
    "Amount",
  ),
  field(
    "text",
    K.financialsTotalLabel,
    "financials",
    "Total row label",
    "Label for each table's total row.",
    "Total",
  ),
];

const thanksData: TemplateField[] = [
  navLabel(K.thanksNavLabel, "thanks", "Thank You"),
  field(
    "text",
    K.thanksEyebrow,
    "thanks",
    "Small label",
    "Small capitals line above the heading.",
    "Thank you",
  ),
  field(
    "text",
    K.thanksHeading,
    "thanks",
    "Heading",
    "Heading above the name columns.",
    "Built with a lot of help",
  ),
  list(
    K.thanksItems,
    "thanks",
    "Name columns",
    "Columns of supporters, such as funders, lenders and partners. The section stays hidden until at least one column has a name or one logo is added.",
    "column",
    WEALTH_IMPACT_MAX.thanks,
    [
      {
        key: "heading",
        label: "Column heading",
        type: "text",
        optional: true,
        description: "Small capitals heading over the column.",
        placeholder: "e.g. Foundations & grantmakers",
      },
      {
        key: "names",
        label: "Names",
        type: "textarea",
        description: "One name per line.",
      },
    ],
    "heading",
  ),
  field(
    "textarea",
    K.thanksClosing,
    "thanks",
    "Closing line",
    "Line under the columns, such as a thank-you to individual donors. Leave blank to hide.",
    "",
    {
      placeholder: "e.g. And to every neighbor who gave this year: thank you.",
    },
  ),
  field(
    "image",
    K.thanksImage,
    "thanks",
    "Group photo",
    "Photo beside the heading, such as your members or partners together. Leave blank to hide.",
    "",
  ),
  field(
    "text",
    K.thanksImageAlt,
    "thanks",
    "Group photo description",
    "Describes the group photo for screen readers.",
    "",
    { wide: true, placeholder: "Who is in the photo and what they are doing" },
  ),
  list(
    K.thanksLogos,
    "thanks",
    "Logos",
    "A wall of logos, such as the co-ops you worked with or your funders. Each logo shows whole on a white tile. Rows without a logo are skipped.",
    "logo",
    WEALTH_IMPACT_MAX.logos,
    [
      {
        key: "image",
        label: "Logo",
        type: "image",
        description: "The logo. Wide logos fit best.",
      },
      {
        key: "name",
        label: "Name",
        type: "text",
        description:
          "The organization's name. It also describes the logo for screen readers, so always fill it in.",
        placeholder: "e.g. Stuffed Detroit",
      },
      {
        key: "url",
        label: "Link address",
        type: "url",
        optional: true,
        description:
          "Where the logo links, such as their website. Leave blank for a logo with no link.",
      },
    ],
    "name",
  ),
];

const pastData: TemplateField[] = [
  navLabel(K.pastNavLabel, "past", "Past Reports"),
  field(
    "text",
    K.pastEyebrow,
    "past",
    "Small label",
    "Small capitals line above the heading.",
    "Past reports",
  ),
  field(
    "text",
    K.pastHeading,
    "past",
    "Heading",
    "Heading above the list of earlier reports.",
    "Earlier reports",
  ),
  list(
    K.pastItems,
    "past",
    "Reports",
    "Links to earlier reports, newest first. The section stays hidden until at least one row has both a label and a link.",
    "report",
    WEALTH_IMPACT_MAX.past,
    [
      {
        key: "label",
        label: "Label",
        type: "text",
        description: "The report's name.",
        placeholder: "e.g. 2024 Impact Report",
      },
      {
        key: "url",
        label: "Link address",
        type: "url",
        description: "The PDF or page for that report.",
      },
    ],
    "label",
  ),
];

const ctaData: TemplateField[] = [
  field(
    "text",
    K.ctaEyebrow,
    "cta",
    "Small label",
    "Small capitals line above the donate heading.",
    "Support DCWF",
  ),
  field(
    "text",
    K.ctaHeading,
    "cta",
    "Heading",
    "The donate band's heading.",
    "Support worker-ownership in and around metro Detroit.",
    { wide: true },
  ),
  field(
    "textarea",
    K.ctaBody,
    "cta",
    "Body",
    "Paragraph under the heading.",
    "Your donation goes directly towards educational workshops, trainings, public programming, co-op game nights, and providing technical assistance and loan development to cooperatives.",
    { placeholder: "What a gift pays for" },
  ),
  field(
    "text",
    K.ctaButtonLabel,
    "cta",
    "Button label",
    "Text on the donate button.",
    "Donate",
  ),
  field(
    "url",
    K.ctaButtonUrl,
    "cta",
    "Button link",
    "Where the donate button goes.",
    "/donate",
  ),
  field(
    "image",
    K.ctaBgImage,
    "cta",
    "Background photo",
    "Optional photo shown very faintly behind the band. It is decorative, so it needs no description. Leave blank for a plain background.",
    "",
  ),
];

// Spotlights (NEW v2): every row is its own report section.
const spotlightsData: TemplateField[] = [
  list(
    K.spotlightsItems,
    "spotlights",
    "Spotlights",
    "Deep dives on one topic each, such as why your work matters or one program in detail. Every spotlight is its own section with its own entry in the section menu. A spotlight shows once it has a heading and either a story or a highlighted note.",
    "spotlight",
    WEALTH_IMPACT_MAX.spotlights,
    [
      {
        key: "navLabel",
        label: "Section menu label",
        type: "text",
        optional: true,
        description:
          "Short name for this spotlight in the section menu. Leave blank to use the heading.",
        placeholder: "e.g. Why It Matters",
      },
      {
        key: "eyebrow",
        label: "Small label",
        type: "text",
        optional: true,
        description: "Small capitals line above the heading.",
        placeholder: "e.g. Spotlight",
      },
      {
        key: "heading",
        label: "Heading",
        type: "text",
        description: "The spotlight's heading.",
        placeholder: "e.g. Why worker ownership matters in Detroit",
      },
      {
        key: "body",
        label: "Story",
        type: "textarea",
        optional: true,
        description:
          "The spotlight's text. Leave a blank line between paragraphs. A paragraph that starts with bold words, like **Title** and then a sentence, shows as a point in a two-column list." +
          FOOTNOTE_HINT,
      },
      {
        key: "statValue",
        label: "First number",
        type: "text",
        optional: true,
        description:
          "A big figure shown in a square tile beside the story. Leave blank for no figures.",
        placeholder: "e.g. 400+",
      },
      {
        key: "statCaption",
        label: "First number caption",
        type: "text",
        optional: true,
        description: "What the first number counts.",
        placeholder: "e.g. hours of technical assistance",
      },
      {
        key: "stat2Value",
        label: "Second number",
        type: "text",
        optional: true,
        description: "An optional second figure, shown under the first.",
        placeholder: "e.g. 1:1",
      },
      {
        key: "stat2Caption",
        label: "Second number caption",
        type: "text",
        optional: true,
        description: "What the second number counts.",
      },
      {
        key: "image",
        label: "Photo",
        type: "image",
        optional: true,
        description:
          "Tall photo beside the story, running to the edge of the screen. Only shows when the spotlight has no numbers.",
      },
      {
        key: "imageAlt",
        label: "Photo description",
        type: "text",
        optional: true,
        description: "Describes the photo for screen readers.",
      },
      {
        key: "callout",
        label: "Highlighted note",
        type: "textarea",
        optional: true,
        description:
          "A short statement shown in a highlighted box beside the story." +
          FOOTNOTE_HINT,
      },
    ],
    "heading",
  ),
];

// Lending portfolio (NEW v2): grouped tables.
const portfolioData: TemplateField[] = [
  navLabel(K.portfolioNavLabel, "portfolio", "Portfolio"),
  field(
    "text",
    K.portfolioEyebrow,
    "portfolio",
    "Small label",
    "Small capitals line above the heading.",
    "Lending portfolio",
  ),
  field(
    "text",
    K.portfolioHeading,
    "portfolio",
    "Heading",
    "Heading above the portfolio tables.",
    "Where the money is working",
  ),
  field(
    "textarea",
    K.portfolioIntro,
    "portfolio",
    "Introduction",
    "Short paragraph under the heading. Leave blank to hide.",
    "",
    { placeholder: "A sentence on how your lending works" },
  ),
  list(
    K.portfolioItems,
    "portfolio",
    "Portfolio",
    "One row per business you lent to. Rows with the same group (such as Current projects or Repaid loans) are collected into one table, in the order the groups first appear; a row with a blank group joins the group above it. The section stays hidden until at least one row has a name.",
    "business",
    WEALTH_IMPACT_MAX.portfolio,
    [
      {
        key: "group",
        label: "Group",
        type: "text",
        optional: true,
        description:
          "Which table the row belongs to; it also heads the table's first column. Leave blank to use the group of the row above.",
        placeholder: "e.g. Current projects",
      },
      {
        key: "name",
        label: "Name",
        type: "text",
        description: "The business or co-op's name.",
      },
      {
        key: "detail",
        label: "Industry",
        type: "text",
        optional: true,
        description: "What the business does.",
        placeholder: "e.g. Screen printing",
      },
      {
        key: "date",
        label: "Date",
        type: "text",
        optional: true,
        description: "When the loan was made or repaid, as it should read.",
        placeholder: "e.g. 2024",
      },
      {
        key: "dateLabel",
        label: "Date column heading",
        type: "text",
        optional: true,
        description:
          "Heading over this table's date column, such as Repaid. Only the first one filled in for each group is used; leave blank to use the default date heading.",
        placeholder: "e.g. Repaid",
      },
      {
        key: "url",
        label: "Link address",
        type: "url",
        optional: true,
        description:
          "Where the name links, such as their website or story. Leave blank for no link.",
      },
    ],
    "name",
  ),
  field(
    "text",
    K.portfolioDetailLabel,
    "portfolio",
    "Industry column heading",
    "Heading over the tables' second column.",
    "Industry",
  ),
  field(
    "text",
    K.portfolioDateLabel,
    "portfolio",
    "Date column heading",
    "Default heading over the tables' date column. A group can use its own heading instead.",
    "Date",
  ),
];

// Full report embed (NEW v2).
const reportData: TemplateField[] = [
  navLabel(K.reportNavLabel, "report", "Full Report"),
  field(
    "text",
    K.reportEyebrow,
    "report",
    "Small label",
    "Small capitals line above the heading.",
    "The full report",
  ),
  field(
    "text",
    K.reportHeading,
    "report",
    "Heading",
    "Heading above the embedded report.",
    "Read the designed report",
  ),
  field(
    "iframe",
    K.reportEmbedUrl,
    "report",
    "Report embed",
    "Paste the embed link for your designed report from Canva, Issuu or Google Drive, and give it a title. It shows in a tall frame with your PDF link underneath. The section stays hidden until a working embed link is set.",
    "",
  ),
];

// Ways to support (NEW v2).
const supportData: TemplateField[] = [
  navLabel(K.supportNavLabel, "support", "Ways to Support"),
  field(
    "text",
    K.supportEyebrow,
    "support",
    "Small label",
    "Small capitals line above the heading.",
    "Get involved",
  ),
  field(
    "text",
    K.supportHeading,
    "support",
    "Heading",
    "Heading above the numbered ways to support.",
    "Ways to support",
  ),
  list(
    K.supportItems,
    "support",
    "Ways to support",
    "Numbered ways people can help, in order. The section stays hidden until at least one way has a title.",
    "way",
    WEALTH_IMPACT_MAX.support,
    [
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "The way to help, in a few words.",
        placeholder: "e.g. Direct contributions",
      },
      {
        key: "line",
        label: "Detail",
        type: "textarea",
        optional: true,
        description: "One sentence on what it involves.",
      },
    ],
    "title",
  ),
  field(
    "textarea",
    K.supportClosing,
    "support",
    "Closing line",
    "A short line under the list. Leave blank to hide." + BOLD_HINT,
    "",
    { placeholder: "e.g. **Together, we can build a city we own.**" },
  ),
  field(
    "text",
    K.supportButtonLabel,
    "support",
    "Button label",
    "Text on the button under the list. Needs a button link too.",
    "Contact us",
  ),
  field(
    "url",
    K.supportButtonUrl,
    "support",
    "Button link",
    "Where the button goes. Leave blank to hide the button.",
    "/contact",
  ),
  field(
    "image",
    K.supportImage,
    "support",
    "Photo",
    "Tall photo beside the list, running to the edge of the screen. Leave blank to hide.",
    "",
  ),
  field(
    "text",
    K.supportImageAlt,
    "support",
    "Photo description",
    "Describes the photo for screen readers.",
    "",
    { wide: true, placeholder: "Who is in the photo and what they are doing" },
  ),
];

// Sources (NEW v2): numbered works cited, targets of the [N] footnotes.
const sourcesData: TemplateField[] = [
  navLabel(K.sourcesNavLabel, "sources", "Sources"),
  field(
    "text",
    K.sourcesHeading,
    "sources",
    "Heading",
    "Heading beside the numbered list of sources.",
    "Works cited",
  ),
  list(
    K.sourcesItems,
    "sources",
    "Sources",
    "The studies, articles and data your report cites, numbered in this order. Typing [1] in the report's text links to the first source here, [2] to the second, and so on. The section stays hidden until at least one source is added.",
    "source",
    WEALTH_IMPACT_MAX.sources,
    [
      {
        key: "text",
        label: "Source",
        type: "textarea",
        description:
          "The citation as it should read: author, title, publisher and year.",
      },
      {
        key: "url",
        label: "Link address",
        type: "url",
        optional: true,
        description:
          "Where the source can be read online. Leave blank for no link.",
      },
    ],
    "text",
  ),
];

export const wealthImpactData: TemplateField[] = [
  ...heroData,
  ...letterData,
  ...aboutData,
  ...peopleData,
  ...programsData,
  ...numbersData,
  ...spotlightsData,
  ...portfolioData,
  ...storiesData,
  ...goalsData,
  ...financialsData,
  ...thanksData,
  ...reportData,
  ...supportData,
  ...sourcesData,
  ...pastData,
  ...ctaData,
];

/** Scalar (non-list) keys — what the page hands to `resolveFields`. */
export const WEALTH_IMPACT_SCALAR_KEYS: string[] = wealthImpactData
  .filter((f) => f.type !== "list")
  .map((f) => f.key);

// ─── Groups + sections (one per visual section, render order) ───────────────

type SectionMeta = {
  group: string;
  title: string;
  description: string;
  icon: string;
  hideable: boolean;
};

const SECTION_META: SectionMeta[] = [
  {
    group: "hero",
    title: "Cover",
    description:
      "Report cover: logo, year, theme heading, introduction, read button, optional PDF link and photo",
    icon: "📘",
    hideable: false,
  },
  {
    group: "letter",
    title: "Letter",
    description:
      "Letter from your director with a round portrait and a signed sign-off card. Hidden until the letter has text",
    icon: "✉️",
    hideable: true,
  },
  {
    group: "about",
    title: "Who we are",
    description:
      "Your mission on a card over a photo, then your history beside a tall photo. Hidden until the mission or history has text",
    icon: "🏛️",
    hideable: true,
  },
  {
    group: "people",
    title: "Our people",
    description:
      "Round portraits of your team and board, grouped under their own headings. Hidden until at least one person is added",
    icon: "👥",
    hideable: true,
  },
  {
    group: "programs",
    title: "Programs",
    description:
      "Optional overview diagram, then photo rows and cards, one per program. Hidden until at least one program is added",
    icon: "🌱",
    hideable: true,
  },
  {
    group: "numbers",
    title: "By the numbers",
    description:
      "Big-number figures, as a grid or as rows with details. Hidden until at least one figure is added",
    icon: "🔢",
    hideable: true,
  },
  {
    group: "spotlights",
    title: "Spotlights",
    description:
      "Up to four deep-dive sections, each with its own menu entry, numbers, photo and highlighted note. Each one is hidden until it has a heading and text",
    icon: "🔦",
    hideable: true,
  },
  {
    group: "portfolio",
    title: "Lending portfolio",
    description:
      "Tables of the businesses you lent to, such as current projects and repaid loans. Hidden until at least one business is added",
    icon: "💼",
    hideable: true,
  },
  {
    group: "stories",
    title: "Co-op stories",
    description:
      "Story cards for the businesses you supported. Hidden until at least one story is added",
    icon: "📰",
    hideable: true,
  },
  {
    group: "goals",
    title: "Where we’re going",
    description:
      "Numbered goals in a box, with an optional introduction and photo. Hidden until at least one goal is added",
    icon: "🧭",
    hideable: true,
  },
  {
    group: "financials",
    title: "Financials",
    description:
      "Expandable revenue, expense and balance tables with bars, plus headline numbers. Hidden until at least one line is added",
    icon: "📊",
    hideable: true,
  },
  {
    group: "thanks",
    title: "Thank you",
    description:
      "Columns of funders, lenders and partners, an optional group photo and a logo wall. Hidden until at least one name or logo is added",
    icon: "🙏",
    hideable: true,
  },
  {
    group: "report",
    title: "Full report",
    description:
      "Your designed report (Canva, Issuu or Google Drive) embedded in the page. Hidden until an embed link is set",
    icon: "📄",
    hideable: true,
  },
  {
    group: "support",
    title: "Ways to support",
    description:
      "Numbered ways to help, a closing line, a button and an optional photo. Hidden until at least one way is added",
    icon: "🤝",
    hideable: true,
  },
  {
    group: "sources",
    title: "Sources",
    description:
      "Numbered list of the sources your report cites; [1] in the text links here. Hidden until at least one source is added",
    icon: "📚",
    hideable: true,
  },
  {
    group: "past",
    title: "Past reports",
    description:
      "Links to earlier reports. Hidden until at least one report link is added",
    icon: "🗂️",
    hideable: true,
  },
  {
    group: "cta",
    title: "Donate",
    description:
      "Donate band at the end of the report. Shows only while donations are turned on",
    icon: "💚",
    hideable: true,
  },
];

export const wealthImpactFieldGroups: TemplateFieldGroup[] = SECTION_META.map(
  (s) => ({
    id: `impact.${s.group}`,
    title: s.title,
    description: s.description,
    icon: s.icon,
    columns: 2,
  }),
);

export const wealthImpactSections: TemplateSection[] = SECTION_META.map(
  (s, order) => ({
    id: `impact.${s.group}`,
    page: "impact",
    title: s.title,
    description: s.description,
    groupIds: [`impact.${s.group}`],
    order,
    hideable: s.hideable,
  }),
);
