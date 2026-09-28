/**
 * olive-template service-page component map.
 *
 * Maps each ServiceTemplateDef id (from fields.ts) to its React component.
 */
import type { ServiceTemplateComponent } from "~/app/(storefront)/_templates/_service-pages/registry";

import { OliveServicePage } from "./olive-service-page";

export const OLIVE_SERVICE_COMPONENTS: Record<
  string,
  ServiceTemplateComponent
> = {
  "olive-service": OliveServicePage,
};
