import type { RelocationIconRow, RelocationPhotoRow } from "./rows";
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

// Type-only re-export keeps existing `from "."`/`from "../homepage"` type
// imports working. The RUNTIME parsers live in ./rows — never import them
// here: this module sits inside ~/lib/template-fields' aggregation cycle and
// a runtime edge back into that module TDZ-crashes every storefront route.
export type { RelocationIconRow, RelocationPhotoRow } from "./rows";

/**
 * Homepage field module for `relocation` (Handy Relocations).
 *
 * Covers design.md → "Per-page section concepts → Homepage": hero, quote form,
 * services, founders, service area, "3 great reasons", testimonials, gallery
 * and the brochure CTA. The tenth section — the credentials band — is global
 * (`global.credentials`, see `../layout/index.ts`) because it repeats on every
 * page; the homepage only overrides its heading.
 *
 * All copy is the source homepage verbatim (clone `page.tsx`, cross-checked
 * against docs/relocation/"Handy Relocations · 2.32pm · 08-06.jpeg").
 */

/**
 * `list` fields cannot carry a real `defaultValue` (the editor stores rows as
 * a JSON array, and every list in the repo ships `defaultValue: ""`), so the
 * shipped rows live here as component-side fallbacks and are passed to the
 * parse helper — the same pattern as `DEFAULT_POLLEN_SERVICES`.
 */
export const DEFAULT_RELOCATION_SERVICES: RelocationIconRow[] = [
  {
    image: "/templates/relocation/images/service-local-long-distance.webp",
    alt: "Illustration of a moving truck inside a red ring",
    title: "Local Moving & Long Distance",
    text: "We’re happy to move your belongings with care, anywhere across the U.S. or Canada!",
  },
  {
    image: "/templates/relocation/images/service-packing.webp",
    alt: "Illustration of packed boxes and household items inside a pink ring",
    title: "Packing Services",
    text: "Our professional moving team specializes in handling and packing with care, your most fragile items. Packing services are provided prior to your scheduled move day.",
  },
  {
    image: "/templates/relocation/images/service-labor-only.webp",
    alt: "Illustration of a loaded moving trailer inside a teal ring",
    title: "Labor Only",
    text: "If you choose to provide your own moving truck or container, no worries! We can accommodate you! This option is great for saving on time and money.",
  },
  {
    image: "/templates/relocation/images/service-full-service.webp",
    alt: "Illustration of two movers carrying a sofa inside a yellow ring",
    title: "Full Service",
    text: "We’ll handle the heavy lifting from start to finish – including packing, unpacking, loading, unloading and driving too",
  },
  {
    image: "/templates/relocation/images/service-furniture-pickup.webp",
    alt: "Illustration of movers carrying an armchair inside a blue ring",
    title: "Furniture Pick Up & Delivery",
    text: "Our pickup and delivery services will help you get that large piece of furniture or bulky item to its final destination and lessen your moving stress!",
  },
];

export const DEFAULT_RELOCATION_REASONS: RelocationIconRow[] = [
  {
    image: "/templates/relocation/images/reason-pricing.webp",
    alt: "Illustration of a stack of banknotes",
    title: "Clear And Transparent Pricing",
    text: "Hidden fees? Never at Handy! From labor only to full moves, our pricing is simple and straightforward!",
  },
  {
    image: "/templates/relocation/images/reason-dependability.webp",
    alt: "Illustration of two hands shaking",
    title: "Dependability",
    text: "At Handy, we treat your move as if it was our own. Reliability and genuine care are at the core of what we do, and our goal is to ensure you have full peace of mind",
  },
  {
    image: "/templates/relocation/images/reason-insurance.webp",
    alt: "Illustration of a protective shield",
    title: "Insurance For The Just-in-Case Moments",
    text: "We take the utmost care when packing and moving your belongings, but even when accidents happen, we have your back!",
  },
];

export const DEFAULT_RELOCATION_GALLERY: RelocationPhotoRow[] = [
  {
    image: "/templates/relocation/images/gallery-1.webp",
    alt: "The Handy Relocations crew loading a truck on moving day",
  },
  {
    image: "/templates/relocation/images/gallery-2.webp",
    alt: "A mover stacking boxes inside the back of a moving truck",
  },
  {
    image: "/templates/relocation/images/gallery-3.webp",
    alt: "Movers securing furniture in a fully loaded truck",
  },
  {
    image: "/templates/relocation/images/gallery-4.webp",
    alt: "The crew unloading a customer’s belongings at their new home",
  },
];

// ─── homepage.hero ───────────────────────────────────────────────────────────

