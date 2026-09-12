import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Account pages (Settings, Security, Address Book, Orders, Order Detail,
 * Preferences, Subscriptions) are thin olive skins over shared/better-auth-ui
 * account UI and DB-driven order/subscription data — none of it is
 * owner-editable template content. Per design.md ("Account suite — no
 * fields") and the "Account pages" playbook entry ("no template fields for
 * any of these pages... None of these have template fields, so none are
 * reachable in /editor"), this exports empty arrays only so Phase 4's
 * aggregation stays uniform across every domain — mirrors
 * `wealth/account/index.ts` and vii's own account domain (no fields file).
 */

export const oliveAccountData: TemplateField[] = [];

export const oliveAccountFieldGroups: TemplateFieldGroup[] = [];

export const oliveAccountSections: TemplateSection[] = [];
