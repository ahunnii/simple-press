import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Account pages (Settings, Security, Address Book, Orders, Order Detail,
 * Preferences, Subscriptions, Rewards) are thin umsc skins over shared /
 * better-auth-ui account UI and DB-driven order/subscription/rewards data —
 * none of it is owner-editable template content. Per the "Account pages"
 * playbook entry ("no template fields for any of these pages... None of
 * these have template fields, so none are reachable in /editor") and
 * `dream/account/index.ts`'s precedent, this exports empty arrays only so
 * the root aggregation stays uniform across every domain.
 */

export const umscAccountData: TemplateField[] = [];

export const umscAccountFieldGroups: TemplateFieldGroup[] = [];

export const umscAccountSections: TemplateSection[] = [];
