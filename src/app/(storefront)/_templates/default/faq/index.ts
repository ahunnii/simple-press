import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Copy defaults, exported so `default-faq-page.tsx` can fall back to the
 * same string this field module declares as `defaultValue` (single source of
 * truth) — needed while these keys aren't in the root field map yet, since
 * `resolveFields` can't substitute a `defaultValue` it doesn't know about.
 */
export const FAQ_PAGE_HEADING_DEFAULT = "Frequently Asked Questions";
export const FAQ_PAGE_EMPTY_DEFAULT =
  "No FAQ items available yet. Check back soon.";

const faqPageData: TemplateField[] = [
  {
    key: "default.faq.page-heading",
    label: "Heading",
    description: "Main heading on the FAQ page.",
    type: "text",
    page: "faq",
    group: "faq.page",
    gridColumn: "col-span-1",
    defaultValue: FAQ_PAGE_HEADING_DEFAULT,
    placeholder: "e.g. Questions & answers",
  },
  {
    key: "default.faq.page-empty",
    label: "Empty state message",
    description: "Shown on the FAQ page when there are no questions yet.",
    type: "text",
    page: "faq",
    group: "faq.page",
    gridColumn: "col-span-full",
    defaultValue: FAQ_PAGE_EMPTY_DEFAULT,
    placeholder: "e.g. FAQs are coming soon.",
  },
];

export const defaultFaqData: TemplateField[] = [...faqPageData];

export const defaultFaqFieldGroups: TemplateFieldGroup[] = [
  {
    id: "faq.page",
    title: "FAQ page",
    description: "Heading and empty state on the FAQ page.",
    icon: "❓",
    columns: 2,
  },
];
