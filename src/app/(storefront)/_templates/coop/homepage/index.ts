import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Homepage field module for `coop` (Building Cooperatively).
 *
 * The clone's homepage (`building-clone/src/app/page.tsx`, data-cid n48–n63)
 * has exactly two sections: a full-viewport parallax hero with one overline
 * slot (empty in the source) + one big statement, and a purely-decorative
 * empty white band beneath it that exists only to preserve spacing. There is
 * no third section — design.md's "Per-page section concepts → Homepage" is
 * authoritative and lists only these two.
 *
 * Aggregated into the root `coopData`/`coopFieldGroups`/`coopSections` by a
 * later phase (see `_templates/coop/index.ts` / `sections.ts` — both out of
 * this module's ownership).
 */

// ─── Hero ─────────────────────────────────────────────────────────────────────

const homepageHeroData: TemplateField[] = [
  {
    key: "coop.homepage.hero-image",
    label: "Hero Background Photo",
    description:
      "Full-viewport parallax photo behind the hero statement. The source site's own building photo is the default.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "/templates/coop/images/web_background.webp",
  },
  {
    key: "coop.homepage.hero-image-alt",
    label: "Hero Background Photo Alt Text",
    description: "Accessible description of the hero background photo.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "web_background.jpg",
  },
  {
    key: "coop.homepage.hero-overline",
    label: "Hero Overline",
    description:
      "Small uppercase label above the statement. Empty by default, matching the source site — the space above the statement is reserved either way, so leaving it blank is safe.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "coop.homepage.hero-statement",
    label: "Hero Statement",
    description:
      "The large statement overlaid on the hero photo — this is the page's main heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Building Cooperatively is a worker-owned cooperative specializing in historic restoration and construction. We hold ourselves to honoring and developing ethical business practices and providing competitive living wages to Detroiters.",
  },
];

// ─── Aggregated export ────────────────────────────────────────────────────────

// The "band" section (design.md: "White band — empty white section... no
// content") has no owner-editable fields — it is a pure spacing element, so
// no TemplateField exists with `group: "homepage.band"`. Its
// TemplateFieldGroup below still registers with a matching id (triple-match
// invariant) so the section rail/hotspot/eye-toggle work; the field panel
// renders an empty body for it, which is correct since there is nothing to
// edit (confirmed safe — `field-panel.tsx` skips zero-field groups without
// erroring).
export const coopHomepageData: TemplateField[] = [...homepageHeroData];

export const coopHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero",
    description:
      "Full-viewport parallax photo, optional overline label, and the big statement",
    icon: "🏚️",
    columns: 2,
  },
  {
    id: "homepage.band",
    title: "White Band",
    description:
      "Empty full-width spacing band beneath the hero, preserved from the source site — no content to edit, only hide/show.",
    icon: "▫️",
    columns: 1,
  },
];

// ─── Sections (visual render order) ──────────────────────────────────────────

export const coopHomepageSections: TemplateSection[] = [
  {
    id: "homepage.hero",
    page: "homepage",
    title: "Hero",
    description:
      "Full-viewport parallax photo behind the hero statement — the page's main heading",
    groupIds: ["homepage.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "homepage.band",
    page: "homepage",
    title: "White Band",
    description:
      "Empty spacing band between the hero and the footer — no content, just breathing room",
    groupIds: ["homepage.band"],
    order: 1,
    hideable: true,
  },
];
