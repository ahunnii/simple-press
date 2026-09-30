import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

/**
 * Account pages (Settings, Security, Address Book, Order Detail,
 * Preferences, Rewards) are thin umsc skins over shared / better-auth-ui
 * account UI and DB-driven data — none of it is owner-editable template
 * content. Orders and Subscriptions are the exception: their empty states
 * carry owner-editable heading/body/button copy, following
 * `dream/account/fields.ts`'s precedent (one `global.account` group/section
 * so both pages register in a single editor spot instead of two near-empty
 * ones).
 *
 * Resolved with the standalone `resolveUmscAccountFields` below rather than
 * the root `../index.ts` aggregator's `resolveFields` — `../index.ts`
 * imports `umscAccountData`/`umscAccountFieldGroups` FROM this module, so
 * routing the Orders/Subscriptions pages back through the root resolver
 * would make them depend on that aggregation having already run. This
 * module's own tiny field map resolves correctly regardless of that timing.
 */

export const umscAccountData: TemplateField[] = [
  {
    key: "umsc.global.account-orders-empty-heading",
    label: "Orders empty heading",
    description: "Heading shown on the Orders page before any order exists.",
    type: "text",
    page: "global",
    group: "global.account",
    gridColumn: "col-span-1",
    defaultValue: "No orders yet",
  },
  {
    key: "umsc.global.account-orders-empty-body",
    label: "Orders empty message",
    description:
      "Line shown under the heading on the Orders page before any order exists. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.account",
    gridColumn: "col-span-full",
    defaultValue: "When you place an order, it will appear here.",
  },
  {
    key: "umsc.global.account-orders-empty-button",
    label: "Orders empty button label",
    description:
      "Label for the button on the empty Orders page, linking to the shop. Leave blank to hide the button.",
    type: "text",
    page: "global",
    group: "global.account",
    gridColumn: "col-span-1",
    defaultValue: "Shop now",
  },
  {
    key: "umsc.global.account-subscriptions-empty-heading",
    label: "Subscriptions empty heading",
    description:
      "Heading shown on the Subscriptions page before any subscription exists.",
    type: "text",
    page: "global",
    group: "global.account",
    gridColumn: "col-span-1",
    defaultValue: "You don't have any subscriptions yet",
  },
  {
    key: "umsc.global.account-subscriptions-empty-body",
    label: "Subscriptions empty message",
    description:
      "Line shown under the heading on the Subscriptions page before any subscription exists. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.account",
    gridColumn: "col-span-full",
    defaultValue:
      "Subscribe to a product for recurring delivery and it will appear here.",
  },
  {
    key: "umsc.global.account-subscriptions-empty-button",
    label: "Subscriptions empty button label",
    description:
      "Label for the button on the empty Subscriptions page, linking to the shop. Leave blank to hide the button.",
    type: "text",
    page: "global",
    group: "global.account",
    gridColumn: "col-span-1",
    defaultValue: "Browse products",
  },
];

export const umscAccountFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.account",
    title: "Account pages",
    description:
      "Empty-state heading, message, and button for the Orders and Subscriptions pages",
    icon: "👤",
    columns: 1,
  },
];

export const umscAccountSections: TemplateSection[] = [
  {
    id: "global.account",
    page: "global",
    title: "Account pages",
    description:
      "Empty-state heading, message, and button for the Orders and Subscriptions pages",
    groupIds: ["global.account"],
    order: 3,
    hideable: false,
  },
];

const _umscAccountFieldMap = new Map<string, TemplateField>(
  umscAccountData.map((field) => [field.key, field]),
);

/**
 * Standalone resolver over just this module's fields — see the file doc
 * comment on why this doesn't go through the root `../index.ts` aggregator.
 */
export function resolveUmscAccountFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _umscAccountFieldMap);
}
