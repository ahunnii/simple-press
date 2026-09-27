import type {
  GenericTrustBadgeRow,
  TemplateField,
  TemplateFieldGroup,
} from "~/lib/template-fields";
import { getLucideTemplateIcon } from "~/lib/lucide-template-icons";

/**
 * Product-page fields for the Default template. They apply to EVERY product
 * page — the visual editor previews them on a representative published
 * product (page "product"). The Default product page also renders for every
 * template without its own product page (builders, coop, relocation,
 * wealth), always reading these `default.*` keys, so every text default is
 * the exact copy that was hardcoded in the page before it became a field.
 *
 * NOTE: `~/lib/template-fields` is imported for TYPES only. A value import
 * from it here would be circular (it aggregates every template's root
 * `index.ts`, which spreads this module) — helpers come from the leaf
 * `~/lib/lucide-template-icons` instead.
 */

export const DEFAULT_PRODUCT_TRUST_BADGES_KEY =
  "default.global.product-trust-badges";

/**
 * Built-in trust badges shown while the store-wide list is unsaved or saved
 * empty. Same shape the editor stores (sub-key `title` — see the note on the
 * field). Icons are Lucide names from `TEMPLATE_LUCIDE_ICON_NAMES`; saved rows
 * without an icon still fall back to the plain check mark.
 */
export const DEFAULT_PRODUCT_TRUST_BADGE_ROWS: Record<string, string>[] = [
  { icon: "Truck", title: "Shipping options at checkout" },
  { icon: "ShieldCheck", title: "Secure checkout" },
];

/**
 * Storefront-facing form of `DEFAULT_PRODUCT_TRUST_BADGE_ROWS` — the
 * `GenericTrustBadgeRow[]` fallback `parseTemplateTrustBadgesListRows`
 * expects. A row without an icon produces `{ label }` only, which the
 * render shows with the check-mark fallback.
 */
export const DEFAULT_PRODUCT_TRUST_BADGES: GenericTrustBadgeRow[] =
  DEFAULT_PRODUCT_TRUST_BADGE_ROWS.map((row) => {
    const icon = row.icon ? getLucideTemplateIcon(row.icon) : null;
    return icon ? { icon, label: row.title ?? "" } : { label: row.title ?? "" };
  });

export const DEFAULT_PRODUCT_COMING_SOON_HEADING = "Coming Soon";
export const DEFAULT_PRODUCT_COMING_SOON_BODY =
  "This product isn't available yet. Check back later!";

