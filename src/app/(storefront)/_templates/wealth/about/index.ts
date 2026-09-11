import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

// ─── About DCWF (hero) — NOT hideable ──────────────────────────────────────

const aboutHeroData: TemplateField[] = [
  {
    key: "wealth.about.hero-heading",
    label: "Page Heading",
    description:
      "Centered italic heading at the top of the About page (also the page's H1).",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue: "About DCWF",
  },
  {
    key: "wealth.about.hero-paragraph-1",
    label: "Story — Paragraph 1",
    description: "First paragraph of DCWF's story (founding, mission).",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Established in 2017, Detroit Community Wealth Fund (DCWF) is a nonprofit organization dedicated to fostering, educating, and financing democratically and worker-owned cooperative businesses. DCWF has a strong track record as a leader in cooperative business development and financing. Our efforts have included providing extensive pro-bono technical assistance to numerous emerging and established cooperative businesses, training emerging cooperative entrepreneurs, and successfully incubating cooperative businesses through our Cooperative Incubator Program. Additionally, DCWF is uniquely positioned as the exclusive financing program in Detroit specifically designed to support worker ownership.",
  },
  {
    key: "wealth.about.hero-paragraph-2",
    label: "Story — Paragraph 2",
    description: "Second paragraph of DCWF's story (racial wealth inequality).",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "DCWF's core mission is to combat racial wealth inequality by facilitating democratic and shared power practices within businesses. Increasing the availability of well-paying jobs for Detroit residents is paramount in elevating wealth levels for local families, given that there is only one job for every four residents. In 2019, a mere 27% of Detroit households belonged to the middle class. The ongoing challenge of business closures, exacerbated by the pandemic, presents an opportunity for business owners to secure the legacies of their companies while preserving jobs and creating ownership prospects for Detroit residents.",
  },
  {
    key: "wealth.about.hero-paragraph-3",
    label: "Story — Paragraph 3",
    description: "Third paragraph of DCWF's story (Seed Commons partnership).",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "DCWF collaborates with Seed Commons, a national financial cooperative specializing in providing patient and non-extractive capital to finance worker cooperatives. Seed Commons excels in identifying conversion opportunities and training workers for successful transitions to worker ownership. To date, Seed Commons has collectively invested over $100 million in worker cooperatives across the nation. Our national team of lenders possesses expertise in business valuation, legal and operational diligence, and the technical assistance necessary for a seamless transition to worker ownership.",
  },
];

// ─── Director spotlight — hideable ─────────────────────────────────────────

const aboutDirectorData: TemplateField[] = [
  {
    key: "wealth.about.director-image",
    label: "Director Photo",
    description: "Headshot photo of the Executive Director.",
    type: "image",
    page: "about",
    group: "about.director",
    gridColumn: "col-span-full",
    defaultValue: "/templates/wealth/images/director.jpg",
  },
  {
    key: "wealth.about.director-image-alt",
    label: "Director Photo Alt Text",
    description: "Alt text describing the director photo, for screen readers.",
    type: "text",
    page: "about",
    group: "about.director",
    gridColumn: "col-span-full",
    defaultValue:
      "Keyanna Silverman-Maddox, Executive Director of Detroit Community Wealth Fund",
  },
  {
    key: "wealth.about.director-name-title",
    label: "Name & Title",
    description: "The director's name and title, shown in bold above the bio.",
    type: "text",
    page: "about",
    group: "about.director",
    gridColumn: "col-span-full",
    defaultValue: "Keyanna Silverman-Maddox, Executive Director",
  },
  {
    key: "wealth.about.director-bio-1",
    label: "Bio — Paragraph 1",
    description: "First paragraph of the director's bio.",
    type: "textarea",
    page: "about",
    group: "about.director",
    gridColumn: "col-span-full",
    defaultValue:
      "Keyanna Silverman-Maddox is the Executive Director of the Detroit Community Wealth Fund (DCWF), where she leads strategy, finance, and operations to advance racial equity through movement-aligned, non-extractive capital. She has been with DCWF for five years.",
  },
  {
    key: "wealth.about.director-bio-2",
    label: "Bio — Paragraph 2",
    description: "Second paragraph of the director's bio.",
    type: "textarea",
    page: "about",
    group: "about.director",
    gridColumn: "col-span-full",
    defaultValue:
      "Keyanna founded Worker-Owned Detroit, DCWF's business transition program and a cornerstone of DCWF's racial equity strategy, preserving legacy businesses, protecting jobs, and expanding opportunities for workers, particularly in Black and historically marginalized communities, to build durable wealth through ownership. A former entrepreneur, she brings strong financial and operational acumen alongside a commitment to building organizational cultures rooted in respect, accountability, and shared purpose.",
  },
  {
    key: "wealth.about.director-bio-3",
    label: "Bio — Paragraph 3",
    description: "Third paragraph of the director's bio.",
    type: "textarea",
    page: "about",
    group: "about.director",
    gridColumn: "col-span-full",
    defaultValue:
      "She holds a BA from the University of Michigan and an MBA from the University of Massachusetts Boston.",
  },
  {
    key: "wealth.about.director-email",
    label: "Director Contact Email",
    description: "Shown in bold below the bio as a mailto link.",
    type: "text",
    page: "about",
    group: "about.director",
    gridColumn: "col-span-1",
    defaultValue: "keyanna@detroitcommunitywealth.org",
  },
];