const homepageHeroData: TemplateField[] = [
  {
    key: "relocation.homepage.hero-heading",
    label: "Hero Heading",
    description:
      "The big white headline on the terracotta wave at the top of the homepage.",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue: "Handy Relocations, When all you need is a helping hand",
  },
  {
    key: "relocation.homepage.hero-subheading",
    label: "Hero Paragraph",
    description:
      "Short reassurance paragraph under the hero headline. Leave blank to hide it.",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Moving to a new place can be stressful, but moving your belongings shouldn’t be! At Handy Relocations, our moving and logistics teams are standing by and ready to take the stress out of your move! Whether it’s across the city or the country, we’re here for you every step of the way!",
  },
  {
    key: "relocation.homepage.hero-image",
    label: "Hero Photo",
    description:
      "Circular crew photo beside the hero headline. Leave blank to run the headline full width.",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "/templates/relocation/images/hero-portrait.webp",
  },
  {
    key: "relocation.homepage.hero-image-alt",
    label: "Hero Photo Alt Text",
    description: "Accessible description of the hero photo.",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-1",
    defaultValue: "A Handy Relocations mover beside a loaded moving truck",
  },
];

// ─── homepage.quote-form ─────────────────────────────────────────────────────

const homepageQuoteFormData: TemplateField[] = [
  {
    key: "relocation.homepage.quote-image",
    label: "Quote Section Photo",
    description:
      "Tall photo on the left of the free-quote form. Leave blank to run the form full width.",
    type: "image",
    page: "homepage",
    group: "homepage.quote-form",
    gridColumn: "col-span-1",
    defaultValue: "/templates/relocation/images/quote-form-photo.webp",
  },
  {
    key: "relocation.homepage.quote-image-alt",
    label: "Quote Section Photo Alt Text",
    description: "Accessible description of the quote-section photo.",
    type: "text",
    page: "homepage",
    group: "homepage.quote-form",
    gridColumn: "col-span-1",
    defaultValue:
      "A Handy Relocations mover standing in front of a loaded U-Haul truck",
  },
  {
    key: "relocation.homepage.quote-heading",
    label: "Quote Form Heading",
    description:
      "Centred heading above the form. Line breaks you type here are kept.",
    type: "textarea",
    page: "homepage",
    group: "homepage.quote-form",
    gridColumn: "col-span-full",
    defaultValue: "GET YOUR FREE\nMOVING QUOTES HERE",
  },
  {
    key: "relocation.homepage.quote-name-label",
    label: "Name Group Label",
    description: "Label above the First Name / Last Name pair.",
    type: "text",
    page: "homepage",
    group: "homepage.quote-form",
    gridColumn: "col-span-1",
    defaultValue: "Name",
  },
  {
    key: "relocation.homepage.quote-first-label",
    label: "First Name Label",
    description: "Label on the first-name box.",
    type: "text",
    page: "homepage",
    group: "homepage.quote-form",
    gridColumn: "col-span-1",
    defaultValue: "First Name",
  },
  {
    key: "relocation.homepage.quote-last-label",
    label: "Last Name Label",
    description: "Label on the last-name box.",
    type: "text",
    page: "homepage",
    group: "homepage.quote-form",
    gridColumn: "col-span-1",
    defaultValue: "Last Name",
  },
  {
    key: "relocation.homepage.quote-email-label",
    label: "Email Label",
    description: "Label on the email box. Email is always required.",
    type: "text",
    page: "homepage",
    group: "homepage.quote-form",
    gridColumn: "col-span-1",
    defaultValue: "Email",
  },
  {
    key: "relocation.homepage.quote-email-placeholder",
    label: "Email Placeholder",
    description: "Grey hint text inside the empty email box.",
    type: "text",
    page: "homepage",
    group: "homepage.quote-form",
    gridColumn: "col-span-1",
    defaultValue: "Email Address",
  },
  {
    key: "relocation.homepage.quote-phone-label",
    label: "Phone Label",
    description: "Label on the phone box. The phone number is optional.",
    type: "text",
    page: "homepage",
    group: "homepage.quote-form",
    gridColumn: "col-span-1",
    defaultValue: "Mobile Phone",
  },
  {
    key: "relocation.homepage.quote-submit-label",
    label: "Submit Button Label",
    description: "The deep terracotta button under the form.",
    type: "text",
    page: "homepage",
    group: "homepage.quote-form",
    gridColumn: "col-span-1",
    defaultValue: "Continue to Free Estimate",
  },
  {
    key: "relocation.homepage.quote-success-heading",
    label: "Thank-You Heading",
    description: "Shown in place of the form once a request has been sent.",
    type: "text",
    page: "homepage",
    group: "homepage.quote-form",
    gridColumn: "col-span-1",
    defaultValue: "Thanks!",
  },
  {
    key: "relocation.homepage.quote-success-body",
    label: "Thank-You Message",
    description: "The reassurance line under the thank-you heading.",
    type: "textarea",
    page: "homepage",
    group: "homepage.quote-form",
    gridColumn: "col-span-full",
    defaultValue:
      "We’ve received your request — our team will get in contact with you at their earliest convenience.",
  },
  {
    key: "relocation.homepage.quote-success-again-label",
    label: "Send-Another Button Label",
    description: "Returns the visitor to a blank form after a successful send.",
    type: "text",
    page: "homepage",
    group: "homepage.quote-form",
    gridColumn: "col-span-1",
    defaultValue: "Send another request",
  },
];

