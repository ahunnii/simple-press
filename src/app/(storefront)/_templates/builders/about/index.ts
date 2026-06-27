import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── About Page: Hero ─────────────────────────────────────────────────────────

const aboutHeroData: TemplateField[] = [
  {
    key: "builders.about.hero-title",
    label: "Hero Title",
    description: "Large display headline for the about page hero",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue: "Building Cooperatively",
    placeholder: "Building Cooperatively",
  },
  {
    key: "builders.about.hero-subtitle",
    label: "Hero Subtitle",
    description: "Introductory paragraph below the hero headline (left-bordered)",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "We are a worker-owned restoration cooperative based in Detroit. We believe in collective ownership, rigorous craftsmanship, and restoring the architectural fabric of our city without erasing its history.",
    placeholder: "Short intro about your cooperative…",
  },
  {
    key: "builders.about.hero-image",
    label: "Hero Image",
    description: "Image displayed on the right side of the hero (optional)",
    type: "image",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
];

// ─── About Page: Story ────────────────────────────────────────────────────────

const aboutStoryData: TemplateField[] = [
  {
    key: "builders.about.story-heading",
    label: "Story Heading",
    description: "Section heading for the brand story",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "Our Detroit Story",
    placeholder: "Our Detroit Story",
  },
  {
    key: "builders.about.story-body-1",
    label: "Story Body (Paragraph 1)",
    description: "First paragraph of the brand story",
    type: "textarea",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue:
      "Detroit's architectural heritage is defined by resilience. Our cooperative was founded on the principle that the hands restoring these structures should own the labor and the outcomes. We are not developers; we are craftspeople.",
    placeholder: "Tell your story here…",
  },
  {
    key: "builders.about.story-body-2",
    label: "Story Body (Paragraph 2)",
    description: "Second paragraph of the brand story",
    type: "textarea",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue:
      "By operating as a cooperative, we ensure fair wages, shared equity, and a commitment to quality over speed. Every brick repointed, every joist reinforced, is a decision made collectively.",
    placeholder: "Continue your story here…",
  },
];

// ─── About Page: Team ─────────────────────────────────────────────────────────

const aboutTeamData: TemplateField[] = [
  {
    key: "builders.about.team-heading",
    label: "Team Section Heading",
    description: "Section heading for the team member grid",
    type: "text",
    page: "about",
    group: "about.team",
    gridColumn: "col-span-full",
    defaultValue: "Meet the Cooperative",
    placeholder: "Meet the Cooperative",
  },
  {
    key: "builders.about.team-members",
    label: "Team Members",
    description:
      "List of cooperative members shown in the card grid. Falls back to default members when empty.",
    type: "list",
    page: "about",
    group: "about.team",
    gridColumn: "col-span-full",
    maxItems: 12,
    itemSchema: [
      {
        key: "name",
        label: "Name",
        type: "text",
        placeholder: "e.g. Sarah Jenkins",
      },
      {
        key: "role",
        label: "Role / Specialty",
        type: "text",
        placeholder: "e.g. Masonry Specialist",
      },
      {
        key: "bio",
        label: "Bio",
        type: "textarea",
        placeholder: "Short bio about this member…",
      },
      {
        key: "image",
        label: "Member Photo",
        type: "image",
        placeholder: "",
      },
    ],
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const buildersAboutData: TemplateField[] = [
  ...aboutHeroData,
  ...aboutStoryData,
  ...aboutTeamData,
];

export const buildersAboutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "about.hero",
    title: "About Hero",
    description: "Large headline, intro paragraph, and optional hero image",
    icon: "🏛️",
    columns: 1,
  },
  {
    id: "about.story",
    title: "Our Story",
    description: "Two-column brand narrative section",
    icon: "📖",
    columns: 1,
  },
  {
    id: "about.team",
    title: "Team Members",
    description:
      "Cooperative member card grid. Photos shown in full color; gently zoom on hover. Falls back to built-in defaults when empty.",
    icon: "🤝",
    columns: 1,
  },
];

// ─── Default Team Members (Stitch reference data) ─────────────────────────────

export const DEFAULT_TEAM_MEMBERS: Array<{
  name: string;
  role: string;
  bio: string;
  image: string;
}> = [
  {
    name: "Sarah Jenkins",
    role: "Masonry Specialist",
    bio: "Focuses on historic mortar matching and structural brick repair. 15 years in historic preservation.",
    image: "",
  },
  {
    name: "David Rossi",
    role: "Lead Carpenter",
    bio: "Specializes in reclaimed timber sourcing and structural wood framing for industrial conversions.",
    image: "",
  },
  {
    name: "Marcus Vance",
    role: "Metal Fabrication",
    bio: "Expert in restoring original ironwork and fabricating custom structural steel elements.",
    image: "",
  },
  {
    name: "Elena Torres",
    role: "Plaster Specialist",
    bio: "Master of traditional lath and plaster techniques, essential for period-accurate interior restoration.",
    image: "",
  },
  {
    name: "James Miller",
    role: "Site Manager",
    bio: "Coordinates all trades on site, ensuring cooperative standards and safety protocols are met.",
    image: "",
  },
  {
    name: "Kevin Chou",
    role: "Lead Mason",
    bio: "Directs the masonry team, specializing in large-scale structural stabilization of historic facades.",
    image: "",
  },
];