// ─── Board of Directors — hideable ─────────────────────────────────────────

const aboutBoardData: TemplateField[] = [
  {
    key: "wealth.about.board-heading",
    label: "Board Heading",
    description: "Centered italic heading above the board member list.",
    type: "text",
    page: "about",
    group: "about.board",
    gridColumn: "col-span-full",
    defaultValue: "Board of Directors",
  },
  {
    key: "wealth.about.board-members",
    label: "Board Members",
    description:
      "Board member names (and role, if any), shown as uppercase letterspaced lines. Up to 12. Leave empty to use the built-in example board.",
    type: "list",
    page: "about",
    group: "about.board",
    gridColumn: "col-span-full",
    maxItems: 12,
    itemSchema: [
      {
        key: "name",
        label: "Name",
        type: "text",
        placeholder: "e.g. Gerrard Allen, Chair",
      },
    ],
  },
];

// ─── Closing contact CTA — hideable ────────────────────────────────────────

const aboutCtaData: TemplateField[] = [
  {
    key: "wealth.about.cta-label",
    label: "CTA Label",
    description: "Text for the quiet closing link to the Contact page.",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "Contact us »",
  },
  {
    key: "wealth.about.cta-url",
    label: "CTA Link",
    description: "Where the closing link sends visitors.",
    type: "url",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ─── Aggregated export ──────────────────────────────────────────────────────

export const wealthAboutData: TemplateField[] = [
  ...aboutHeroData,
  ...aboutDirectorData,
  ...aboutBoardData,
  ...aboutCtaData,
];

export const wealthAboutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "about.hero",
    title: "About DCWF",
    description: "Page heading and the three-paragraph story of DCWF",
    icon: "🌱",
    columns: 2,
  },
  {
    id: "about.director",
    title: "Director Spotlight",
    description: "Headshot, name/title, bio, and contact email",
    icon: "👤",
    columns: 2,
  },
  {
    id: "about.board",
    title: "Board of Directors",
    description: "Heading and the list of board member names",
    icon: "🧭",
    columns: 1,
  },
  {
    id: "about.cta",
    title: "Closing Contact Link",
    description: "Quiet closing link pointing at the Contact page",
    icon: "✉️",
    columns: 2,
  },
];

export const wealthAboutSections: TemplateSection[] = [
  {
    id: "about.hero",
    page: "about",
    title: "About DCWF",
    description: "Page heading and the three-paragraph story",
    groupIds: ["about.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "about.director",
    page: "about",
    title: "Director Spotlight",
    description: "Headshot, bio, and contact email for the Executive Director",
    groupIds: ["about.director"],
    order: 1,
    hideable: true,
  },
  {
    id: "about.board",
    page: "about",
    title: "Board of Directors",
    description: "Board member name list",
    groupIds: ["about.board"],
    order: 2,
    hideable: true,
  },
  {
    id: "about.cta",
    page: "about",
    title: "Closing Contact Link",
    description: "Quiet link to the Contact page",
    groupIds: ["about.cta"],
    order: 3,
    hideable: true,
  },
];
