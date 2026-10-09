/**
 * glove-template service-page component map.
 *
 * Maps each ServiceTemplateDef id (from fields.ts) to its React component.
 */
import type { ServiceTemplateComponent } from "~/app/(storefront)/_templates/_service-pages/registry";

import { GloveServicePage } from "./glove-service-page";

export const GLOVE_SERVICE_COMPONENTS: Record<
  string,
  ServiceTemplateComponent
> = {
  "glove-service": GloveServicePage,
};