// ─── homepage.services ───────────────────────────────────────────────────────

const homepageServicesData: TemplateField[] = [
  {
    key: "relocation.homepage.services-list",
    label: "Services",
    description:
      "The illustrated service rows. They flow down the left column first, then the right. Leave the list untouched to keep the five shipped services.",
    type: "list",
    page: "homepage",
    group: "homepage.services",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      { key: "image", label: "Badge Illustration", type: "image" },
      {
        key: "alt",
        label: "Badge Alt Text",
        type: "text",
        placeholder: "Describe the illustration",
      },
      {
        key: "title",
        label: "Service Name",
        type: "text",
        placeholder: "Packing Services",
      },
      {
        key: "text",
        label: "Description",
        type: "textarea",
        placeholder: "One or two sentences about this service",
      },
    ],
    defaultValue: "",
  },
];

// ─── homepage.founders ───────────────────────────────────────────────────────

const homepageFoundersData: TemplateField[] = [
  {
    key: "relocation.homepage.founders-badge",
    label: "Founders Badge",
    description:
      "The Handy badge above the founders paragraph. Leave blank to hide it.",
    type: "image",
    page: "homepage",
    group: "homepage.founders",
    gridColumn: "col-span-1",
    defaultValue: "/templates/relocation/images/founders-badge.webp",
  },
  {
    key: "relocation.homepage.founders-badge-alt",
    label: "Founders Badge Alt Text",
    description: "Accessible description of the badge.",
    type: "text",
    page: "homepage",
    group: "homepage.founders",
    gridColumn: "col-span-1",
    defaultValue: "The Handy Relocations badge logo",
  },
  {
    key: "relocation.homepage.founders-body",
    label: "Founders Story",
    description: "The paragraph about how Handy Relocations started.",
    type: "textarea",
    page: "homepage",
    group: "homepage.founders",
    gridColumn: "col-span-full",
    defaultValue:
      "Emile Vincent and Jarrel Lowman founded Handy Relocations on the principles of hard work and dedication. They found the fast-paced environment of moving and logistics a perfect place for the work ethic they developed in the hip-hop industry. Handy has since flourished, expanding in the Detroit area as a reliable and trusted name in the moving industry.",
  },
  {
    key: "relocation.homepage.founders-image",
    label: "Founders Photo",
    description:
      "Tall crew photo beside the founders paragraph. Leave blank to run the paragraph full width.",
    type: "image",
    page: "homepage",
    group: "homepage.founders",
    gridColumn: "col-span-1",
    defaultValue: "/templates/relocation/images/founders-portrait.webp",
  },
  {
    key: "relocation.homepage.founders-image-alt",
    label: "Founders Photo Alt Text",
    description: "Accessible description of the founders photo.",
    type: "text",
    page: "homepage",
    group: "homepage.founders",
    gridColumn: "col-span-1",
    defaultValue: "A Handy Relocations mover in front of a loaded ABF trailer",
  },
];

// ─── homepage.service-area ───────────────────────────────────────────────────

const homepageServiceAreaData: TemplateField[] = [
  {
    key: "relocation.homepage.service-area-image",
    label: "Service Area Map",
    description: "The county map beside the service-area heading.",
    type: "image",
    page: "homepage",
    group: "homepage.service-area",
    gridColumn: "col-span-1",
    defaultValue: "/templates/relocation/images/michigan-map.webp",
  },
  {
    key: "relocation.homepage.service-area-image-alt",
    label: "Service Area Map Alt Text",
    description: "Accessible description of the map.",
    type: "text",
    page: "homepage",
    group: "homepage.service-area",
    gridColumn: "col-span-1",
    defaultValue:
      "A county map of Michigan with the Handy Relocations badge over the Detroit area",
  },
  {
    key: "relocation.homepage.service-area-heading",
    label: "Service Area Heading",
    description: "The big terracotta heading beside the map.",
    type: "text",
    page: "homepage",
    group: "homepage.service-area",
    gridColumn: "col-span-full",
    defaultValue: "WE SERVE THE DETROIT AREA!",
  },
];

