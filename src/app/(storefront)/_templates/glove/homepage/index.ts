import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

import {
  gloveStepsData,
  gloveStepsFieldGroups,
} from "../steps/glove-steps-fields";

/**
 * Homepage fields, groups and sections (design.md "Per-page section
 * concepts › Homepage", 1–11). Page key `homepage`; group ids equal section
 * ids equal `data-sp-group` values.
 *
 * Field-definition leaf: nothing here may import a renderer or a resolver
 * (circular-import trap via the field registry). Resolvers import the
 * `*_DEFAULT_ROWS` constants from this file instead.
 */

const IMG = "/templates/glove/images";

// ─── Hero (not hideable) ────────────────────────────────────────────────────

const heroData: TemplateField[] = [
  {
    key: "glove.homepage.hero-image",
    label: "Photo",
    description:
      "Full-width photo behind the heading. A dark overlay keeps the white text readable.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: `${IMG}/hero.jpg`,
  },
  {
    key: "glove.homepage.hero-image-alt",
    label: "Photo description",
    description:
      "Describe the photo for screen readers. Leave blank to treat it as decoration.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "The founder seated at a desk between hand forms wearing pink and black leather gloves",
    placeholder: "Who or what is in the photo",
  },
  {
    key: "glove.homepage.hero-heading",
    label: "Heading",
    description: "Main page heading, centered over the photo.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "Every woman's hands tell a story!",
  },
  {
    key: "glove.homepage.hero-subheading",
    label: "Sub-heading",
    description: "One line under the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "Let The LuvGluv help you honor hers.",
  },
  {
    key: "glove.homepage.hero-button-label",
    label: "Button label",
    description: "Button under the sub-heading. Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "Browse Glove Styles",
  },
  {
    key: "glove.homepage.hero-button-url",
    label: "Button link",
    description: "Where the hero button goes.",
    type: "url",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
];

// ─── Glove styles (hideable) ────────────────────────────────────────────────

/** Built-in style cards (`glove.homepage.styles-list`'s `defaultRows`). */
export const GLOVE_STYLES_DEFAULT_ROWS: Record<string, string>[] = [
  {
    name: "Classic Glove",
    blurb: "Our Classic Glove offers full coverage and warmth.",
    image: `${IMG}/style-classic.jpg`,
    buttonLabel: "Customize",
    url: "/shop",
  },
  {
    name: "Fingerless Glove",
    blurb: "Our Fingerless Glove is perfect for showing off that manicure.",
    image: `${IMG}/style-fingerless.jpg`,
    buttonLabel: "Customize",
    url: "/shop",
  },
  {
    name: "Driving Glove",
    blurb: "Our Driving Glove is just the thing for women who love to ride.",
    image: `${IMG}/style-driving.jpg`,
    buttonLabel: "Customize",
    url: "/shop",
  },
  {
    name: "Half Glove",
    blurb:
      "Our Half Glove is the perfect combination of sexy and sophisticated.",
    image: `${IMG}/style-half.jpg`,
    buttonLabel: "Customize",
    url: "/shop",
  },
];

const stylesData: TemplateField[] = [
  {
    key: "glove.homepage.styles-heading",
    label: "Heading",
    description: "Heading above the style cards. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.styles",
    gridColumn: "col-span-full",
    defaultValue: "Check out the styles she'll love this fall...",
  },
  {
    key: "glove.homepage.styles-list",
    label: "Styles",
    description:
      "Round photo cards, each with a name, a short line and a button. Four fit best in one row.",
    type: "list",
    page: "homepage",
    group: "homepage.styles",
    gridColumn: "col-span-full",
    minItems: 1,
    maxItems: 8,
    itemLabel: "style",
    summaryKey: "name",
    defaultsWhenEmpty: true,
    itemSchema: [
      {
        key: "name",
        label: "Name",
        type: "text",
        description: "Style name shown under the photo.",
        placeholder: "e.g. Classic Glove",
      },
      {
        key: "blurb",
        label: "Short line",
        type: "text",
        optional: true,
        description: "One sentence under the name. Leave blank to hide.",
        placeholder: "What makes this style special",
      },
      {
        key: "image",
        label: "Photo",
        type: "image",
        description: "Shown in a circle. A square-ish crop works best.",
      },
      {
        key: "imageAlt",
        label: "Photo description",
        type: "text",
        optional: true,
        description:
          "Describe the photo for screen readers. Leave blank to treat it as decoration.",
      },
      {
        key: "buttonLabel",
        label: "Button label",
        type: "text",
        optional: true,
        description: "Label of the small button. Leave blank to hide it.",
        placeholder: "e.g. Customize",
      },
      {
        key: "url",
        label: "Link",
        type: "url",
        description: "Where the card and its button go.",
        placeholder: "/shop",
      },
    ],
    defaultRows: GLOVE_STYLES_DEFAULT_ROWS,
  },
];

// ─── Our story (hideable) ───────────────────────────────────────────────────

/** Default story video: `iframe` fields store this JSON shape. */
export const GLOVE_STORY_VIDEO_DEFAULT = JSON.stringify({
  src: "https://www.youtube.com/watch?v=QgEEQxxE8Oc",
  height: 360,
  title: "The LuvGluv Story",
});

const storyData: TemplateField[] = [
  {
    key: "glove.homepage.story-overline",
    label: "Small heading",
    description:
      "Small uppercase label above the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "Our Story",
  },
  {
    key: "glove.homepage.story-heading",
    label: "Heading",
    description: "Heading of the story band.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue: "Paying Homage to the Hands of Women",
  },
  {
    key: "glove.homepage.story-video",
    label: "Video",
    description:
      "A YouTube video that plays in place once the visitor clicks it. Requires the Embeds feature to edit; until you change it, the default story video shows. Leave empty to hide the video.",
    type: "iframe",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue: GLOVE_STORY_VIDEO_DEFAULT,
  },
  {
    key: "glove.homepage.story-body-1",
    label: "First paragraph",
    description: "Opening paragraph under the video.",
    type: "textarea",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue:
      "At The LuvGluv LLC, our mission is to pay homage to the hands of women – whether their touch provides comfort, guidance, or caution.",
    placeholder: "One or two sentences about your mission",
  },
  {
    key: "glove.homepage.story-body-2",
    label: "Second paragraph",
    description: "Second paragraph. Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-full",
    defaultValue:
      "Womens’ hands, both literally and metaphorically, shape our character, and protect our well being. We celebrate the essence of women through beautiful accessories and a deep appreciation for our customers.",
    placeholder: "One or two more sentences",
  },
  {
    key: "glove.homepage.story-signoff-name",
    label: "Sign-off name",
    description:
      "Name shown in bold under the paragraphs. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "Dr. DaNita Weddle",
  },
  {
    key: "glove.homepage.story-signoff-role",
    label: "Sign-off title",
    description: "Italic line under the name. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "Founder & CEO, The LuvGluv LLC",
  },
  {
    key: "glove.homepage.story-button-label",
    label: "Button label",
    description: "Button at the end of the band. Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "More About Us",
  },
  {
    key: "glove.homepage.story-button-url",
    label: "Button link",
    description: "Where the story button goes.",
    type: "url",
    page: "homepage",
    group: "homepage.story",
    gridColumn: "col-span-1",
    defaultValue: "/about",
    placeholder: "/about",
  },
];

// ─── Gift cards (hideable) ──────────────────────────────────────────────────

const giftData: TemplateField[] = [
  {
    key: "glove.homepage.gift-image",
    label: "Photo",
    description: "Round photo on the left of the gift card band.",
    type: "image",
    page: "homepage",
    group: "homepage.gift",
    gridColumn: "col-span-full",
    defaultValue: `${IMG}/gift-card.jpg`,
  },
  {
    key: "glove.homepage.gift-image-alt",
    label: "Photo description",
    description:
      "Describe the photo for screen readers. Leave blank to treat it as decoration.",
    type: "text",
    page: "homepage",
    group: "homepage.gift",
    gridColumn: "col-span-full",
    defaultValue: "A LuvGluv gift card laid over a pair of pink leather gloves",
    placeholder: "What the photo shows",
  },
  {
    key: "glove.homepage.gift-heading",
    label: "Heading",
    description: "Heading of the gift card band.",
    type: "text",
    page: "homepage",
    group: "homepage.gift",
    gridColumn: "col-span-full",
    defaultValue: "Gift Cards Now Available!",
  },
  {
    key: "glove.homepage.gift-body",
    label: "Text",
    description: "Paragraph under the heading. Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "homepage.gift",
    gridColumn: "col-span-full",
    defaultValue:
      "If you’re not sure what style your gift recipient would like best, a Gift Card is the perfect option. Choose your amount, enter their email address, and you’re done! Or, if prefer to give them their Gift Card in person, enter your own email address instead so you can print it off and hand-deliver to recipient.",
    placeholder: "Explain how gift cards work",
  },
  {
    key: "glove.homepage.gift-button-label",
    label: "Button label",
    description: "Button under the text. Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.gift",
    gridColumn: "col-span-1",
    defaultValue: "Purchase a Gift Card",
  },
  {
    key: "glove.homepage.gift-button-url",
    label: "Button link",
    description: "Where the gift card button goes.",
    type: "url",
    page: "homepage",
    group: "homepage.gift",
    gridColumn: "col-span-1",
    defaultValue: "/shop/gift-card",
    placeholder: "/shop/gift-card",
  },
];

// ─── Collections (hideable) ─────────────────────────────────────────────────

/** Built-in collection cards (`glove.homepage.collections-list`'s `defaultRows`). */
export const GLOVE_COLLECTIONS_DEFAULT_ROWS: Record<string, string>[] = [
  {
    heading: "Elegance in Every Stitch-Leather Gloves",
    body: "Savor the incomparable refinement of our fine leather gloves, expertly created with an emphasis on classic design and exceptional comfort. Our collection epitomizes luxury with elegant, traditional designs and contemporary interpretations, bringing every ensemble to a higher level of sophistication and elegance.",
    image: `${IMG}/collection-elegance.jpg`,
    imageAlt:
      "A woman in a camel coat holding her black-gloved hands to her chest",
    linkLabel: "Shop Gloves",
    linkUrl: "/shop",
  },
  {
    heading: "Chic Comfort Leather Gloves for All Occasions",
    body: "With our stylish leather gloves, perfect for any occasion or ensemble, you can experience the perfect blend of comfort and elegance. Whether you're heading to a formal function or just going out for a casual get-together, our wide selection provides the ideal balance of luxury and functionality to keep you warm and fashionable all year long.",
    image: `${IMG}/collection-chic.jpg`,
    imageAlt: "Black leather gloves with silver chain details being adjusted",
    linkLabel: "Shop Gloves",
    linkUrl: "/shop",
  },
];

const collectionsData: TemplateField[] = [
  {
    key: "glove.homepage.collections-heading",
    label: "Heading",
    description: "Heading above the collection cards.",
    type: "text",
    page: "homepage",
    group: "homepage.collections",
    gridColumn: "col-span-full",
    defaultValue: "Our Collections Redefine Luxury Online.",
  },
  {
    key: "glove.homepage.collections-intro",
    label: "Intro",
    description: "Paragraph under the heading. Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "homepage.collections",
    gridColumn: "col-span-full",
    defaultValue:
      "As one of the best stores online, we take pride in offering a meticulously curated selection of the finest fashion and accessories. From opulent accessories to high-end fashion, we curate an exclusive range of charms to cater to the discerning tastes of our sophisticated and celebrated woman.",
    placeholder: "Two or three sentences about your range",
  },
  {
    key: "glove.homepage.collections-list",
    label: "Collection cards",
    description:
      "Large photo cards with a frosted text panel. Two fit best side by side.",
    type: "list",
    page: "homepage",
    group: "homepage.collections",
    gridColumn: "col-span-full",
    minItems: 1,
    maxItems: 4,
    itemLabel: "card",
    summaryKey: "heading",
    defaultsWhenEmpty: true,
    itemSchema: [
      {
        key: "heading",
        label: "Heading",
        type: "text",
        description: "Card heading.",
        placeholder: "e.g. Everyday Elegance",
      },
      {
        key: "body",
        label: "Text",
        type: "textarea",
        optional: true,
        description: "Paragraph under the heading. Leave blank to hide.",
        placeholder: "Two or three sentences",
      },
      {
        key: "image",
        label: "Photo",
        type: "image",
        description: "Photo behind the card. A tall crop works best.",
      },
      {
        key: "imageAlt",
        label: "Photo description",
        type: "text",
        optional: true,
        description:
          "Describe the photo for screen readers. Leave blank to treat it as decoration.",
      },
      {
        key: "linkLabel",
        label: "Link label",
        type: "text",
        optional: true,
        description: "Small button under the text. Leave blank to hide it.",
        placeholder: "e.g. Shop Gloves",
      },
      {
        key: "linkUrl",
        label: "Link",
        type: "url",
        optional: true,
        description: "Where the card button goes.",
        placeholder: "/shop",
      },
    ],
    defaultRows: GLOVE_COLLECTIONS_DEFAULT_ROWS,
  },
];

// ─── Featured gloves (hideable, needs products) ─────────────────────────────

const featuredData: TemplateField[] = [
  {
    key: "glove.homepage.featured-heading",
    label: "Heading",
    description:
      "Heading above the product row. The row shows your featured products first, then your newest. It hides itself when the store has no products.",
    type: "text",
    page: "homepage",
    group: "homepage.featured",
    gridColumn: "col-span-full",
    defaultValue:
      "Gloves Crafted with Love: Treat Yourself or a Special Woman in Your Life.",
  },
];

// ─── Promise strip (hideable) ───────────────────────────────────────────────

/** Built-in promise strip items (`glove.homepage.promise-list`'s `defaultRows`). */
export const GLOVE_PROMISE_DEFAULT_ROWS: Record<string, string>[] = [
  {
    icon: `${IMG}/feature-delivery.png`,
    title: "Free Delivery",
    detail: "from $100",
  },
  {
    icon: `${IMG}/feature-quality.png`,
    title: "Best Quality",
    detail: "Brand",
  },
  {
    icon: `${IMG}/feature-returns.png`,
    title: "30 Day",
    detail: "for free Return",
  },
  {
    icon: `${IMG}/feature-feedback.png`,
    title: "Feedback",
    detail: "We read every note",
  },
  {
    icon: `${IMG}/feature-payment.png`,
    title: "Payment",
    detail: "Secure",
  },
];

const promiseData: TemplateField[] = [
  {
    key: "glove.homepage.promise-list",
    label: "Promises",
    description:
      "A row of short store promises, each with a small icon. Five fit best in one row.",
    type: "list",
    page: "homepage",
    group: "homepage.promise",
    gridColumn: "col-span-full",
    minItems: 1,
    maxItems: 6,
    itemLabel: "promise",
    summaryKey: "title",
    defaultsWhenEmpty: true,
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "image",
        description: "Small icon above the text (about 80px wide).",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Short bold line.",
        placeholder: "e.g. Free Delivery",
      },
      {
        key: "detail",
        label: "Detail",
        type: "text",
        optional: true,
        description: "Smaller line under the title. Leave blank to hide.",
        placeholder: "e.g. from $100",
      },
    ],
    defaultRows: GLOVE_PROMISE_DEFAULT_ROWS,
  },
];

