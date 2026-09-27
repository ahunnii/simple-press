import { listRowsFromDefaults } from "~/lib/lucide-template-icons";
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Cart page field definitions ─────────────────────────────────────────────
//
// Cart/checkout fields are not reachable in `/editor` (cart/checkout are
// intentionally absent from PAGE_PREVIEW_PATHS — the preview iframe's cart is
// always empty). Owners edit them in the platform-admin advanced editor.

/** The four product-type doors shown on the empty-bag state. */
const UMSC_CART_DOORS_DEFAULT_ROWS = [
  { image: "", title: "Candles", link: "/collections/candles" },
  { image: "", title: "Soaps", link: "/collections/soaps" },
  { image: "", title: "Body Care", link: "/collections/body-care" },
  { image: "", title: "Home Care", link: "/collections/home-care" },
] satisfies Record<string, string>[];

export const umscCartData: TemplateField[] = [
  {
    key: "umsc.cart.heading",
    label: "Heading",
    description: "The heading shown at the top of the cart page.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your Bag",
  },
  {
    key: "umsc.cart.empty-heading",
    label: "Empty bag heading",
    description: "Heading shown when the bag has no items.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Your bag is empty",
  },
  {
    key: "umsc.cart.empty-body",
    label: "Empty bag message",
    description: "Short line shown under the empty-bag heading.",
    type: "textarea",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-full",
    defaultValue: "Pick a door below and find something for your shelf.",
  },
  {
    key: "umsc.cart.continue-shopping",
    label: "Continue shopping link",
    description:
      "Quiet link label under the checkout button in the summary card.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Continue shopping",
  },
  {
    key: "umsc.cart.checkout-cta",
    label: "Checkout button text",
    description: "Label on the button that continues to checkout.",
    type: "text",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-1",
    defaultValue: "Checkout",
  },
  {
    key: "umsc.cart.empty-doors",
    label: "Empty bag doors",
    description:
      "The product-type doors shown on the empty-bag state, each with an image, title, and link.",
    type: "list",
    page: "cart",
    group: "cart.main",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemLabel: "door",
    summaryKey: "title",
    defaultsWhenEmpty: true,
    defaultRows: UMSC_CART_DOORS_DEFAULT_ROWS,
    itemSchema: [
      {
        key: "image",
        label: "Image",
        type: "image",
        description: "Image shown on the door.",
        placeholder: "Upload a door image",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Short label on the door, e.g. a product category.",
        placeholder: "e.g. Candles",
      },
      {
        key: "link",
        label: "Link",
        type: "text",
        description: "Where the door links to.",
        placeholder: "e.g. /collections/candles",
      },
    ],
  },
];

// ─── Field groups ─────────────────────────────────────────────────────────────

export const umscCartFieldGroups: TemplateFieldGroup[] = [
  {
    id: "cart.main",
    title: "Cart page",
    description: "Heading, empty-state messaging, doors, and button labels.",
    icon: "🛍️",
    columns: 2,
  },
];

// ─── Derived storefront constants ──────────────────────────────────────────

/**
 * `image` is dropped whenever the row is blank — the pre-migration constant
 * never had the key at all, and `UmscCartContents` only checks
 * `door.image` with a `typeof` guard, so an absent key and a blank string
 * behave the same. Keeps storefront output byte-for-byte identical.
 */
export const UMSC_CART_DEFAULT_DOORS: { title: string; link: string; image?: string }[] =
  listRowsFromDefaults(UMSC_CART_DOORS_DEFAULT_ROWS, "default-door").map(
    (row) => {
      const title = row.title ?? "";
      const link = row.link ?? "";
      const image = row.image ?? "";
      return image ? { title, link, image } : { title, link };
    },
  );
