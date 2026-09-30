import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const eventsHeroData: TemplateField[] = [
  {
    key: "default.events.hero-eyebrow",
    label: "Small label",
    description:
      "Short text above the page heading on the Events page. Leave blank to hide.",
    type: "text",
    page: "events",
    group: "events.hero",
    defaultValue: "What's on",
    placeholder: "What's on",
  },
  {
    key: "default.events.hero-heading",
    label: "Heading",
    description: "Main heading at the top of the Events page.",
    type: "text",
    page: "events",
    group: "events.hero",
    gridColumn: "col-span-full",
    defaultValue: "Events",
    placeholder: "Events",
  },
  {
    key: "default.events.hero-tagline",
    label: "Intro text",
    description: "Short line below the heading. Leave blank to hide.",
    type: "textarea",
    page: "events",
    group: "events.hero",
    gridColumn: "col-span-full",
    defaultValue: "Dates, times, and where to find us.",
    placeholder: "Dates, times, and where to find us.",
  },
];

const eventsListData: TemplateField[] = [
  {
    key: "default.events.list-link-fallback-label",
    label: "Default link label",
    description:
      "Label used for an event's external link when that event doesn't set its own link label.",
    type: "text",
    page: "events",
    group: "events.list",
    defaultValue: "More details",
    placeholder: "More details",
  },
  {
    key: "default.events.list-empty-heading",
    label: "Empty state heading",
    description: "Heading shown on the Events page when there are no upcoming events.",
    type: "text",
    page: "events",
    group: "events.list",
    defaultValue: "No upcoming events",
    placeholder: "No upcoming events",
  },
  {
    key: "default.events.list-empty-body",
    label: "Empty state message",
    description:
      "Line below the empty-state heading when there are no upcoming events. Leave blank to hide.",
    type: "textarea",
    page: "events",
    group: "events.list",
    gridColumn: "col-span-full",
    defaultValue: "Check back soon — new dates are posted here.",
    placeholder: "One short sentence",
  },
];

const eventsCtaData: TemplateField[] = [
  {
    key: "default.events.cta-heading",
    label: "Heading",
    description: "Heading for the bottom call-to-action strip.",
    type: "text",
    page: "events",
    group: "events.cta",
    gridColumn: "col-span-full",
    defaultValue: "Want us at your event?",
    placeholder: "Want us at your event?",
  },
  {
    key: "default.events.cta-body",
    label: "Body text",
    description:
      "Line below the heading in the bottom call-to-action strip. Leave blank to hide.",
    type: "textarea",
    page: "events",
    group: "events.cta",
    gridColumn: "col-span-full",
    defaultValue: "Tell us the room and roughly how many people.",
    placeholder: "One short sentence",
  },
  {
    key: "default.events.cta-button-text",
    label: "Button text",
    description: "Label on the bottom call-to-action button.",
    type: "text",
    page: "events",
    group: "events.cta",
    defaultValue: "Get in touch",
    placeholder: "Get in touch",
  },
  {
    key: "default.events.cta-button-link",
    label: "Button link",
    description: "Where the bottom button goes, e.g. /contact.",
    type: "url",
    page: "events",
    group: "events.cta",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
];

export const defaultEventsData: TemplateField[] = [
  ...eventsHeroData,
  ...eventsListData,
  ...eventsCtaData,
];

export const defaultEventsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "events.hero",
    title: "Hero",
    description: "Page heading and intro text.",
    icon: "🎫",
    columns: 2,
  },
  {
    id: "events.list",
    title: "List",
    description: "Fallback link label and empty-state copy.",
    icon: "📅",
    columns: 2,
  },
  {
    id: "events.cta",
    title: "Closing banner",
    description: "Bottom banner inviting visitors to get in touch.",
    icon: "👆",
    columns: 2,
  },
];
