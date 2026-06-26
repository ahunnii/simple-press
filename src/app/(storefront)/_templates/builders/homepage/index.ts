import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Homepage: Hero ───────────────────────────────────────────────────────────

const homepageHeroData: TemplateField[] = [
  {
    key: "builders.homepage.hero-title",
    label: "Hero Title",
    description: "Large display headline for the hero section",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "Restoration, Built on Ownership.",
    placeholder: "Your bold headline here",
  },
  {
    key: "builders.homepage.hero-subtitle",
    label: "Hero Subtitle",
    description: "Descriptive text below the hero headline",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "We are a worker-owned cooperative dedicated to historical preservation, meticulous craftsmanship, and community wealth building. Quality work, rooted in shared equity.",
    placeholder: "Short description of your co-op",
  },
  {
    key: "builders.homepage.hero-bg-image",
    label: "Hero Background Image",
    description: "Full-viewport background image for the hero section",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "builders.homepage.hero-cta1-label",
    label: "Primary CTA Label",
    description: "Text for the primary (accent) call-to-action button",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Explore Our Work",
    placeholder: "Explore Our Work",
  },
  {
    key: "builders.homepage.hero-cta1-href",
    label: "Primary CTA Link",
    description: "URL for the primary call-to-action button",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
  {
    key: "builders.homepage.hero-cta2-label",
    label: "Secondary CTA Label",
    description: "Text for the secondary (ghost) call-to-action button",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Learn About The Co-op",
    placeholder: "Learn About The Co-op",
  },
  {
    key: "builders.homepage.hero-cta2-href",
    label: "Secondary CTA Link",
    description: "URL for the secondary call-to-action button",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/about",
    placeholder: "/about",
  },
];

// ─── Homepage: Story ──────────────────────────────────────────────────────────

const homepageStoryData: TemplateField[] = [
  {
    key: "builders.homepage.story-heading",
    label: "Story Heading",
    description: "Section heading for the brand story / ownership split",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue: "Ownership Means Care",
    placeholder: "Ownership Means Care",
  },
  {
    key: "builders.homepage.story-body-1",
    label: "Story Body (Paragraph 1)",
    description: "First paragraph of the brand story",
    type: "textarea",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue:
      "Every hand that touches your project holds equity in our collective. This isn't just a job; it's our shared enterprise. The cooperative model ensures that profits stay with the workers and within the community, fostering a level of dedication and meticulous attention to detail that standard contracting simply cannot replicate.",
    placeholder: "Tell your story here…",
  },
  {
    key: "builders.homepage.story-body-2",
    label: "Story Body (Paragraph 2)",
    description: "Second paragraph of the brand story",
    type: "textarea",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue:
      "By eliminating the traditional hierarchy, we empower our artisans to make decisions that prioritize quality over speed, sustainability over quick fixes, and legacy over immediate margins. Our work is a testament to the enduring spirit of community labor.",
    placeholder: "Continue your story here…",
  },
  {
    key: "builders.homepage.story-image",
    label: "Story Image",
    description:
      "Portrait or candid image for the story section (grayscale by default, color on hover)",
    type: "image",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
];

// ─── Homepage: Projects ───────────────────────────────────────────────────────

const homepageProjectsData: TemplateField[] = [
  {
    key: "builders.homepage.projects-heading",
    label: "Projects Section Heading",
    description: "Section heading for the recent projects bento grid",
    type: "text",
    page: "homepage",
    group: "homepage.projects",
    gridColumn: "col-span-full",
    defaultValue: "Recent Restorations",
    placeholder: "Recent Restorations",
  },
  {
    key: "builders.homepage.projects-view-all-href",
    label: "View All Projects Link",
    description: "URL for the 'View All Projects' link",
    type: "url",
    page: "homepage",
    group: "homepage.projects",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
  {
    key: "builders.homepage.projects",
    label: "Projects List",
    description:
      "List of recent projects shown in the bento grid. The first item becomes the large 2×2 feature card.",
    type: "list",
    page: "homepage",
    group: "homepage.projects",
    gridColumn: "col-span-full",
    maxItems: 5,
    itemSchema: [
      {
        key: "category",
        label: "Category",
        type: "text",
        placeholder: "e.g. Masonry & Woodwork",
      },
      {
        key: "title",
        label: "Project Title",
        type: "text",
        placeholder: "e.g. The Fisher Block Revival",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Short description of the project…",
      },
      {
        key: "image",
        label: "Project Image",
        type: "image",
        placeholder: "",
      },
      {
        key: "featured",
        label: "Featured (2×2 large card)",
        type: "boolean",
        placeholder: "true",
      },
    ],
  },
];

// ─── Homepage: CTA ────────────────────────────────────────────────────────────

const homepageCtaData: TemplateField[] = [
  {
    key: "builders.homepage.cta-heading",
    label: "CTA Heading",
    description: "Large headline for the bottom call-to-action section",
    type: "text",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-full",
    defaultValue: "Ready to Start Your Project?",
    placeholder: "Ready to Start Your Project?",
  },
  {
    key: "builders.homepage.cta-body",
    label: "CTA Body",
    description: "Descriptive text below the CTA heading",
    type: "textarea",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Partner with a team that treats your building's history with respect and your investment with care. Let's discuss your preservation goals.",
    placeholder: "Describe how to get started…",
  },
  {
    key: "builders.homepage.cta-button-label",
    label: "CTA Button Label",
    description: "Text for the call-to-action button",
    type: "text",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-1",
    defaultValue: "Contact The Cooperative",
    placeholder: "Contact The Cooperative",
  },
  {
    key: "builders.homepage.cta-button-href",
    label: "CTA Button Link",
    description: "URL for the call-to-action button",
    type: "url",
    page: "homepage",
    group: "homepage.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const buildersHomepageData: TemplateField[] = [
  ...homepageHeroData,
  ...homepageStoryData,
  ...homepageProjectsData,
  ...homepageCtaData,
];

export const buildersHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero Section",
    description:
      "Full-viewport hero with background image, headline, and dual CTAs",
    icon: "🏗️",
    columns: 2,
  },
  {
    id: "homepage.story",
    title: "Story / Ownership Section",
    description: "Split-layout brand story with image and body copy",
    icon: "🤝",
    columns: 1,
  },
  {
    id: "homepage.projects",
    title: "Recent Projects Grid",
    description:
      "Bento-style grid of recent projects (first item is the large feature card)",
    icon: "🧱",
    columns: 1,
  },
  {
    id: "homepage.cta",
    title: "Call to Action Section",
    description: "Bottom CTA section with headline, body, and button",
    icon: "📞",
    columns: 2,
  },
];
