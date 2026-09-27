import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

import { modernOrderData, modernOrderFieldGroups } from "./order-fields";
import {
  modernCheckoutUnavailableData,
  modernCheckoutUnavailableFieldGroups,
} from "./unavailable-fields";

// Cart fields live in `cart-fields.ts` and are aggregated by the template
// root `index.ts` directly.

export const modernCheckoutData: TemplateField[] = [
  ...modernOrderData,
  ...modernCheckoutUnavailableData,
];

export const modernCheckoutFieldGroups: TemplateFieldGroup[] = [
  ...modernOrderFieldGroups,
  ...modernCheckoutUnavailableFieldGroups,
];
