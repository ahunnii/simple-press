import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const eventsHeroData: TemplateField[] = [
  {
    key: "default.events.hero-eyebrow",
    label: "Hero Eyebrow",
    description: "Small label above the page heading",
    type: "text",
    page: "events",
    group: "events.hero",
    defaultValue: "What's on",
    placeholder: "What's on",
  },
  {
    key: "default.events.hero-heading",
    label: "Hero Heading",
    description: "Main heading for the Events page",
    type: "text",
    page: "events",
    group: "events.hero",
    gridColumn: "col-span-full",
    defaultValue: "Events",
    placeholder: "Events",
  },
  {
    key: "default.events.hero-tagline",
    label: "Hero Tagline",
    description: "Short line below the heading",
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
    label: "Default Link Label",
    description:
      "Label used for an event's external link when the event itself doesn't set one",
    type: "text",
    page: "events",
    group: "events.list",
    defaultValue: "More details",
    placeholder: "More details",
  },
  {
    key: "default.events.list-empty-heading",
    label: "Empty Heading",
    description: "Heading shown when there are no upcoming events",
    type: "text",
    page: "events",
    group: "events.list",
    defaultValue: "No upcoming events",
    placeholder: "No upcoming events",
  },
  {
    key: "default.events.list-empty-body",
    label: "Empty Body",
    description: "Supporting copy shown below the empty-state heading",
    type: "textarea",
    page: "events",
    group: "events.list",
    gridColumn: "col-span-full",
    defaultValue: "Check back soon — new dates are posted here.",
    placeholder: "Check back soon — new dates are posted here.",
  },
];

const eventsCtaData: TemplateField[] = [
  {
    key: "default.events.cta-heading",
    label: "CTA Heading",
    description: "Heading for the bottom call-to-action strip",
    type: "text",
    page: "events",
    group: "events.cta",
    gridColumn: "col-span-full",
    defaultValue: "Want us at your event?",
    placeholder: "Want us at your event?",
  },
  {
    key: "default.events.cta-body",
    label: "CTA Body",
    description: "Supporting copy shown below the CTA heading",
    type: "textarea",
    page: "events",
    group: "events.cta",
    gridColumn: "col-span-full",
    defaultValue: "Tell us the room and roughly how many people.",
    placeholder: "Tell us the room and roughly how many people.",
  },
  {
    key: "default.events.cta-button-text",
    label: "CTA Button Text",
    description: "Label for the CTA button",
    type: "text",
    page: "events",
    group: "events.cta",
    defaultValue: "Get in touch",
    placeholder: "Get in touch",
  },
  {
    key: "default.events.cta-button-link",
    label: "CTA Button Link",
    description: "Where the CTA button points",
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
    title: "Events — Hero",
    description: "Page heading and tagline",
    icon: "🎫",
    columns: 2,
  },
  {
    id: "events.list",
    title: "Events — List",
    description: "Fallback link label and empty-state copy",
    icon: "📅",
    columns: 2,
  },
  {
    id: "events.cta",
    title: "Events — CTA",
    description: "Bottom call-to-action strip",
    icon: "👆",
    columns: 2,
  },
];
