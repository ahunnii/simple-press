import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

import { GLOVE_PAGE_BANNER_DEFAULT } from "../shared/glove-page-banner-default";

/**
 * Header and footer fields (page "global"). Shown on every page; edited from
 * the "Header" and "Footer" sections of the editor's global tab.
 *
 * Email, phone, address and social links are NOT here: they come from
 * Settings and Content → Branding.
 */

export const GLOVE_FIELD_KEYS = {
  trackLabel: "glove.global.track-label",
  trackLink: "glove.global.track-link",
  accountLabel: "glove.global.account-label",
  pageBannerImage: "glove.global.page-banner-image",
  footerBadge: "glove.global.footer-badge",
  footerBlurb: "glove.global.footer-blurb",
  footerQuickLinksHeading: "glove.global.footer-quick-links-heading",
  footerCustomerHeading: "glove.global.footer-customer-heading",
  footerContactHeading: "glove.global.footer-contact-heading",
  footerContactIntro: "glove.global.footer-contact-intro",
  footerQuestionLabel: "glove.global.footer-question-label",
  footerPaymentImage: "glove.global.footer-payment-image",
} as const;

export const gloveLayoutData: TemplateField[] = [
  // ─── Header ────────────────────────────────────────────────────────────
  {
    key: GLOVE_FIELD_KEYS.trackLabel,
    label: "Order tracking label",
    description:
      "Link at the right of the top strip and in the footer's customer area. Leave blank to hide it in both places.",
    type: "text",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-1",
    defaultValue: "Track Your Order",
    placeholder: "e.g. Where is my order?",
  },
  {
    key: GLOVE_FIELD_KEYS.trackLink,
    label: "Order tracking link",
    description:
      "Where the order tracking link goes. Customers look up an order here.",
    type: "url",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-1",
    defaultValue: "/order-status",
  },
  {
    key: GLOVE_FIELD_KEYS.accountLabel,
    label: "Account button label",
    description:
      "Text next to the account icon in the header. Leave blank to show the default.",
    type: "text",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-1",
    defaultValue: "Account",
    placeholder: "e.g. Sign in",
  },
  {
    key: GLOVE_FIELD_KEYS.pageBannerImage,
    label: "Inner page banner image",
    description:
      "Wide photo behind the page title on the shop, collections, blog, FAQ and other browse pages. The left side sits under the title, so keep the subject on the right. Leave blank to use the built-in banner.",
    type: "image",
    page: "global",
    group: "global.header",
    gridColumn: "col-span-full",
    defaultValue: GLOVE_PAGE_BANNER_DEFAULT,
  },

  // ─── Footer ────────────────────────────────────────────────────────────
  {
    key: GLOVE_FIELD_KEYS.footerBadge,
    label: "Certification badge",
    description:
      "Badge shown under the logo in the footer, such as a business certification. Leave blank to hide.",
    type: "image",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-full",
    defaultValue: "/templates/glove/images/women-owned-badge.jpg",
  },
  {
    key: GLOVE_FIELD_KEYS.footerBlurb,
    label: "Footer blurb",
    description:
      "Short description under the badge in the footer. Leave blank to hide.",
    type: "textarea",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-full",
    defaultValue:
      "The LuvGluv LLC is a renowned retailer of lavish, premium gloves made just for ladies. The LuvGluv aims to provide exceptional production and timeless elegance.",
    placeholder: "One or two sentences about your brand",
  },
  {
    key: GLOVE_FIELD_KEYS.footerQuickLinksHeading,
    label: "Quick links heading",
    description:
      "Heading above the footer's quick links. The links themselves come from Content → Navigation (footer links).",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Quick links",
  },
  {
    key: GLOVE_FIELD_KEYS.footerCustomerHeading,
    label: "Customer area heading",
    description:
      "Heading above the account, orders, cart and policy links in the footer.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Customer area",
  },
  {
    key: GLOVE_FIELD_KEYS.footerContactHeading,
    label: "Contact heading",
    description: "Heading above the contact details in the footer.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Contact",
  },
  {
    key: GLOVE_FIELD_KEYS.footerContactIntro,
    label: "Contact intro",
    description:
      "Sentence above the phone number in the footer. Leave blank to hide.",
    type: "textarea",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-full",
    defaultValue:
      "For inquiries, assistance, or any information you may need, please don't hesitate to contact us:",
    placeholder: "A short invitation to get in touch",
  },
  {
    key: GLOVE_FIELD_KEYS.footerQuestionLabel,
    label: "Phone label",
    description:
      "Small label above the phone number in the footer. Only shown when a phone number is set in Settings.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Have any question?",
  },
  {
    key: GLOVE_FIELD_KEYS.footerPaymentImage,
    label: "Payment methods image",
    description:
      "Row of accepted payment logos at the right of the footer's bottom bar. Leave blank to hide.",
    type: "image",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-full",
    defaultValue: "/templates/glove/images/payment-icons.png",
  },
];

export const gloveLayoutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.header",
    title: "Header",
    description:
      "Order tracking link, account button and the banner behind inner page titles. Email and phone in the top strip come from Settings; the logo comes from Content → Branding; menu links from Content → Navigation.",
    icon: "🧭",
    columns: 2,
  },
  {
    id: "global.footer",
    title: "Footer",
    description:
      "Badge, blurb, column headings, contact text and payment logos. Social links and quick links come from Content → Branding and Content → Navigation.",
    icon: "🦶",
    columns: 2,
  },
];