// ─── homepage.reasons ────────────────────────────────────────────────────────

const homepageReasonsData: TemplateField[] = [
  {
    key: "relocation.homepage.reasons-heading",
    label: "Reasons Heading",
    description:
      "The big terracotta heading above the three reason columns. Line breaks you type here are kept.",
    type: "textarea",
    page: "homepage",
    group: "homepage.reasons",
    gridColumn: "col-span-full",
    defaultValue: "3 GREAT REASONS\nTO CHOOSE HANDY",
  },
  {
    key: "relocation.homepage.reasons-list",
    label: "Reasons",
    description:
      "The reason columns under the heading. Leave the list untouched to keep the three shipped reasons.",
    type: "list",
    page: "homepage",
    group: "homepage.reasons",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      { key: "image", label: "Icon", type: "image" },
      {
        key: "alt",
        label: "Icon Alt Text",
        type: "text",
        placeholder: "Describe the icon",
      },
      {
        key: "title",
        label: "Reason",
        type: "text",
        placeholder: "Dependability",
      },
      {
        key: "text",
        label: "Description",
        type: "textarea",
        placeholder: "A sentence or two about this reason",
      },
    ],
    defaultValue: "",
  },
];

// ─── homepage.testimonials ───────────────────────────────────────────────────

const homepageTestimonialsData: TemplateField[] = [
  {
    key: "relocation.homepage.testimonials-heading",
    label: "Testimonials Heading",
    description:
      "The right-aligned heading above the review carousel. The reviews themselves come from Content → Testimonials, and the whole section hides until you have an approved one.",
    type: "text",
    page: "homepage",
    group: "homepage.testimonials",
    gridColumn: "col-span-full",
    defaultValue: "Our Client Testimonials!",
  },
];

// ─── homepage.gallery ────────────────────────────────────────────────────────

const homepageGalleryData: TemplateField[] = [
  {
    key: "relocation.homepage.gallery-heading",
    label: "Gallery Heading",
    description: "The charcoal heading above the circular crew photos.",
    type: "text",
    page: "homepage",
    group: "homepage.gallery",
    gridColumn: "col-span-full",
    defaultValue: "HANDY RELOCATIONS MOVERS IN ACTION",
  },
  {
    key: "relocation.homepage.gallery-list",
    label: "Gallery Photos",
    description:
      "The circular photos of the crew at work. Leave the list untouched to keep the four shipped photos.",
    type: "list",
    page: "homepage",
    group: "homepage.gallery",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      { key: "image", label: "Photo", type: "image" },
      {
        key: "alt",
        label: "Photo Alt Text",
        type: "text",
        placeholder: "Describe what is happening in the photo",
      },
    ],
    defaultValue: "",
  },
];

// ─── homepage.brochure ───────────────────────────────────────────────────────

const homepageBrochureData: TemplateField[] = [
  {
    key: "relocation.homepage.brochure-heading",
    label: "Brochure Heading",
    description:
      "The large heading on the grey band near the foot of the page.",
    type: "text",
    page: "homepage",
    group: "homepage.brochure",
    gridColumn: "col-span-full",
    defaultValue: "Preparing for your move?",
  },
  {
    key: "relocation.homepage.brochure-body",
    label: "Brochure Line",
    description: "The sentence beside the heading, above the button.",
    type: "textarea",
    page: "homepage",
    group: "homepage.brochure",
    gridColumn: "col-span-full",
    defaultValue: "Be sure to check out the ready to move brochure!",
  },
  {
    key: "relocation.homepage.brochure-cta-label",
    label: "Brochure Button Label",
    description: "Leave blank to hide the button.",
    type: "text",
    page: "homepage",
    group: "homepage.brochure",
    gridColumn: "col-span-1",
    defaultValue: "Check It Out",
  },
  {
    key: "relocation.homepage.brochure-cta-url",
    label: "Brochure Link",
    description:
      "Where the button goes. Opens in a new tab. Defaults to the FMCSA 'Ready to Move' brochure.",
    type: "url",
    page: "homepage",
    group: "homepage.brochure",
    gridColumn: "col-span-1",
    defaultValue:
      "https://www.fmcsa.dot.gov/sites/fmcsa.dot.gov/files/docs/Ready_To_Move_Brochure_2006.pdf",
  },
];

