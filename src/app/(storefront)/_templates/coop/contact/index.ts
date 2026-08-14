import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Field/group/section module for the `coop` template's Contact page —
 * transcribed verbatim from `building-clone/src/app/schedule-appointment/page.tsx`
 * (data-cid n35–n72). There is no contact form in the source (waived per
 * docs/templates/coop/design.md and the build brief) — this page is purely
 * informational: a two-column block of copy, address, mailto link, and phone.
 *
 * Single field group/section (`contact.main`) — the clone renders one
 * uninterrupted content block, not multiple stacked sections.
 */

const contactMainData: TemplateField[] = [
  {
    key: "coop.contact.heading",
    label: "Heading",
    description:
      "The main page heading (rendered as the page's H1), left column.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "Contact us to schedule a walk-through!",
  },
  {
    key: "coop.contact.intro-line",
    label: "Intro Line",
    description:
      "First line of body copy, left column. A line break always follows it.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "E-mail us and we will get back to you shortly. ",
  },
  {
    key: "coop.contact.referral-body",
    label: "Referral Paragraph",
    description:
      "Paragraph explaining what happens if a request is outside scope or the waitlist is long.",
    type: "textarea",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-full",
    defaultValue:
      "We welcome all requests and if we find the work is beyond our scope or our client waitlist is too long we are happy to work with you to find a referral elsewhere.   ",
  },
  {
    key: "coop.contact.social-line1",
    label: "Social Line 1",
    description:
      "First line of the social-media prompt, left column (e.g. 'Add us on our social media!').",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "Add us on our social media!",
  },
  {
    key: "coop.contact.social-line2",
    label: "Social Line 2",
    description:
      "Second line of the social-media prompt, left column (e.g. your Instagram handle).",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "Instagram @buildingcooperatively",
  },
  {
    key: "coop.contact.right-heading",
    label: "Right Column Heading",
    description: "Small futura-pt heading above the address, right column.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "CONTACT",
  },
  {
    key: "coop.contact.address-line1",
    label: "Address Line 1",
    description: "Street address, right column.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "944 King St. ",
  },
  {
    key: "coop.contact.address-line2",
    label: "Address Line 2",
    description: "City/state, right column.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "Detroit, Mi ",
  },
  {
    key: "coop.contact.address-line3",
    label: "Address Line 3",
    description: "ZIP code, right column.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "48211",
  },
  {
    key: "coop.contact.email",
    label: "Email Address",
    description:
      "Contact email, right column. Rendered as a mailto link using this exact address as both the link target and the visible text.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "buildingcooperatively@gmail.com",
  },
  {
    key: "coop.contact.phone-label",
    label: "Phone Label",
    description: "Text shown immediately before the phone number.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "Leave a message at: ",
  },
  {
    key: "coop.contact.phone",
    label: "Phone Number",
    description: "Phone number, shown in bold after the phone label.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "(313) 444-9681",
  },
];

// ─── Aggregated export ────────────────────────────────────────────────────────

export const coopContactData: TemplateField[] = [...contactMainData];

export const coopContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.main",
    title: "Contact Content",
    description:
      "The page heading, intro/referral copy, social prompt, address, mailto link, and phone number — one uninterrupted two-column block, no form.",
    icon: "✉️",
    columns: 2,
  },
];

export const coopContactSections: TemplateSection[] = [
  {
    id: "contact.main",
    page: "contact",
    title: "Contact Content",
    description:
      "Two-column informational block: heading/copy/social on the left, address/email/phone on the right",
    groupIds: ["contact.main"],
    order: 0,
    hideable: false,
  },
];
