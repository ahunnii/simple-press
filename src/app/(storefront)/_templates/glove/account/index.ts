import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Account pages (Settings, Security, Address Book, Orders, Order Detail,
 * Preferences, Rewards, Subscriptions, Invoices) are thin glove skins over
 * the shared better-auth-ui account UI and DB-driven order, loyalty and
 * subscription data. None of it is owner-editable template content (per the
 * "Account pages" playbook: no fields, not reachable in /editor), so this
 * exports empty arrays only, keeping the orchestrator's aggregation uniform
 * across every domain.
 */

export const gloveAccountData: TemplateField[] = [];

export const gloveAccountFieldGroups: TemplateFieldGroup[] = [];

export const gloveAccountSections: TemplateSection[] = [];
