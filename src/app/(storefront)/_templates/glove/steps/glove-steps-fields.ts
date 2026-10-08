import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Shared "6 easy steps" block. Its fields live on the HOMEPAGE page key so a
 * single edit updates both the homepage and the easy-guide page
 * (`glove-steps.tsx` renders it in both places).
 *
 * This module is a field-definition leaf: it must not import the renderer or
 * anything that reaches the field registry (see field-conventions.md, "List
 * defaults").
 */

export const GLOVE_STEPS_HEADING_KEY = "glove.homepage.steps-heading";
export const GLOVE_STEPS_LIST_KEY = "glove.homepage.steps-list";
export const GLOVE_STEPS_CLOSING_HEADING_KEY =
  "glove.homepage.steps-closing-heading";
export const GLOVE_STEPS_CLOSING_LABEL_KEY =
  "glove.homepage.steps-closing-label";
export const GLOVE_STEPS_CLOSING_URL_KEY = "glove.homepage.steps-closing-url";

export const GLOVE_STEPS_FIELD_KEYS = [
  GLOVE_STEPS_HEADING_KEY,
  GLOVE_STEPS_CLOSING_HEADING_KEY,
  GLOVE_STEPS_CLOSING_LABEL_KEY,
  GLOVE_STEPS_CLOSING_URL_KEY,
];

/**
 * Built-in step rows (`glove.homepage.steps-list`'s `defaultRows`). Copy is
 * the live site's, verbatim; **double asterisks** mark bold option words.
 * "fushia" on the live site is corrected to "fuchsia".
 */
export const GLOVE_STEPS_DEFAULT_ROWS: Record<string, string>[] = [
  {
    title: "Choose Your Glove",
    accent: "Style",
    body: "There’s our **classic** glove for full coverage (pictured), **half** glove for more freedom of movement, **fingerless** glove for long nailed or phone tapping ladies, or **driving** glove for women who love to ride.",
    image: "/templates/glove/images/step-1-style.jpg",
    imageAlt:
      "Hot pink leather gloves with silver chains, worn with arms crossed",
    buttonLabel: "Explore Glove Styles",
    buttonUrl: "/shop",
  },
  {
    title: "Choose Your Glove",
    accent: "Color",
    body: "We currently have gloves in a variety of colors including **black**, **navy**, **royal blue**, **forest green**, **red**, and **fuchsia**. New colors coming soon!",
    image: "/templates/glove/images/step-2-color.jpg",
    imageAlt:
      "Color swatches: black, navy, royal blue, forest green, red and fuchsia",
    buttonLabel: "",
    buttonUrl: "",
  },
  {
    title: "Choose Your Glove",
    accent: "Size",
    body: "All glove styles coming in Small, Medium, Large, and X-Large. We have found the gloves run small so we recommend **ordering one size up**.",
    image: "/templates/glove/images/step-3-size.jpg",
    imageAlt:
      "A gold chain with a crystal elephant charm hanging from a red leather handbag",
    buttonLabel: "",
    buttonUrl: "",
  },
  {
    title: "Choose Your",
    accent: "Grommet Color",
    body: "Is she a gold or silver lover? Each pair of gloves has grommets (holes) and O-Rings (on which to attach your chain) that come in either silver or gold. Black gloves come with black grommets. **NOTE: Gold grommets not available at this time.**",
    image: "/templates/glove/images/step-4-grommet.jpg",
    imageAlt:
      "Royal blue and forest green leather gloves with metal grommets and chains",
    buttonLabel: "",
    buttonUrl: "",
  },
  {
    title: "Choose Your",
    accent: "Chain",
    body: "Your chain is how you’ll get your personalized charms onto your LuvGluv. We currently have two styles of chains, a crystal silver chain and a crystal gold chain.",
    image: "/templates/glove/images/step-5-chain.jpg",
    imageAlt: "A crystal silver chain and a crystal gold chain",
    buttonLabel: "View All Chains",
    buttonUrl: "/collections/chains",
  },
  {
    title: "Choose Your",
    accent: "Charms",
    body: "The real FUN begins here! Whether she is a mother, fur baby mama, or something else, we have the perfect charm for her. Your gloves come with one charm, with more charms available.",
    image: "/templates/glove/images/step-6-charms.jpg",
    imageAlt:
      "Silver charms: crossed hands, a crystal triangle and an elephant",
    buttonLabel: "View All Charms",
    buttonUrl: "/collections/charms",
  },
];

export const gloveStepsData: TemplateField[] = [
  {
    key: GLOVE_STEPS_HEADING_KEY,
    label: "Heading",
    description:
      "Heading above the steps. It is the main page heading on the easy guide page and a section heading on the homepage.",
    type: "text",
    page: "homepage",
    group: "homepage.steps",
    gridColumn: "col-span-full",
    defaultValue: "Create Your Perfect LuvGluv in 6 Easy Steps",
  },
  {
    key: GLOVE_STEPS_LIST_KEY,
    label: "Steps",
    description:
      "The numbered steps, in order. The number on each purple disc follows the row order. Step body text accepts **double asterisks** around words to make them bold. The easy guide page also shows each step's button; the homepage hides them.",
    type: "list",
    page: "homepage",
    group: "homepage.steps",
    gridColumn: "col-span-full",
    minItems: 1,
    maxItems: 9,
    itemLabel: "step",
    summaryKey: "accent",
    defaultsWhenEmpty: true,
    itemSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        description:
          "The first part of the step title, in regular weight, such as “Choose Your Glove”.",
        placeholder: "e.g. Choose Your",
      },
      {
        key: "accent",
        label: "Title accent word",
        type: "text",
        optional: true,
        description:
          "The word or words shown in italics at the end of the title. Leave blank for a plain title.",
        placeholder: "e.g. Style",
      },
      {
        key: "body",
        label: "Text",
        type: "textarea",
        description:
          "What the shopper decides in this step. Wrap words in **double asterisks** to make them bold.",
        placeholder: "A sentence or two about this choice",
      },
      {
        key: "image",
        label: "Photo",
        type: "image",
        description: "Photo shown above the step title (wide crop, about 2:1).",
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
        description:
          "Optional button under the step on the easy guide page. Leave blank for no button.",
        placeholder: "e.g. View All Chains",
      },
      {
        key: "buttonUrl",
        label: "Button link",
        type: "url",
        optional: true,
        description: "Where the step button goes.",
        placeholder: "/collections/…",
      },
    ],
    defaultRows: GLOVE_STEPS_DEFAULT_ROWS,
  },
  {
    key: GLOVE_STEPS_CLOSING_HEADING_KEY,
    label: "Closing heading",
    description:
      "Heading under the steps that leads into the button. Leave blank to hide the closing block.",
    type: "text",
    page: "homepage",
    group: "homepage.steps",
    gridColumn: "col-span-1",
    defaultValue: "Ready to Begin?",
  },
  {
    key: GLOVE_STEPS_CLOSING_LABEL_KEY,
    label: "Closing button label",
    description: "Button under the closing heading. Leave blank to hide it.",
    type: "text",
    page: "homepage",
    group: "homepage.steps",
    gridColumn: "col-span-1",
    defaultValue: "Browse Glove Styles",
  },
  {
    key: GLOVE_STEPS_CLOSING_URL_KEY,
    label: "Closing button link",
    description: "Where the closing button goes.",
    type: "url",
    page: "homepage",
    group: "homepage.steps",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },
];

export const gloveStepsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.steps",
    title: "Easy steps",
    description:
      "The numbered guide to building a pair of gloves. Shared by the homepage and the easy guide page.",
    icon: "🔢",
    columns: 2,
  },
];
