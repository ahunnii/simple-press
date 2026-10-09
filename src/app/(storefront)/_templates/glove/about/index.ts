import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

// Verbatim copy from theluvgluv.com/about-us. Keys: glove.about.<name>.
// Link-bearing lines use `[label](/path)` markup (see glove-inline-links.tsx).

// Default story video: iframe field value is a JSON string `{ src, height, title }`.
const STORY_VIDEO_DEFAULT = JSON.stringify({
  src: "https://www.youtube.com/watch?v=QgEEQxxE8Oc",
  height: 360,
  title: "The LuvGluv Story",
  aspectRatio: "16:9",
});

const LINK_HELP =
  "To link words inside the text, write [words to link](/page), for example [Shop Now](/shop).";

// ─── Mission & values ─────────────────────────────────────────────────────────

const aboutValuesData: TemplateField[] = [
  {
    key: "glove.about.page-title",
    label: "Page title",
    description:
      "Screen-reader and search-engine title of the page. It is not shown on the page itself.",
    type: "text",
    page: "about",
    group: "about.values",
    gridColumn: "col-span-full",
    defaultValue: "Our Story",
  },
  {
    key: "glove.about.mission-heading",
    label: "Mission heading",
    description: "Heading of the left box at the top of the page.",
    type: "text",
    page: "about",
    group: "about.values",
    gridColumn: "col-span-full",
    defaultValue: "Our Mission: Honoring Women's Hands",
  },
  {
    key: "glove.about.mission-body",
    label: "Mission text",
    description: "Paragraph inside the mission box.",
    type: "textarea",
    page: "about",
    group: "about.values",
    gridColumn: "col-span-full",
    defaultValue:
      "At The LuvGluv, LLC, our mission is to pay homage to the hands of women – whether their touch provides comfort, guidance, or caution. Women's hands, both literally and metaphorically, shape our character, and protect our well-being. We celebrate the essence of women through beautiful accessories and a deep appreciation for our customers.",
  },
  {
    key: "glove.about.values-heading",
    label: "Values heading",
    description: "Heading of the right box at the top of the page.",
    type: "text",
    page: "about",
    group: "about.values",
    gridColumn: "col-span-full",
    defaultValue: "Our Values: Love, Fashion, and Exceptional Service",
  },
  {
    key: "glove.about.values-body",
    label: "Values text",
    description: "Paragraph inside the values box.",
    type: "textarea",
    page: "about",
    group: "about.values",
    gridColumn: "col-span-full",
    defaultValue:
      "The core of our business lies in our unwavering commitment to beautiful accessories, exceptional service, and a heartfelt appreciation for each and every customer who steps into the world of The LuvGluv. We believe in the power of fashion to express love and appreciation.",
  },
];

// ─── Story ────────────────────────────────────────────────────────────────────

const aboutStoryData: TemplateField[] = [
  {
    key: "glove.about.story-video",
    label: "Story video",
    description:
      "A YouTube link (or other embed) shown beside the story. YouTube videos load only when the visitor presses play. Leave blank to hide the video.",
    type: "iframe",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: STORY_VIDEO_DEFAULT,
  },
  {
    key: "glove.about.story-heading",
    label: "Heading",
    description: "Main heading next to the video.",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "About The LuvGluv, LLC: A Celebration of Women's Hands",
  },
  {
    key: "glove.about.story-subheading",
    label: "Intro line",
    description: "Short line under the heading. Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue:
      "Your Journey into the Heart of The LuvGluv, Where Love and Fashion Intersect",
  },
  {
    key: "glove.about.story-subtitle",
    label: "Subheading",
    description:
      "Bold subheading above the story paragraph. Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "Discover the Woman-Centric Magic Behind The LuvGluv",
  },
  {
    key: "glove.about.story-body",
    label: "Story text",
    description: "Paragraph under the subheading.",
    type: "textarea",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue:
      "At The LuvGluv, LLC, we believe in the transformative power of love, celebration, and fashion. Our story is one of passion, resilience, and a deep appreciation for the remarkable women who have shaped our lives.",
  },
];

// ─── Press ────────────────────────────────────────────────────────────────────

