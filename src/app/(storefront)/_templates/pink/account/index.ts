import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Account slots (`OrdersPage`, `OrderDetailPage`, `AccountSettingsPage`,
 * `AccountSecurityPage`, `AddressBookPage`, `PreferencesPage`) have NO
 * template fields and NO sections. The `TemplatePage` union has no `account`
 * member, so these pages aren't reachable from `/editor`; every account page
 * is either DB-driven (orders, addresses), session-driven (settings,
 * security via better-auth-ui), or structural chrome/microcopy owned by the
 * shared `PinkAccountLayout` component. Exported as empty arrays anyway so
 * the root `pink/index.ts` aggregation stays uniform across every page
 * domain — see docs/templates/pink/design.md → "Fields: NONE".
 */
export const pinkAccountData: TemplateField[] = [];
export const pinkAccountFieldGroups: TemplateFieldGroup[] = [];
export const pinkAccountSections: TemplateSection[] = [];
