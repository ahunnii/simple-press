import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const donateHeroData: TemplateField[] = [
  {
    key: "default.donate.hero-heading",
    label: "Hero Heading",
    description:
      "Main heading for the Donate page. Leave blank to use the page title derived from the donation label (Donate / Leave a Tip / Support Us) set in Donation settings.",
    type: "text",
    page: "donate",
    group: "donate.hero",
    gridColumn: "col-span-full",
    placeholder: "Donate",
  },
  {
    key: "default.donate.hero-intro",
    label: "Hero Intro",
    description: "Short paragraph below the heading",
    type: "textarea",
    page: "donate",
    group: "donate.hero",
    gridColumn: "col-span-full",
    defaultValue: "Every contribution helps us keep doing what we love.",
    placeholder: "Every contribution helps us keep doing what we love.",
  },
];

const donateThankYouData: TemplateField[] = [
  {
    key: "default.donate.thank-you-heading",
    label: "Thank-You Heading",
    description: "Heading shown after a successful donation (?status=success)",
    type: "text",
    page: "donate",
    group: "donate.thank-you",
    defaultValue: "Thank you for your support!",
    placeholder: "Thank you for your support!",
  },
  {
    key: "default.donate.thank-you-body",
    label: "Thank-You Body",
    description: "Supporting copy shown below the thank-you heading",
    type: "textarea",
    page: "donate",
    group: "donate.thank-you",
    gridColumn: "col-span-full",
    defaultValue: "Your gift has been received and means the world to us.",
    placeholder: "Your gift has been received and means the world to us.",
  },
];

const donateOtherWaysData: TemplateField[] = [
  {
    key: "default.donate.other-ways-heading",
    label: "Other Ways to Give Heading",
    description: "Heading for the Venmo/Cash App section",
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
    title: "Donate — Hero",
    description: "Page heading and intro",
    icon: "💝",
    columns: 2,
  },
  {
    id: "donate.thank-you",
    title: "Donate — Thank You",
    description: "Copy shown after a successful donation",
    icon: "🙏",
    columns: 2,
  },
  {
    id: "donate.other-ways",
    title: "Donate — Other Ways to Give",
    description: "Heading for the Venmo/Cash App section",
    icon: "🤝",
    columns: 2,
  },
];