const aboutPressData: TemplateField[] = [
  {
    key: "glove.about.press-heading",
    label: "Heading",
    description: "Heading of the press feature.",
    type: "text",
    page: "about",
    group: "about.press",
    gridColumn: "col-span-full",
    defaultValue: "The LuvGluv In the Press",
  },
  {
    key: "glove.about.press-intro",
    label: "Intro text",
    description: "First paragraph about the feature.",
    type: "textarea",
    page: "about",
    group: "about.press",
    gridColumn: "col-span-full",
    defaultValue:
      "We are delighted to have been featured in a Business Profile for Detroit Smart Pages in their April/May 2024 issue!",
  },
  {
    key: "glove.about.press-quote",
    label: "Quote",
    description: "Pull quote from the article. Leave blank to hide.",
    type: "textarea",
    page: "about",
    group: "about.press",
    gridColumn: "col-span-full",
    defaultValue:
      "“The LuvGluv is an exquisitely created leather glove business that will celebrate the women whose hands help guide and direct our lives.”",
  },
  {
    key: "glove.about.press-button-label",
    label: "Button label",
    description: "Label of the article button.",
    type: "text",
    page: "about",
    group: "about.press",
    gridColumn: "col-span-1",
    defaultValue: "Read Full Article",
  },
  {
    key: "glove.about.press-button-url",
    label: "Article link",
    description:
      "Web address of the full article. Opens in a new tab. Leave blank to hide the button and the link on the picture.",
    type: "url",
    page: "about",
    group: "about.press",
    gridColumn: "col-span-1",
    defaultValue:
      "https://theluvgluv.com/wp-content/uploads/2024/04/2024_DETROITSMRTPGS_APR_MAY-1.pdf",
    placeholder: "https://",
  },
  {
    key: "glove.about.press-image",
    label: "Picture",
    description:
      "Magazine page or photo shown beside the text. Leave blank to show the text only.",
    type: "image",
    page: "about",
    group: "about.press",
    gridColumn: "col-span-full",
    defaultValue: "/templates/glove/images/about-1.jpg",
  },
  {
    key: "glove.about.press-image-alt",
    label: "Picture description",
    description:
      "Describes the picture for screen readers and when the image cannot load.",
    type: "text",
    page: "about",
    group: "about.press",
    gridColumn: "col-span-full",
    defaultValue:
      "The LuvGluv business profile in the April/May 2024 issue of Detroit Smart Pages",
  },
];

// ─── Founder ──────────────────────────────────────────────────────────────────