// ─── Exports ─────────────────────────────────────────────────────────────────

export const relocationHomepageData: TemplateField[] = [
  ...homepageHeroData,
  ...homepageQuoteFormData,
  ...homepageServicesData,
  ...homepageFoundersData,
  ...homepageServiceAreaData,
  ...homepageReasonsData,
  ...homepageTestimonialsData,
  ...homepageGalleryData,
  ...homepageBrochureData,
];

export const relocationHomepageFieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero",
    description:
      "Terracotta wave hero: headline, paragraph, call button and circular crew photo",
    icon: "🌊",
    columns: 2,
  },
  {
    id: "homepage.quote-form",
    title: "Free Quote Form",
    description: "Photo, heading and the free-estimate form that emails you",
    icon: "📝",
    columns: 2,
  },
  {
    id: "homepage.services",
    title: "Services",
    description: "The five illustrated service rows",
    icon: "🚚",
    columns: 1,
  },
  {
    id: "homepage.founders",
    title: "Founders",
    description: "Badge, founders story and the tall crew photo",
    icon: "🤝",
    columns: 2,
  },
  {
    id: "homepage.service-area",
    title: "Service Area",
    description: "County map and the 'we serve the Detroit area' heading",
    icon: "🗺️",
    columns: 2,
  },
  {
    id: "homepage.reasons",
    title: "Reasons To Choose Handy",
    description: "Heading plus the three icon columns",
    icon: "⭐",
    columns: 1,
  },
  {
    id: "homepage.testimonials",
    title: "Client Testimonials",
    description: "Heading for the carousel of approved customer reviews",
    icon: "💬",
    columns: 1,
  },
  {
    id: "homepage.gallery",
    title: "Movers In Action",
    description: "Heading and the row of circular crew photos",
    icon: "📷",
    columns: 1,
  },
  {
    id: "homepage.brochure",
    title: "Moving Brochure",
    description: "Grey band linking to the 'Ready to Move' brochure",
    icon: "📄",
    columns: 2,
  },
];

/**
 * Visual render order for the `/editor` section rail.
 *
 * The credentials band that closes the page is deliberately absent: it renders
 * `global.credentials`, a chrome group shared by every wave page, so its
 * `TemplateSection` belongs with the other `global.*` entries rather than being
 * duplicated per page (a `page: "homepage"` entry whose id started `global.`
 * would break the id == group == `data-sp-group` triple match).
 */
export const relocationHomepageSections: TemplateSection[] = [
  {
    id: "homepage.hero",
    page: "homepage",
    title: "Hero",
    description:
      "Wave hero with the headline, paragraph, call button and photo",
    groupIds: ["homepage.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "homepage.quote-form",
    page: "homepage",
    title: "Free Quote Form",
    description: "Photo, heading and the free-estimate form",
    groupIds: ["homepage.quote-form"],
    order: 1,
    hideable: true,
  },
  {
    id: "homepage.services",
    page: "homepage",
    title: "Services",
    description: "Five illustrated service rows in two columns",
    groupIds: ["homepage.services"],
    order: 2,
    hideable: true,
  },
  {
    id: "homepage.founders",
    page: "homepage",
    title: "Founders",
    description: "Badge, founders story and the tall crew photo",
    groupIds: ["homepage.founders"],
    order: 3,
    hideable: true,
  },
  {
    id: "homepage.service-area",
    page: "homepage",
    title: "Service Area",
    description: "County map beside the 'we serve the Detroit area' heading",
    groupIds: ["homepage.service-area"],
    order: 4,
    hideable: true,
  },
  {
    id: "homepage.reasons",
    page: "homepage",
    title: "Reasons To Choose Handy",
    description: "Heading plus three icon columns",
    groupIds: ["homepage.reasons"],
    order: 5,
    hideable: true,
  },
  {
    id: "homepage.testimonials",
    page: "homepage",
    title: "Client Testimonials",
    description: "Carousel of approved customer reviews",
    groupIds: ["homepage.testimonials"],
    order: 6,
    hideable: true,
    links: [SECTION_LINKS.testimonials],
  },
  {
    id: "homepage.gallery",
    page: "homepage",
    title: "Movers In Action",
    description: "Row of circular crew photos",
    groupIds: ["homepage.gallery"],
    order: 7,
    hideable: true,
  },
  {
    id: "homepage.brochure",
    page: "homepage",
    title: "Moving Brochure",
    description: "Grey band linking to the 'Ready to Move' brochure",
    groupIds: ["homepage.brochure"],
    order: 8,
    hideable: true,
  },
];
