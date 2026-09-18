/**
 * Dream-specific service-page component map.
 *
 * Maps each ServiceTemplateDef id (from fields.ts) to its React component.
 */
import type { ServiceTemplateComponent } from "~/app/(storefront)/_templates/_service-pages/registry";

import { DreamLaneServicePage } from "./dream-lane-service-page";
import { DreamPackageServicePage } from "./dream-package-service-page";

export const DREAM_SERVICE_COMPONENTS: Record<
  string,
  ServiceTemplateComponent
> = {
  "dream-lane": DreamLaneServicePage,
  "dream-package": DreamPackageServicePage,
};