export const defaultProductData: TemplateField[] = [
  {
    key: "default.product.coming-soon-heading",
    label: "Coming soon heading",
    description:
      "Shown in place of the buy button on products marked as coming soon.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: DEFAULT_PRODUCT_COMING_SOON_HEADING,
    placeholder: "Coming Soon",
  },
  {
    key: "default.product.coming-soon-body",
    label: "Coming soon message",
    description:
      "Line below the coming soon heading on products marked as coming soon. Leave blank to hide.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: DEFAULT_PRODUCT_COMING_SOON_BODY,
    placeholder: "e.g. Back in stock next month.",
  },
  {
    key: DEFAULT_PRODUCT_TRUST_BADGES_KEY,
    label: "Badges",
    description:
      "Up to four short lines shown under the buy button on every product page, before any badges set on the product itself. Leave empty to show the built-in two.",
    type: "list",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    // The text sub-field is keyed `title` (other templates use `label`);
    // renaming it would orphan saved rows, and
    // `parseTemplateTrustBadgesListRows` accepts either.
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Small icon shown before the text.",
      },
      {
        key: "title",
        label: "Text",
        type: "text",
        description: "A few words, e.g. Free returns within 30 days.",
      },
    ],
    minItems: 0,
    maxItems: 4,
    itemLabel: "badge",
    defaultsWhenEmpty: true,
    defaultRows: DEFAULT_PRODUCT_TRUST_BADGE_ROWS,
  },
  {
    key: "default.product.details-label",
    label: "Details section title",
    description:
      "Title of the first expandable section under the buy button on every product page, which shows the product's Additional Information.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Details",
    placeholder: "Details",
  },
  {
    key: "default.product.details-empty-text",
    label: "Details fallback text",
    description:
      "Shown in the Details section on products with no Additional Information set in Products. Leave blank to hide the Details section on those products.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue:
      "Materials, care instructions, and any other details about this product. Edit this from your product settings under 'Additional Information' in the admin panel.",
    placeholder: "e.g. Hand wash cold. Made from recycled cotton.",
  },
  {
    key: "default.product.shipping-label",
    label: "Shipping section title",
    description:
      "Title of the expandable section that holds the shipping description and returns note on every product page. Links to your Shipping Policy and Returns & Refunds Policy pages appear in it when those pages are published.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Shipping & returns",
    placeholder: "Shipping & returns",
  },
  /*
   * Moved here from the template root `index.ts`. These fields moved from
   * page `"global"` to page `"product"` so the visual editor can preview
   * them on a real product page — their KEYS intentionally keep the legacy
   * `default.global.product-*` prefix, because `customFields` values are
   * keyed purely by field key and renaming would orphan every owner-saved
   * value. (Same applies to the trust-badges list above.)
   */
  {
    key: "default.global.product-shipping-description",
    label: "Shipping description",
    description:
      "Main shipping text shown in the Shipping & returns section on every product page.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue:
      "Delivery options and costs are shown at checkout, before you pay.",
  },
  {
    key: "default.product.returns-note",
    label: "Returns note",
    description:
      "Short returns note shown under the shipping description in the shipping section. Leave blank to hide.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Unopened items can be returned within 30 days.",
  },
  {
    key: "default.product.question-label",
    label: "Questions section title",
    description:
      "Title of the expandable section that invites shoppers to contact you. Shown on every product page, but only appears when the question text below is set.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Ask a question",
    placeholder: "Ask a question",
  },
  {
    key: "default.global.product-question-description",
    label: "Question text",
    description:
      "Text inside the Questions section on every product page, inviting shoppers to reach out.",
    type: "textarea",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-full",
    defaultValue:
      "Have a question about this product? Contact us and we'll get back to you.",
  },
  {
    key: "default.product.question-link-text",
    label: "Contact link text",
    description:
      "Linked text after the question text that opens your contact page. Leave blank to hide the link.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "You can reach out to us here.",
    placeholder: "e.g. Send us a message.",
  },
  {
    key: "default.product.shipping-note",
    label: "Shipping line",
    description:
      "Small line at the bottom of the product info on every product page. Links to your Shipping Policy page when that page is published. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Shipping calculated at checkout",
    placeholder: "e.g. Free shipping over $50",
  },
  {
    key: "default.product.reviews-label",
    label: "Reviews label",
    description:
      "Small text above the reviews heading on every product page. Reviews only show when the reviews feature is on. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Reviews",
    placeholder: "Reviews",
  },
  {
    key: "default.product.reviews-heading",
    label: "Reviews heading",
    description:
      "Heading above customer reviews near the bottom of every product page. Reviews only show when the reviews feature is on. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "What customers are saying",
    placeholder: "What customers are saying",
  },
  {
    key: "default.product.related-label",
    label: "Related products label",
    description:
      "Small text above the related products heading. The section only appears when a product has related products. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "Pair it with",
    placeholder: "Pair it with",
  },
  {
    key: "default.product.related-heading",
    label: "Related products heading",
    description:
      "Heading above the related products at the bottom of the page. The section only appears when a product has related products. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "You may also like",
    placeholder: "You may also like",
  },
  {
    key: "default.product.related-link-text",
    label: "Related products link text",
    description:
      "Link to your shop beside the related products heading. Leave blank to hide.",
    type: "text",
    page: "product",
    group: "product.details",
    gridColumn: "col-span-1",
    defaultValue: "All products",
    placeholder: "All products",
  },
];

export const defaultProductFieldGroups: TemplateFieldGroup[] = [
  {
    id: "product.details",
    title: "Product page",
    description:
      "Text and badges shown around the buy button on every product page.",
    icon: "🏪",
    columns: 2,
  },
];
