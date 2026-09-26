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
    label: "Heading",
    description: "Main heading at the top of the events page.",
    type: "text",
    page: "events",
    group: "events.header",
    gridColumn: "col-span-1",
    defaultValue: "On the calendar",
  },
  {
    key: "pink.events.header-intro",
    label: "Intro text",
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
    label: "Flier hint",
    description:
      "Small line above the cards, shown only when at least one event has a flier (photo or video) uploaded. Leave blank to hide it.",
    type: "text",
    page: "events",
    group: "events.list",
    gridColumn: "col-span-full",
    defaultValue: "Tap a flier to read it full size",
  },
  {
    key: "pink.events.list-link-fallback-label",
    label: "Default link text",
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
    label: "Empty list heading",
    description: "Shown when nothing is scheduled yet.",
    type: "text",
    page: "events",
    group: "events.list",
    gridColumn: "col-span-1",
    defaultValue: "Nothing on the calendar yet",
  },
  {
    key: "pink.events.list-empty-body",
    label: "Empty list body",
    description:
      "One or two lines under the empty-list heading. Give people somewhere else to go while the calendar is bare.",
    type: "textarea",
    page: "events",
    group: "events.list",
    gridColumn: "col-span-full",
    defaultValue:
      "New dates get posted here as soon as they're set. In the meantime, the shop is always open.",
  },
  {
    key: "pink.events.list-empty-cta-label",
    label: "Empty list button text",
    description: "Leave blank to hide the button.",
    type: "text",
    page: "events",
    group: "events.list",
    gridColumn: "col-span-1",
    defaultValue: "Browse the shop",
  },
  {
    key: "pink.events.list-empty-cta-link",
    label: "Empty list button link",
    description: "Where the empty-list button goes.",
    type: "url",
    page: "events",
    group: "events.list",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
  },
];

// ── events.detail ─────────────────────────────────────────────────────────
//
// Chrome around ONE event on its own page (`/events/<slug>`): the calendar
// leaf's row labels, the past-event badge, the QR caption and the back link.
// The event itself (name, date, flier, blurb, link) is the DB record. These
// carry `page: "events"` because the editor previews the events page, not an
// individual event; the hotspot is on the detail route.

const eventsDetailData: TemplateField[] = [
  {
    key: "pink.events.detail-when-label",
    label: "“When” label",
    description: "Row label beside the full date on an event's page.",
    type: "text",
    page: "events",
    group: "events.detail",
    gridColumn: "col-span-1",
    defaultValue: "When",
  },
  {
    key: "pink.events.detail-where-label",
    label: "“Where” label",
    description:
      "Row label beside the location. The row hides when an event has no location.",
    type: "text",
    page: "events",
    group: "events.detail",
    gridColumn: "col-span-1",
    defaultValue: "Where",
  },
  {
    key: "pink.events.detail-cost-label",
    label: "“Cost” label",
    description:
      "Row label beside the price line. The row hides when an event has no price set.",
    type: "text",
    page: "events",
    group: "events.detail",
    gridColumn: "col-span-1",
    defaultValue: "Cost",
  },
  {
    key: "pink.events.detail-past-badge",
    label: "Past-event badge text",
    description: "Small badge on the calendar leaf once an event is over.",
    type: "text",
    page: "events",
    group: "events.detail",
    gridColumn: "col-span-1",
    defaultValue: "This one’s over",
  },
  {
    key: "pink.events.detail-scan-label",
    label: "QR caption",
    description:
      "Small label beside the QR code, shown on events where you turned on “Show a scannable QR code”.",
    type: "text",
    page: "events",
    group: "events.detail",
    gridColumn: "col-span-1",
    defaultValue: "Scan to open",
  },
  {
    key: "pink.events.detail-back-label",
    label: "Back link text",
    description: "Link back to the events page, shown after the details.",
    type: "text",
    page: "events",
    group: "events.detail",
    gridColumn: "col-span-1",
    defaultValue: "All events",
  },
];

// ── events.cta ────────────────────────────────────────────────────────────

const eventsCtaData: TemplateField[] = [
  {
    key: "pink.events.cta-heading",
    label: "Heading",
    description: "Heading in the closing panel at the bottom of the page.",
    type: "text",
    page: "events",
    group: "events.cta",
    gridColumn: "col-span-1",
    defaultValue: "Want one in your room?",
  },
  {
    key: "pink.events.cta-body",
    label: "Body text",
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
    label: "Button text",
    description: "Leave blank to hide the button.",
    type: "text",
    page: "events",
    group: "events.cta",
    gridColumn: "col-span-1",
    defaultValue: "Ask about hosting one",
  },
  {
    key: "pink.events.cta-primary-link",
    label: "Button link",
    description: "Where the button goes.",
    type: "url",
    page: "events",
    group: "events.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
  {
    key: "pink.events.cta-image-1",
    label: "Image 1",
    description:
      "Left image in the closing panel's image pair. Leave both images blank to run the panel as text only.",
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
    label: "Image 2",
    description:
      "Right image in the closing panel's image pair. Leave both images blank to run the panel as text only.",
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
  ...eventsDetailData,
  ...eventsCtaData,
];

export const pinkEventsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "events.header",
    title: "Header",
    description: "Heading and intro text for the events page.",
    icon: "🗓️",
    columns: 2,
  },
  {
    id: "events.list",
    title: "Events list",
    description: "Flier hint, the default link text, and the empty-list copy.",
    icon: "🎫",
    columns: 2,
  },
  {
    id: "events.detail",
    title: "Event page",
    description:
      "Labels on each event's own page — the calendar leaf rows, the past badge, the QR caption and the back link.",
    icon: "📅",
    columns: 2,
  },
  {
    id: "events.cta",
    title: "Closing banner",
    description: "Heading, body, one button and an optional image pair.",
    icon: "📣",
    columns: 2,
  },
];

export const pinkEventsSections: TemplateSection[] = [
  {
    id: "events.header",
    page: "events",
    title: "Header",
    description: "Heading and intro text for the events page.",
    groupIds: ["events.header"],
    order: 0,
    hideable: false,
  },
  {
    id: "events.list",
    page: "events",
    title: "Events list",
    description: "The grid of dated events you've published in Events.",
    groupIds: ["events.list"],
    order: 1,
    hideable: false,
    links: [SECTION_LINKS.events],
  },
  {
    id: "events.detail",
    page: "events",
    title: "Event page",
    description:
      "Row labels, past badge, QR caption and back link on each event's own page.",
    groupIds: ["events.detail"],
    order: 2,
    hideable: false,
    links: [SECTION_LINKS.events],
  },
  {
    id: "events.cta",
    page: "events",
    title: "Closing banner",
    description:
      "Closing panel with an optional image pair — also closes each event's own page.",
    groupIds: ["events.cta"],
    order: 3,
    hideable: true,
  },
];