const aboutFounderData: TemplateField[] = [
  {
    key: "glove.about.founder-image",
    label: "Portrait",
    description:
      "Founder portrait shown in a tall frame beside the biography. Leave blank to show the text only.",
    type: "image",
    page: "about",
    group: "about.founder",
    gridColumn: "col-span-full",
    defaultValue: "/templates/glove/images/about-2.jpg",
  },
  {
    key: "glove.about.founder-image-alt",
    label: "Portrait description",
    description:
      "Describes the portrait for screen readers and when the image cannot load.",
    type: "text",
    page: "about",
    group: "about.founder",
    gridColumn: "col-span-full",
    defaultValue:
      "Dr. DaNita Weddle, founder of The LuvGluv, with her arms crossed and wearing pink gloves",
  },
  {
    key: "glove.about.founder-heading",
    label: "Heading",
    description: "Heading above the founder biography.",
    type: "text",
    page: "about",
    group: "about.founder",
    gridColumn: "col-span-full",
    defaultValue: "Meet Dr. DaNita Weddle",
  },
  {
    key: "glove.about.founder-subheading",
    label: "Subheading",
    description: "Bold line under the heading. Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.founder",
    gridColumn: "col-span-full",
    defaultValue: "Your Guide to The LuvGluv Experience",
  },
  {
    key: "glove.about.founder-bio-1",
    label: "Biography, first paragraph",
    description: "First paragraph of the founder biography.",
    type: "textarea",
    page: "about",
    group: "about.founder",
    gridColumn: "col-span-full",
    defaultValue:
      "Dr. DaNita Weddle, the visionary founder of The LuvGluv, LLC is not only a Doctor of Health Admission but a testament to the boundless potential of the human spirit. Her journey began with a pivotal moment in May 2021 when she found herself at a crossroads due to workforce reduction. But even in the face of adversity, her spirit remained grounded by the women whose hands had guided her life’s journey, and a profound idea was reignited.",
  },
  {
    key: "glove.about.founder-bio-2",
    label: "Biography, second paragraph",
    description:
      "Second paragraph of the founder biography. Leave blank to hide.",
    type: "textarea",
    page: "about",
    group: "about.founder",
    gridColumn: "col-span-full",
    defaultValue:
      "The LuvGluv is a tribute to the women who have shaped Dr. Weddle’s life, with special remembrance of her Aunt Johnnie who taught her to design and create her own style of clothing at 10 years old. Also, a tribute to her mother, Nurserene, a registered nurse whose hands were a conduit of care and kindness. She could bandage a wound, offer emotional support, and write a thesis with equal grace. Their hands were a source of solace and strength, a universal symbol of love.",
  },
  {
    key: "glove.about.gift-heading",
    label: "Gift line heading",
    description: `Small heading under the biography. ${LINK_HELP} Leave blank to hide this line and its text.`,
    type: "text",
    page: "about",
    group: "about.founder",
    gridColumn: "col-span-full",
    defaultValue: "Share the Love: [Gift a Glove Today!](/shop/gift-card)",
  },
  {
    key: "glove.about.gift-body",
    label: "Gift line text",
    description: "Sentence under the gift heading.",
    type: "textarea",
    page: "about",
    group: "about.founder",
    gridColumn: "col-span-full",
    defaultValue:
      "We encourage visitors to consider gifting The LuvGluv to a special woman in your life.",
  },
  {
    key: "glove.about.shop-heading",
    label: "Shop line heading",
    description: `Second small heading under the biography. ${LINK_HELP} Leave blank to hide this line and its text.`,
    type: "text",
    page: "about",
    group: "about.founder",
    gridColumn: "col-span-full",
    defaultValue: "Get wrapped in The LuvGluv: [Shop Now](/shop)",
  },
  {
    key: "glove.about.shop-body",
    label: "Shop line text",
    description: "Sentence under the shop heading.",
    type: "textarea",
    page: "about",
    group: "about.founder",
    gridColumn: "col-span-full",
    defaultValue:
      "Inviting visitors to experience the love and fashion of The LuvGluv collection.",
  },
];

// ─── Offering ─────────────────────────────────────────────────────────────────

