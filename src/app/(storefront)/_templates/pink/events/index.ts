import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

/**
 * Events index page (`/events`) fields for the `pink` template.
 *
 * These fields are the CHROME around real, dated `Event` records — the cards
 * themselves come from the DB (`events.getUpcomingPublic`), so nothing here
 * describes an individual event. An owner edits an event in
 * `/admin/events`; the copy below is the frame it sits in.
 *
 * NOT to be confused with the homepage's `homepage.events` band ("Make &
 * Takes"), which is evergreen, field-driven and deliberately date-free. The
 * homepage's DB-backed counterpart to this page is `homepage.upcoming`.
 */

// ── events.header ─────────────────────────────────────────────────────────

const eventsHeaderData: TemplateField[] = [
  {
    key: "pink.events.header-heading",
    label: "Header Heading",
    description: "The H1 for the events page.",
    type: "text",
    page: "events",
    group: "events.header",
    gridColumn: "col-span-1",
    defaultValue: "On the calendar",
  },
  {
    key: "pink.events.header-intro",
    label: "Header Intro",
    description: "One or two sentences under the heading.",
    type: "textarea",
    page: "events",
    group: "events.header",
    gridColumn: "col-span-full",
    defaultValue:
      "Markets, make & takes and studio dates. Tap a flier to see it full size.",
  },
];

// ── events.list ───────────────────────────────────────────────────────────

const eventsListData: TemplateField[] = [
  {
    key: "pink.events.list-flier-hint",
    label: "Flier Hint",
    description:
      "Small line above the cards, shown only when at least one event has a flier uploaded. Leave blank to hide it.",
    type: "text",
    page: "events",
    group: "events.list",
    gridColumn: "col-span-full",
    defaultValue: "Tap a flier to read it full size",
  },
  {
    key: "pink.events.list-link-fallback-label",
    label: "Default Link Label",
    description:
      "Button text on an event's outbound link when that event doesn't set a label of its own.",
    type: "text",
    page: "events",
    group: "events.list",
    gridColumn: "col-span-1",
    defaultValue: "Details & tickets",
  },
  {
    key: "pink.events.list-empty-heading",
    label: "Empty Heading",
    description: "Shown when nothing is scheduled yet.",
    type: "text",
    page: "events",
    group: "events.list",
    gridColumn: "col-span-1",
    defaultValue: "Nothing on the calendar yet",
  },
  {
    key: "pink.events.list-empty-body",
    label: "Empty Body",
    description:
      "One or two lines under the empty-state heading. Give people somewhere else to go while the calendar is bare.",
    type: "textarea",
    page: "events",
    group: "events.list",
    gridColumn: "col-span-full",
    defaultValue:
      "New dates get posted here as soon as they're set. In the meantime, the shop is always open.",
  },
  {
    key: "pink.events.list-empty-cta-label",
    label: "Empty CTA Label",
    description: "Leave blank to hide the empty-state button.",
    type: "text",
    page: "events",
    group: "events.list",
    gridColumn: "col-span-1",
    defaultValue: "Browse the shop",
  },
  {
    key: "pink.events.list-empty-cta-link",
    label: "Empty CTA Link",
    description: "Where the empty-state button goes.",
    type: "url",
    page: "events",
    group: "events.list",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

// ── events.cta ────────────────────────────────────────────────────────────

const eventsCtaData: TemplateField[] = [
  {
    key: "pink.events.cta-heading",
    label: "CTA Heading",
    description: "Closing call-to-action heading.",
    type: "text",
    page: "events",
    group: "events.cta",
    gridColumn: "col-span-1",
    defaultValue: "Want one in your room?",
  },
  {
    key: "pink.events.cta-body",
    label: "CTA Body",
    description: "One or two sentences under the heading.",
    type: "textarea",
    page: "events",
    group: "events.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Make & takes travel — schools, churches, libraries, workplaces, back yards.",
  },
  {
    key: "pink.events.cta-primary-label",
    label: "CTA Button Label",
    description: "Leave blank to hide the button.",
    type: "text",
    page: "events",
    group: "events.cta",
    gridColumn: "col-span-1",
    defaultValue: "Ask about hosting one",
  },
  {
    key: "pink.events.cta-primary-link",
    label: "CTA Button Link",
    description: "Where the button goes.",
    type: "url",
    page: "events",
    group: "events.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
  {
    key: "pink.events.cta-image-1",
    label: "CTA Image 1",
    description:
      "Left image in the closing CTA's 2-up pair. Leave both blank and the panel runs full width as copy only.",
    type: "image",
    page: "events",
    group: "events.cta",
    gridColumn: "col-span-1",
    // Empty, not "/placeholder.svg": pink has its own empty-image treatment and
    // the closing panel simply drops the image column when neither is set
    // (audit 2026-07-31, P2-7).
    defaultValue: "",
  },
  {
    key: "pink.events.cta-image-2",
    label: "CTA Image 2",
    description:
      "Right image in the closing CTA's 2-up pair. Leave both blank and the panel runs full width as copy only.",
    type: "image",
    page: "events",
    group: "events.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
];

// ── Exports ───────────────────────────────────────────────────────────────

export const pinkEventsData: TemplateField[] = [
  ...eventsHeaderData,
  ...eventsListData,
  ...eventsCtaData,
];

export const pinkEventsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "events.header",
    title: "Events Header",
    description: "Breadcrumb, heading and intro for the events page",
    icon: "🗓️",
    columns: 2,
  },
  {
    id: "events.list",
    title: "Events List",
    description: "Flier hint, the default link label, and the empty-state copy",
    icon: "🎫",
    columns: 2,
  },
  {
    id: "events.cta",
    title: "Closing Call to Action",
    description: "Heading, body, one button and an optional 2-up image pair",
    icon: "📣",
    columns: 2,
  },
];

export const pinkEventsSections: TemplateSection[] = [
  {
    id: "events.header",
    page: "events",
    title: "Events Header",
    description: "Breadcrumb, heading and intro",
    groupIds: ["events.header"],
    order: 0,
    hideable: false,
  },
  {
    id: "events.list",
    page: "events",
    title: "Events List",
    description: "The grid of dated events you've published in Events",
    groupIds: ["events.list"],
    order: 1,
    hideable: false,
    links: [SECTION_LINKS.events],
  },
  {
    id: "events.cta",
    page: "events",
    title: "Closing Call to Action",
    description: "Closing CTA panel with an optional 2-up image pair",
    groupIds: ["events.cta"],
    order: 2,
    hideable: true,
  },
];
