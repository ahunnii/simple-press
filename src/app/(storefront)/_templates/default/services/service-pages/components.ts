/**
 * Default-template service-page component map.
 *
 * Maps each ServiceTemplateDef id (from fields.ts) to its React component.
 */
import type { ServiceTemplateComponent } from "~/app/(storefront)/_templates/_service-pages/registry";

import { DefaultServicePage } from "./default-service-page";

export const DEFAULT_SERVICE_COMPONENTS: Record<
  string,
  ServiceTemplateComponent
> = {
  "default-service": DefaultServicePage,
};