const aboutOfferingData: TemplateField[] = [
  {
    key: "glove.about.offering-overline",
    label: "Small label",
    description: "Small label above the heading. Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.offering",
    gridColumn: "col-span-full",
    defaultValue: "Our Offering",
  },
  {
    key: "glove.about.offering-heading",
    label: "Heading",
    description: "Heading of the collection overview.",
    type: "text",
    page: "about",
    group: "about.offering",
    gridColumn: "col-span-full",
    defaultValue: "The LuvGluv Collection: A Fashionable Ode to Women",
  },
  {
    key: "glove.about.offering-body",
    label: "Text",
    description: "Paragraph under the heading.",
    type: "textarea",
    page: "about",
    group: "about.offering",
    gridColumn: "col-span-full",
    defaultValue:
      "The heart of The LuvGluv is our collection of Genuine leather gloves, exquisitely crafted to celebrate the essence of women. Our gloves, whether lined or unlined, feature three changeable charms that dangle from delicate eyelets. These charms, resembling a dime in size, are your personal tokens of love, style, and individuality.",
  },
  {
    key: "glove.about.offering-button-label",
    label: "Button label",
    description: "Label of the shop button. Leave blank to hide the button.",
    type: "text",
    page: "about",
    group: "about.offering",
    gridColumn: "col-span-1",
    defaultValue: "Explore Our Glove Styles",
  },
  {
    key: "glove.about.offering-button-url",
    label: "Button link",
    description: "Where the shop button goes.",
    type: "url",
    page: "about",
    group: "about.offering",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
  {
    key: "glove.about.charms-heading",
    label: "First note heading",
    description:
      "Heading of the first note under the button. Leave blank to hide the note.",
    type: "text",
    page: "about",
    group: "about.offering",
    gridColumn: "col-span-full",
    defaultValue: "Charms of The LuvGluv",
  },
  {
    key: "glove.about.charms-body",
    label: "First note text",
    description: "Text of the first note.",
    type: "textarea",
    page: "about",
    group: "about.offering",
    gridColumn: "col-span-full",
    defaultValue:
      "The first set of charms comes with every base product glove, and you can further customize your glove with additional charms available for separate purchases. If you desire a unique charm that holds a special meaning, our commissioned charm service is also available, albeit at an additional cost.",
  },
  {
    key: "glove.about.touch-heading",
    label: "Second note heading",
    description: "Heading of the second note. Leave blank to hide the note.",
    type: "text",
    page: "about",
    group: "about.offering",
    gridColumn: "col-span-full",
    defaultValue: "Get in Touch with The LuvGluv Team",
  },
  {
    key: "glove.about.touch-body",
    label: "Second note text",
    description: `Text of the second note. ${LINK_HELP}`,
    type: "textarea",
    page: "about",
    group: "about.offering",
    gridColumn: "col-span-full",
    defaultValue:
      "Have questions or suggestions? We're here to assist you. [Reach out to us](/contact) via chat or email, and our friendly team will be delighted to engage in the conversation. We are dedicated to ensuring your experience with The LuvGluv is filled with love and style.",
  },
  {
    key: "glove.about.difference-heading",
    label: "Third note heading",
    description: "Heading of the third note. Leave blank to hide the note.",
    type: "text",
    page: "about",
    group: "about.offering",
    gridColumn: "col-span-full",
    defaultValue: "Experience The LuvGluv Difference",
  },
  {
    key: "glove.about.difference-body",
    label: "Third note text",
    description: "Text of the third note.",
    type: "textarea",
    page: "about",
    group: "about.offering",
    gridColumn: "col-span-full",
    defaultValue:
      "As you explore the world of The LuvGluv, LLC, you're invited to express your love for the extraordinary women in your life. Our gloves collection is not just a fashion statement; it's a heartfelt celebration. Your journey into our world acknowledges the profound impact women have had on your life.",
  },
];

// ─── Aggregated export ────────────────────────────────────────────────────────

export const gloveAboutData: TemplateField[] = [
  ...aboutValuesData,
  ...aboutStoryData,
  ...aboutPressData,
  ...aboutFounderData,
  ...aboutOfferingData,
];

export const gloveAboutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "about.values",
    title: "Mission and values",
    description: "Page title and the two bordered boxes at the top of the page",
    icon: "💜",
    columns: 1,
  },
  {
    id: "about.story",
    title: "Our story",
    description: "Story video with the heading and paragraph beside it",
    icon: "🎬",
    columns: 1,
  },
  {
    id: "about.press",
    title: "In the press",
    description: "Press feature text, article link and picture",
    icon: "📰",
    columns: 2,
  },
  {
    id: "about.founder",
    title: "Meet the founder",
    description: "Founder portrait, biography and the two links underneath",
    icon: "🧤",
    columns: 1,
  },
  {
    id: "about.offering",
    title: "Our offering",
    description: "Collection overview, shop button and three short notes",
    icon: "✨",
    columns: 2,
  },
];

export const gloveAboutSections: TemplateSection[] = [
  {
    id: "about.values",
    page: "about",
    title: "Mission and values",
    description:
      "Page title (hidden from view) and the Mission and Values boxes.",
    groupIds: ["about.values"],
    order: 0,
    hideable: false,
  },
  {
    id: "about.story",
    page: "about",
    title: "Our story",
    description: "Story video with the heading and paragraph beside it.",
    groupIds: ["about.story"],
    order: 1,
    hideable: true,
  },
  {
    id: "about.press",
    page: "about",
    title: "In the press",
    description: "Press feature with an article link and picture.",
    groupIds: ["about.press"],
    order: 2,
    hideable: true,
  },
  {
    id: "about.founder",
    title: "Meet the founder",
    page: "about",
    description: "Founder portrait, biography and the gift and shop links.",
    groupIds: ["about.founder"],
    order: 3,
    hideable: true,
    links: [SECTION_LINKS.products],
  },
  {
    id: "about.offering",
    page: "about",
    title: "Our offering",
    description: "Collection overview, shop button and three short notes.",
    groupIds: ["about.offering"],
    order: 4,
    hideable: true,
    links: [SECTION_LINKS.products],
  },
];