// ─── Charms (hideable, needs a collection) ──────────────────────────────────

const charmsData: TemplateField[] = [
  {
    key: "glove.homepage.charms-heading",
    label: "Heading",
    description: "Heading above the charms carousel.",
    type: "text",
    page: "homepage",
    group: "homepage.charms",
    gridColumn: "col-span-1",
    defaultValue: "CHARMS",
  },
  {
    key: "glove.homepage.charms-collection-slug",
    label: "Collection to show",
    description:
      "The web address name (slug) of the collection whose products fill the carousel, such as “charms”. The whole section hides when the collection is missing or empty.",
    type: "text",
    page: "homepage",
    group: "homepage.charms",
    gridColumn: "col-span-1",
    defaultValue: "charms",
    placeholder: "e.g. charms",
  },
];

// ─── Sorority (hideable) ────────────────────────────────────────────────────

const sororityData: TemplateField[] = [
  {
    key: "glove.homepage.sorority-image",
    label: "Photo",
    description: "Wide photo under the heading.",
    type: "image",
    page: "homepage",
    group: "homepage.sorority",
    gridColumn: "col-span-full",
    defaultValue: `${IMG}/sorority.jpg`,
  },
  {
    key: "glove.homepage.sorority-image-alt",
    label: "Photo description",
    description:
      "Describe the photo for screen readers. Leave blank to treat it as decoration.",
    type: "text",
    page: "homepage",
    group: "homepage.sorority",
    gridColumn: "col-span-full",
    defaultValue:
      "Four glove and color pairings showing sorority color combinations",
    placeholder: "What the photo shows",
  },
  {
    key: "glove.homepage.sorority-heading",
    label: "Heading",
    description: "Heading of the sorority band.",
    type: "text",
    page: "homepage",
    group: "homepage.sorority",
    gridColumn: "col-span-full",
    defaultValue: "Uplift the Women in Your Sorority with The Luvgluv",
  },
  {
    key: "glove.homepage.sorority-body",
    label: "Text",
    description: "Line under the heading. Leave blank to hide.",
    type: "textarea",
    page: "homepage",
    group: "homepage.sorority",
    gridColumn: "col-span-full",
    defaultValue:
      "Show your Sorority pride when you wear The LuvGluv in your Sorority's colors!",
    placeholder: "One sentence",
  },
  {
    key: "glove.homepage.sorority-button-label",
    label: "Button label",
    description: "Button under the text. Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.sorority",
    gridColumn: "col-span-1",
    defaultValue: "Shop Now",
  },
  {
    key: "glove.homepage.sorority-button-url",
    label: "Button link",
    description: "Where the sorority button goes.",
    type: "url",
    page: "homepage",
    group: "homepage.sorority",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
];

// ─── VIP list (hideable, needs customer accounts) ───────────────────────────

const vipData: TemplateField[] = [
  {
    key: "glove.homepage.vip-heading",
    label: "Heading",
    description:
      "Heading of the newsletter band. The band hides itself when customer accounts are switched off.",
    type: "text",
    page: "homepage",
    group: "homepage.vip",
    gridColumn: "col-span-full",
    defaultValue: "Stay in the Know with Our Newsletter!",
  },
  {
    key: "glove.homepage.vip-body",
    label: "Text",
    description: "Line under the heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.vip",
    gridColumn: "col-span-full",
    defaultValue:
      "Sign up for the latest updates from your favorite The LuvGluv",
    placeholder: "One sentence",
  },
  {
    key: "glove.homepage.vip-note",
    label: "Helper text",
    description:
      "Explains how shoppers opt in. Shoppers create an account, then choose email updates in their account preferences. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "homepage.vip",
    gridColumn: "col-span-full",
    defaultValue:
      "Create a free account, then choose email updates in your account preferences. You can change your mind any time.",
    placeholder: "How to join",
  },
  {
    key: "glove.homepage.vip-button-label",
    label: "Button label",
    description: "Button that sends shoppers to create an account.",
    type: "text",
    page: "homepage",
    group: "homepage.vip",
    gridColumn: "col-span-1",
    defaultValue: "Join the VIP List",
  },
  {
    key: "glove.homepage.vip-button-url",
    label: "Button link",
    description: "Where the VIP button goes.",
    type: "url",
    page: "homepage",
    group: "homepage.vip",
    gridColumn: "col-span-1",
    defaultValue: "/auth/sign-up",
    placeholder: "/auth/sign-up",
  },
];

// ─── Exports ────────────────────────────────────────────────────────────────

export const gloveHomepageData: TemplateField[] = [
  ...heroData,
  ...stylesData,
  ...storyData,
  ...gloveStepsData,
  ...giftData,
  ...collectionsData,
  ...featuredData,
  ...promiseData,
  ...charmsData,
  ...sororityData,
  ...vipData,
];

export const gloveHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero",
    description: "Photo, heading and button at the top of the homepage.",
    icon: "🖼️",
    columns: 2,
  },
  {
    id: "homepage.styles",
    title: "Glove styles",
    description: "Round photo cards for each glove style.",
    icon: "🧤",
    columns: 1,
  },
  {
    id: "homepage.story",
    title: "Our story",
    description: "Story band with a video, two paragraphs and a sign-off.",
    icon: "📖",
    columns: 2,
  },
  ...gloveStepsFieldGroups,
  {
    id: "homepage.gift",
    title: "Gift cards",
    description: "Gift card promotion with a round photo.",
    icon: "🎁",
    columns: 2,
  },
  {
    id: "homepage.collections",
    title: "Collections",
    description: "Two large photo cards that introduce your collections.",
    icon: "🗂️",
    columns: 1,
  },
  {
    id: "homepage.featured",
    title: "Featured gloves",
    description: "A row of real products on a full-width band.",
    icon: "⭐",
    columns: 1,
  },
  {
    id: "homepage.promise",
    title: "Promise strip",
    description: "A row of short store promises with icons.",
    icon: "✅",
    columns: 1,
  },
  {
    id: "homepage.charms",
    title: "Charms",
    description: "A carousel of products from your charms collection.",
    icon: "✨",
    columns: 2,
  },
  {
    id: "homepage.sorority",
    title: "Sorority",
    description: "Photo band for sorority and group orders.",
    icon: "💜",
    columns: 2,
  },
  {
    id: "homepage.vip",
    title: "VIP list",
    description: "Newsletter band that sends shoppers to create an account.",
    icon: "💌",
    columns: 2,
  },
];

