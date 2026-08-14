/**
 * Re-exported from `~/lib/tel-href` under relocation's original name so its
 * existing importers are untouched. See that module for the doc comment and
 * logic.
 *
 * TDZ rule: this file must NEVER be imported by any field-definition
 * `index.ts` module (see `relocation/homepage/index.ts` / `./rows.ts` for
 * why — those modules sit inside `~/lib/template-fields`'s aggregation
 * cycle and a runtime edge back into it TDZ-crashes every storefront
 * route). Components only.
 */
export { telHref as relocationTelHref } from "~/lib/tel-href";
