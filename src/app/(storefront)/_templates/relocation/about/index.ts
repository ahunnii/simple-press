import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Backstory (`/about`) field module for `relocation` (Handy Relocations).
 *
 * Covers design.md → "Per-page section concepts → Backstory": wave hero, the
 * five-strip crew collage, and the three-paragraph story (planning/heavy
 * lifting · founders + Clear Soul Forces link · Lowman pull-quote) with the
 * second photo. The credentials band that closes the page is global
 * (`global.credentials`, see `../layout/index.ts`) and renders its FULL
 * heading here (no homepage-style override).
 *
 * All copy is the source about-us page verbatim (clone
 * `about-us/page.tsx`), cross-checked against
 * docs/relocation/"Backstory _ Handy Relocations.jpeg".
 *
 * `story-paragraph-2` contains a mid-sentence link ("Clear Soul Forces" →
 * https://forceswithyou.com/). Per field-conventions.md this is split into
 * three fields (`-before` / `-link-label` + `-link-url` / `-after`) rather
 * than one textarea, so the link target and label stay independently
 * editable and the page component can annotate each fragment with its own
 * `fieldAttr` (a `fieldAttr` may only sit on an element whose textContent is
 * exactly one field's value — see visual-editor-wiring.md §3).
 *
 * ⚠️ ASSET FILENAMES ARE MISLEADING. The extractor named the two Backstory
 * images by their order in the clone's DOM, not by their content
 * (`build/asset-manifest.md` repeats the same guess):
 *   - `backstory-photo.webp`   (828×482, landscape) IS the five-strip crew
 *     collage — the image the reference screenshot shows below the hero.
 *   - `backstory-collage.webp` (828×1085, portrait) is the single mover
 *     kneeling by a loaded U-Haul truck — the clone circle-clipped it into
 *     the hero, where it never rendered (deviation #7).
 * The defaults below are mapped by CONTENT, per design.md's "screenshots
 * win" tiebreak: collage section → `backstory-photo.webp`, story photo →
 * `backstory-collage.webp`. Do not "fix" them back to matching names.
 */

// ─── about.hero ──────────────────────────────────────────────────────────────

const aboutHeroData: TemplateField[] = [
  {
    key: "relocation.about.hero-heading",
    label: "Hero Heading",
    description: "The big white headline on the terracotta wave hero.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "Backstory",
  },
  {
    key: "relocation.about.hero-subheading",
    label: "Hero Paragraph",
    description:
      "Short reassurance paragraph under the hero headline. Leave blank to hide it.",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Moving to a new place can be stressful, but moving your belongings shouldn’t be! At Handy Relocations, our moving and logistics teams are standing by and ready to take the stress out of your move! Whether it’s across the city or the country, we’re here for you every step of the way!",
  },
  {
    key: "relocation.about.hero-cta-label",
    label: "Hero Button Label",
    description:
      "Outlined button on the hero. It dials the same number as the header call button. Leave blank to hide the button.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "CALL US TODAY",
  },
];

// ─── about.collage ───────────────────────────────────────────────────────────

const aboutCollageData: TemplateField[] = [
  {
    key: "relocation.about.collage-image",
    label: "Crew Collage Photo",
    description:
      "The five-strip crew photo below the hero. Leave blank to hide this section.",
    type: "image",
    page: "about",
    group: "about.collage",
    gridColumn: "col-span-1",
    // Content, not filename: this IS the five-strip collage. See the header note.
    defaultValue: "/templates/relocation/images/backstory-photo.webp",
  },
  {
    key: "relocation.about.collage-image-alt",
    label: "Crew Collage Alt Text",
    description: "Accessible description of the crew collage photo.",
    type: "text",
    page: "about",
    group: "about.collage",
    gridColumn: "col-span-1",
    defaultValue:
      "Five photos of the Handy Relocations crew and their gear on moving day",
  },
];

// ─── about.story ─────────────────────────────────────────────────────────────

const aboutStoryData: TemplateField[] = [
  {
    key: "relocation.about.story-paragraph-1",
    label: "Story — Paragraph 1",
    description: "First paragraph: planning and heavy lifting.",
    type: "textarea",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue:
      "Moving—whether across town or to a completely different state—always requires a certain level of planning and heavy lifting. Equipped with a passion for logistics and an enduring entrepreneurial spirit, Handy Relocations will seamlessly get you from point A to point B, and anywhere in between.",
  },
  {
    key: "relocation.about.story-paragraph-2-before",
    label: "Story — Paragraph 2 (before the link)",
    description:
      "Second paragraph, up to (not including) the 'Clear Soul Forces' link. A space is added before the link automatically, so you don't need a trailing one.",
    type: "textarea",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue:
      "Based in Detroit, but working with clients across the country, Handy Relocations is the brainchild of Jarrel Lowman and Emile Vincent. As the founders of Handy Relocations, Lowman and Vincent bring an unmatched relentlessness to the business of moving, logistics, and transportation. This is because the two business partners have been in the trenches making a name for themselves in music for well over a decade. As rappers in the Detroit hip hop group ",
  },
  {
    key: "relocation.about.story-paragraph-2-link-label",
    label: "Story — Link Label",
    description:
      "Text of the inline link in paragraph 2. Leave blank to render this as plain text with no link.",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
    defaultValue: "Clear Soul Forces",
  },
  {
    key: "relocation.about.story-paragraph-2-link-url",
    label: "Story — Link URL",
    description: "Where the 'Clear Soul Forces' link opens (new tab).",
    type: "url",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
    defaultValue: "https://forceswithyou.com/",
  },
  {
    key: "relocation.about.story-paragraph-2-after",
    label: "Story — Paragraph 2 (after the link)",
    description:
      "Rest of the second paragraph, continuing right after the link with no leading space needed.",
    type: "textarea",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue:
      ", and as solo artists, Lowman (Flowz4Daze) and Vincent have proven themselves to be in the top tier of the Motor City’s hip hop scene. So, what does grinding-it-out as independent musicians have to do with running a moving company?",
  },
  {
    key: "relocation.about.story-quote",
    label: "Story — Lowman Quote",
    description: "The closing Jarrel Lowman pull-quote paragraph.",
    type: "textarea",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue:
      "“I’ve always had a job and made music at the same time,” explains Lowman. “Starting Handy Relocations with Emile let me reclaim my time and not have to ask permission to make the moves I need to make. Moving and transportation is an industry that doesn’t stop, and I feel like it helps keep me sharp mentally and physically. When you’re running a business, making sure the client is walking away with the best experience possible is the bottom-line. This is true whether we’re talking music or moving.”",
  },
  {
    key: "relocation.about.story-photo",
    label: "Story Photo",
    description: "Photo under the story paragraphs. Leave blank to hide it.",
    type: "image",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
    // Content, not filename: this IS the portrait mover shot. See the header note.
    defaultValue: "/templates/relocation/images/backstory-collage.webp",
  },
  {
    key: "relocation.about.story-photo-alt",
    label: "Story Photo Alt Text",
    description: "Accessible description of the story photo.",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
    defaultValue:
      "A Handy Relocations mover resting against a moving truck loaded with boxes and furniture",
  },
];

// ─── Exports ─────────────────────────────────────────────────────────────────

export const relocationAboutData: TemplateField[] = [
  ...aboutHeroData,
  ...aboutCollageData,
  ...aboutStoryData,
];

export const relocationAboutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "about.hero",
    title: "Hero",
    description: "Terracotta wave hero: headline, paragraph and call button",
    icon: "🌊",
    columns: 2,
  },
  {
    id: "about.collage",
    title: "Crew Collage",
    description: "The five-strip photo of the crew below the hero",
    icon: "📸",
    columns: 2,
  },
  {
    id: "about.story",
    title: "Our Story",
    description:
      "The three-paragraph backstory, the Clear Soul Forces link and the closing photo",
    icon: "📖",
    columns: 2,
  },
];

export const relocationAboutSections: TemplateSection[] = [
  {
    id: "about.hero",
    page: "about",
    title: "Hero",
    description: "Wave hero with the headline, paragraph and call button",
    groupIds: ["about.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "about.collage",
    page: "about",
    title: "Crew Collage",
    description: "Five-strip photo of the crew below the hero",
    groupIds: ["about.collage"],
    order: 1,
    hideable: true,
  },
  {
    id: "about.story",
    page: "about",
    title: "Our Story",
    description: "The backstory paragraphs, link and closing photo",
    groupIds: ["about.story"],
    order: 2,
    hideable: false,
  },
];