/**
 * Curated sections for the homepage, in render order. The orchestrator
 * spreads this into the template's `gloveSections`.
 */
export const gloveHomepageSections: TemplateSection[] = [
  {
    id: "homepage.hero",
    page: "homepage",
    title: "Hero",
    description: "Photo, heading and button at the top of the homepage.",
    groupIds: ["homepage.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "homepage.styles",
    page: "homepage",
    title: "Glove styles",
    description: "Round photo cards for each glove style.",
    groupIds: ["homepage.styles"],
    order: 1,
    hideable: true,
    links: [SECTION_LINKS.products],
  },
  {
    id: "homepage.story",
    page: "homepage",
    title: "Our story",
    description: "Story band with a video, two paragraphs and a sign-off.",
    groupIds: ["homepage.story"],
    order: 2,
    hideable: true,
  },
  {
    id: "homepage.steps",
    page: "homepage",
    title: "Easy steps",
    description:
      "The numbered guide to building a pair of gloves. Also shown on the easy guide page.",
    groupIds: ["homepage.steps"],
    order: 3,
    hideable: true,
  },
  {
    id: "homepage.gift",
    page: "homepage",
    title: "Gift cards",
    description: "Gift card promotion with a round photo.",
    groupIds: ["homepage.gift"],
    order: 4,
    hideable: true,
    links: [SECTION_LINKS.products],
  },
  {
    id: "homepage.collections",
    page: "homepage",
    title: "Collections",
    description: "Two large photo cards that introduce your collections.",
    groupIds: ["homepage.collections"],
    order: 5,
    hideable: true,
    links: [SECTION_LINKS.collections],
  },
  {
    id: "homepage.featured",
    page: "homepage",
    title: "Featured gloves",
    description:
      "Your featured products, or newest ones, on a full-width band. Hides itself when there are no products.",
    groupIds: ["homepage.featured"],
    order: 6,
    hideable: true,
    links: [SECTION_LINKS.products],
  },
  {
    id: "homepage.promise",
    page: "homepage",
    title: "Promise strip",
    description: "A row of short store promises with icons.",
    groupIds: ["homepage.promise"],
    order: 7,
    hideable: true,
  },
  {
    id: "homepage.charms",
    page: "homepage",
    title: "Charms",
    description:
      "A carousel of products from your charms collection. Hides itself when that collection is missing or empty.",
    groupIds: ["homepage.charms"],
    order: 8,
    hideable: true,
    links: [SECTION_LINKS.collections],
  },
  {
    id: "homepage.sorority",
    page: "homepage",
    title: "Sorority",
    description: "Photo band for sorority and group orders.",
    groupIds: ["homepage.sorority"],
    order: 9,
    hideable: true,
  },
  {
    id: "homepage.vip",
    page: "homepage",
    title: "VIP list",
    description:
      "Newsletter band that sends shoppers to create an account. Hides itself when customer accounts are off.",
    groupIds: ["homepage.vip"],
    order: 10,
    hideable: true,
  },
];
