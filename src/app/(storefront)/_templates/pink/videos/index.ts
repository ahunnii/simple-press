import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Videos page (`/videos`) fields for the `pink` template.
 *
 * Same shape and the same reasoning as `../events/index.ts`: these fields are
 * the CHROME around real `Video` records. The cards come from the DB
 * (`videos.getPublic`), synced from the owner's YouTube channels and
 * playlists — nothing here describes an individual video. An owner edits a
 * video, or overrides its title/description/thumbnail, in `/admin/videos`.
 *
 * PinkArt posts from a mix of her own channels and other people's channels
 * that feature her work, which is why the list group carries a channel-credit
 * toggle rather than assuming every clip is hers.
 *
 * The homepage's teaser counterpart is `homepage.videos` (see
 * `../homepage/index.ts`), which is a separate, separately-hideable section.
 */

// ── videos.header ─────────────────────────────────────────────────────────

const videosHeaderData: TemplateField[] = [
  {
    key: "pink.videos.header-heading",
    label: "Header Heading",
    description: "The H1 for the videos page.",
    type: "text",
    page: "videos",
    group: "videos.header",
    gridColumn: "col-span-1",
    defaultValue: "On video",
  },
  {
    key: "pink.videos.header-intro",
    label: "Header Intro",
    description: "One or two sentences under the heading.",
    type: "textarea",
    page: "videos",
    group: "videos.header",
    gridColumn: "col-span-full",
    defaultValue:
      "Make & takes, markets and the studio table. Some of these are ours; some were posted by the people who hosted us.",
  },
];

// ── videos.list ───────────────────────────────────────────────────────────

const videosListData: TemplateField[] = [
  {
    key: "pink.videos.list-show-channel",
    label: "Credit The Channel",
    description:
      "Show which YouTube channel posted each video. Worth leaving on when some of these were filmed by the people who hosted you; turn it off if everything here is from your own channel.",
    type: "boolean",
    page: "videos",
    group: "videos.list",
    gridColumn: "col-span-full",
    defaultValue: "true",
  },
  {
    key: "pink.videos.list-empty-heading",
    label: "Empty Heading",
    description: "Shown when nothing has been published yet.",
    type: "text",
    page: "videos",
    group: "videos.list",
    gridColumn: "col-span-1",
    defaultValue: "Nothing up yet",
  },
  {
    key: "pink.videos.list-empty-body",
    label: "Empty Body",
    description:
      "One or two lines under the empty-state heading. Give people somewhere else to go while the page is bare.",
    type: "textarea",
    page: "videos",
    group: "videos.list",
    gridColumn: "col-span-full",
    defaultValue:
      "New clips get posted here as they go up. In the meantime, the shop is always open.",
  },
  {
    key: "pink.videos.list-empty-cta-label",
    label: "Empty CTA Label",
    description: "Leave blank to hide the empty-state button.",
    type: "text",
    page: "videos",
    group: "videos.list",
    gridColumn: "col-span-1",
    defaultValue: "Browse the shop",
  },
  {
    key: "pink.videos.list-empty-cta-link",
    label: "Empty CTA Link",
    description: "Where the empty-state button goes.",
    type: "url",
    page: "videos",
    group: "videos.list",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

// ── videos.cta ────────────────────────────────────────────────────────────

const videosCtaData: TemplateField[] = [
  {
    key: "pink.videos.cta-heading",
    label: "CTA Heading",
    description: "Closing call-to-action heading.",
    type: "text",
    page: "videos",
    group: "videos.cta",
    gridColumn: "col-span-1",
    defaultValue: "Want a table like this one?",
  },
  {
    key: "pink.videos.cta-body",
    label: "CTA Body",
    description: "One or two sentences under the heading.",
    type: "textarea",
    page: "videos",
    group: "videos.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Make & takes travel — schools, churches, libraries, workplaces, back yards. Tell us the room and roughly how many people.",
  },
  {
    key: "pink.videos.cta-primary-label",
    label: "CTA Button Label",
    description: "Leave blank to hide the button.",
    type: "text",
    page: "videos",
    group: "videos.cta",
    gridColumn: "col-span-1",
    defaultValue: "Ask about hosting one",
  },
  {
    key: "pink.videos.cta-primary-link",
    label: "CTA Button Link",
    description: "Where the button goes.",
    type: "url",
    page: "videos",
    group: "videos.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ── Exports ───────────────────────────────────────────────────────────────

export const pinkVideosData: TemplateField[] = [
  ...videosHeaderData,
  ...videosListData,
  ...videosCtaData,
];

export const pinkVideosFieldGroups: TemplateFieldGroup[] = [
  {
    id: "videos.header",
    title: "Videos Header",
    description: "Breadcrumb, heading and intro for the videos page",
    icon: "📺",
    columns: 2,
  },
  {
    id: "videos.list",
    title: "Videos List",
    description: "The channel credit and the empty-state copy",
    icon: "🎬",
    columns: 2,
  },
  {
    id: "videos.cta",
    title: "Closing Call to Action",
    description: "Heading, body and one button",
    icon: "📣",
    columns: 2,
  },
];

export const pinkVideosSections: TemplateSection[] = [
  {
    id: "videos.header",
    page: "videos",
    title: "Videos Header",
    description: "Breadcrumb, heading and intro",
    groupIds: ["videos.header"],
    order: 0,
    hideable: false,
  },
  {
    id: "videos.list",
    page: "videos",
    title: "Videos List",
    description: "The grid of videos synced from your YouTube sources",
    groupIds: ["videos.list"],
    order: 1,
    hideable: false,
    links: [SECTION_LINKS.videos],
  },
  {
    id: "videos.cta",
    page: "videos",
    title: "Closing Call to Action",
    description: "Closing CTA panel under the grid",
    groupIds: ["videos.cta"],
    order: 2,
    hideable: true,
  },
];
