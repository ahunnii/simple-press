/**
 * bamboo-template service-page component map.
 *
 * Maps each ServiceTemplateDef id (from fields.ts) to its React component.
 */
import type { ServiceTemplateComponent } from "~/app/(storefront)/_templates/_service-pages/registry";

import { BambooServicePage } from "./bamboo-service-page";

export const BAMBOO_SERVICE_COMPONENTS: Record<
  string,
  ServiceTemplateComponent
> = {
  "bamboo-service": BambooServicePage,
};
