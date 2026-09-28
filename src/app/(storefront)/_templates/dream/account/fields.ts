import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

/**
 * Empty-state copy for the Orders, Subscriptions and Rewards account pages —
 * the only owner-editable content on the account pages (Settings, Security,
 * Address Book, Order Detail and Preferences stay thin skins over
 * shared/DB-driven UI, per `./index.ts`'s existing note). One `global`
 * group/section so every page registers in a single editor spot instead of
 * several near-empty ones.
 *
 * Subscriptions reuses `dream.global.orders-empty-button` for its own empty
 * state's button — both pages currently ship the exact same label
 * ("Request an estimate") linking to `/contact`, so a second, identical
 * field would just be a second place to keep that text in sync. Rewards has
 * no button of its own (a missing program isn't something the customer can
 * act on), so it only declares a heading + body pair.
 *
 * Deliberately resolved WITHOUT the root `../index.ts` aggregator: these two
 * pages are the only dream account pages that read `business.siteContent`
 * today, and going through the root `resolveFields` would make them depend
 * on the orchestrator having already spread `dreamAccountData` in there.
 * This module's own tiny field map resolves correctly regardless of that
 * timing (see `resolveDreamAccountFields` below).
 */

export const dreamAccountData: TemplateField[] = [
  {
    key: "dream.global.orders-empty-heading",
    label: "Orders empty heading",
    description: "Heading shown on the Orders page before any order exists.",
    type: "text",
    page: "global",
    group: "global.account",
    gridColumn: "col-span-1",
    defaultValue: "No orders yet",
  },
  {
    key: "dream.global.orders-empty-body",
    label: "Orders empty message",
    description:
      "Line shown under the heading on the Orders page before any order exists. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.account",
    gridColumn: "col-span-full",
    defaultValue:
      "When Selest sends you an estimate and it's confirmed, it will appear here.",
  },
  {
    key: "dream.global.orders-empty-button",
    label: "Orders empty button label",
    description:
      "Label for the button on the empty Orders and Subscriptions pages, linking to the contact page. Leave blank to hide the button.",
    type: "text",
    page: "global",
    group: "global.account",
    gridColumn: "col-span-1",
    defaultValue: "Request an estimate",
  },
  {
    key: "dream.global.subscriptions-empty-heading",
    label: "Subscriptions empty heading",
    description:
      "Heading shown on the Subscriptions page before any subscription exists.",
    type: "text",
    page: "global",
    group: "global.account",
    gridColumn: "col-span-1",
    defaultValue: "No subscriptions yet",
  },
  {
    key: "dream.global.subscriptions-empty-body",
    label: "Subscriptions empty message",
    description:
      "Line shown under the heading on the Subscriptions page before any subscription exists. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.account",
    gridColumn: "col-span-full",
    defaultValue:
      "Set up a recurring order with Selest and it will appear here.",
  },
  {
    key: "dream.global.rewards-empty-heading",
    label: "Rewards empty heading",
    description:
      "Heading shown on the Rewards page when no rewards program is set up.",
    type: "text",
    page: "global",
    group: "global.account",
    gridColumn: "col-span-1",
    defaultValue: "No rewards program yet",
  },
  {
    key: "dream.global.rewards-empty-body",
    label: "Rewards empty message",
    description:
      "Line shown under the heading on the Rewards page when no rewards program is set up. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.account",
    gridColumn: "col-span-full",
    defaultValue: "Selest hasn't turned on rewards yet. Check back soon.",
  },
];

export const dreamAccountFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.account",
    title: "Account pages",
    description:
      "Empty-state heading, message, and button for the Orders and Subscriptions pages",
    icon: "👤",
    columns: 1,
  },
];

export const dreamAccountSections: TemplateSection[] = [
  {
    id: "global.account",
    page: "global",
    title: "Account pages",
    description:
      "Empty-state heading, message, and button for the Orders and Subscriptions pages",
    groupIds: ["global.account"],
    order: 2,
    hideable: false,
  },
];

const _dreamAccountFieldMap = new Map<string, TemplateField>(
  dreamAccountData.map((field) => [field.key, field]),
);

/**
 * Standalone resolver over just this module's fields — see the file doc
 * comment on why this doesn't go through the root `../index.ts` aggregator.
 */
export function resolveDreamAccountFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _dreamAccountFieldMap);
}
