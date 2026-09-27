import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const donateHeroData: TemplateField[] = [
  {
    key: "default.donate.hero-heading",
    label: "Heading",
    description:
      "Main heading for the Donate page. Leave blank to use the page title built from the donation label (Donate / Leave a Tip / Support Us) set in Donation settings.",
    type: "text",
    page: "donate",
    group: "donate.hero",
    gridColumn: "col-span-full",
    placeholder: "Donate",
  },
  {
    key: "default.donate.hero-intro",
    label: "Intro text",
    description:
      "Short paragraph below the heading on the Donate page. Leave blank to hide.",
    type: "textarea",
    page: "donate",
    group: "donate.hero",
    gridColumn: "col-span-full",
    defaultValue: "Every contribution helps us keep doing what we love.",
    placeholder: "One short sentence",
  },
];

const donateThankYouData: TemplateField[] = [
  {
    key: "default.donate.thank-you-heading",
    label: "Heading",
    description:
      "Heading shown after a successful donation, in place of the donation form.",
    type: "text",
    page: "donate",
    group: "donate.thank-you",
    defaultValue: "Thank you for your support!",
    placeholder: "Thank you for your support!",
  },
  {
    key: "default.donate.thank-you-body",
    label: "Body text",
    description:
      "Line below the thank-you heading after a successful donation. Leave blank to hide.",
    type: "textarea",
    page: "donate",
    group: "donate.thank-you",
    gridColumn: "col-span-full",
    defaultValue: "Your gift has been received and means the world to us.",
    placeholder: "One short sentence",
  },
];

const donateOtherWaysData: TemplateField[] = [
  {
    key: "default.donate.other-ways-heading",
    label: "Heading",
    description:
      "Heading above the Venmo/Cash App section, shown when at least one of those is set up in Donation settings.",
    type: "text",
    page: "donate",
    group: "donate.other-ways",
    defaultValue: "Other ways to give",
    placeholder: "Other ways to give",
  },
];

export const defaultDonateData: TemplateField[] = [
  ...donateHeroData,
  ...donateThankYouData,
  ...donateOtherWaysData,
];

export const defaultDonateFieldGroups: TemplateFieldGroup[] = [
  {
    id: "donate.hero",
    title: "Hero",
    description: "Page heading and intro text.",
    icon: "💝",
    columns: 2,
  },
  {
    id: "donate.thank-you",
    title: "Thank You",
    description: "Copy shown after a successful donation.",
    icon: "🙏",
    columns: 2,
  },
  {
    id: "donate.other-ways",
    title: "Other Ways to Give",
    description: "Heading for the Venmo/Cash App section.",
    icon: "🤝",
    columns: 2,
  },
];
