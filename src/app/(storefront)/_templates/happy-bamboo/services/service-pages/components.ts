/**
 * happy-bamboo-template service-page component map.
 *
 * Maps each ServiceTemplateDef id (from fields.ts) to its React component.
 */
import type { ServiceTemplateComponent } from "~/app/(storefront)/_templates/_service-pages/registry";

import { HappyBambooServicePage } from "./happy-bamboo-service-page";

export const HAPPY_BAMBOO_SERVICE_COMPONENTS: Record<
  string,
  ServiceTemplateComponent
> = {
  "happy-bamboo-service": HappyBambooServicePage,
};
